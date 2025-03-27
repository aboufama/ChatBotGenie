import { useState, useCallback } from 'react';
import { 
  startConversation, 
  pollForResponse, 
  createMessage, 
  getSQLQueryResult,
  executeSQLQuery,
  transformDatabricksResultToChartData,
  getAttachmentQueryResult
} from './genieApi';

// Simple type for messages
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  rawResponse: any; // Raw API response
  loading?: boolean;
  // Add properties to store extracted information
  extractedContent?: string;
  isQueryResponse?: boolean;
  // Add properties for direct SQL execution results
  sqlExecutionResult?: any;
  sqlChartData?: any;
  sqlError?: string;
}

// Define hook parameters
export interface UseChatServiceParams {
  apiKey?: string;
}

// Custom hook for chat service
export const useChatService = (params?: UseChatServiceParams) => {
  const { apiKey } = params || {};
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: '1', 
      text: 'Hello! I am Genie, your iPad chatbot assistant. Ask me a question.',
      sender: 'bot',
      rawResponse: null
    },
  ]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to extract content based on response type
  const extractContent = (response: any): { content: string, isQueryResponse: boolean } => {
    console.log("Extracting content from response", response);
    
    // Check if this is a SQL query response (has query attachment)
    if (response?.attachments?.[0]?.query) {
      // SQL Query Response - extract description from query
      const description = response.attachments[0].query.description || "No query description available";
      
      // REMOVED SQL QUERY TEXT - Only using the description
      return { content: description, isQueryResponse: true };
    } 
    
    // Regular Response - extract content from text
    if (response?.attachments?.[0]?.text?.content) {
      const content = response.attachments[0].text.content || "No content available";
      return { content, isQueryResponse: false };
    }
    
    // Fallback if neither pattern matches
    return { content: "Could not extract content from response", isQueryResponse: false };
  };

  // Send a message to the API
  const sendMessage = useCallback(async (text: string, isRegeneration: boolean = false) => {
    if (!text.trim()) return;
    
    setError(null);
    
    // Find the last bot message for regeneration
    let botMessageToReplace: ChatMessage | null = null;
    let botMessageToReplaceIndex = -1;
    
    if (isRegeneration) {
      // Find the last non-loading bot message
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].sender === 'bot' && !messages[i].loading && messages[i].id !== '1') {
          botMessageToReplace = messages[i];
          botMessageToReplaceIndex = i;
          break;
        }
      }
    }
    
    // Add user message (only if not regenerating)
    if (!isRegeneration) {
      const userMessageId = Date.now().toString();
      setMessages(prev => [
        ...prev, 
        {
          id: userMessageId,
          text,
          sender: 'user',
          rawResponse: null
        }
      ]);
    }
    
    // Set up the loading message
    const botLoadingMessageId = isRegeneration && botMessageToReplace 
      ? botMessageToReplace.id  // Reuse existing ID for regeneration
      : (Date.now() + 1).toString();  // New ID for normal flow
    
    // Replace existing message with loading state or add new loading message
    if (isRegeneration && botMessageToReplace) {
      // Update the existing message to show loading
      setMessages(prev => prev.map((msg, index) => 
        index === botMessageToReplaceIndex
          ? { 
              ...msg, 
              loading: true,
              text: 'Regenerating response...',
              extractedContent: undefined,
              sqlChartData: undefined,
              sqlError: undefined
            } 
          : msg
      ));
    } else if (!isRegeneration) {
      // Regular flow - add a new loading message
      setMessages(prev => [
        ...prev, 
        {
          id: botLoadingMessageId,
          text: 'Loading...',
          sender: 'bot',
          loading: true,
          rawResponse: null
        }
      ]);
    }
    
    setLoading(true);
    
    try {
      let currentConversationId = conversationId;
      let messageId;
      let responseData;
      
      // Start a new conversation or continue existing one
      if (!currentConversationId) {
        // Start a new conversation
        responseData = await startConversation(text, apiKey);
        currentConversationId = responseData.conversation_id;
        messageId = responseData.message_id;
        setConversationId(currentConversationId);
      } else {
        // Create a new message in the existing conversation
        responseData = await createMessage(currentConversationId, text, apiKey);
        messageId = responseData.id;
      }
      
      // Poll for response - ensure we have valid IDs
      if (!currentConversationId || !messageId) {
        throw new Error("Missing conversation or message ID");
      }
      
      // Poll for response
      const pollResult = await pollForResponse(currentConversationId, messageId, apiKey);
      
      // Extract content based on response type
      const { content, isQueryResponse } = extractContent(pollResult);
      
      // Variables for SQL execution
      let sqlExecutionResult = null;
      let sqlChartData = null;
      let sqlError: string | undefined = undefined;
      
      // For messages with SQL queries, execute the query directly with Databricks
      if (isQueryResponse && pollResult?.attachments?.[0]?.query?.query) {
        try {
          const sqlQuery = pollResult.attachments[0].query.query;
          
          // Execute SQL query directly with Databricks API
          sqlExecutionResult = await executeSQLQuery(sqlQuery, apiKey);
          
          // Transform result to chart-friendly format
          sqlChartData = transformDatabricksResultToChartData(sqlExecutionResult);
        } catch (sqlErr) {
          console.error('Error executing SQL query with Databricks API:', sqlErr);
          sqlError = sqlErr instanceof Error ? sqlErr.message : 'Error executing SQL query';
        }
      }
      
      // For messages with SQL queries, also get SQL results from Genie
      let sqlResult = null;
      if (hasSQLQuery(pollResult) && currentConversationId && messageId) {
        try {
          // Check if we have an attachment ID
          if (pollResult?.attachments?.[0]?.attachment_id) {
            // Use the new attachment-specific endpoint
            sqlResult = await getAttachmentQueryResult(
              currentConversationId, 
              messageId, 
              pollResult.attachments[0].attachment_id,
              apiKey
            );
          } else {
            // Fallback to the old endpoint
            sqlResult = await getSQLQueryResult(currentConversationId, messageId, apiKey);
          }
        } catch (err) {
          console.error('Error getting SQL result:', err);
        }
      }
      
      // Prepare the raw response data to display
      const rawResponseData = {
        apiResponse: pollResult,
        sqlResult: sqlResult
      };
      
      // Create formatted JSON string for display
      const formattedJson = JSON.stringify(rawResponseData, null, 2);
      
      // Find target message ID to update
      const targetMessageId = isRegeneration && botMessageToReplace 
        ? botMessageToReplace.id  // Update existing message for regeneration
        : botLoadingMessageId;    // Update loading message for normal flow
        
      // Update the appropriate message with the response
      setMessages(prev => prev.map(msg => 
        msg.id === targetMessageId 
          ? { 
              ...msg, 
              text: formattedJson,
              loading: false,
              rawResponse: rawResponseData,
              extractedContent: content,
              isQueryResponse: isQueryResponse,
              sqlExecutionResult,
              sqlChartData,
              sqlError
            } 
          : msg
      ));
      
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      
      // Find target message ID to update with error
      const targetMessageId = isRegeneration && botMessageToReplace 
        ? botMessageToReplace.id  // Update existing message for regeneration
        : botLoadingMessageId;    // Update loading message for normal flow
      
      // Update message with error
      setMessages(prev => prev.map(msg => 
        msg.id === targetMessageId
          ? { 
              ...msg, 
              text: `ERROR: ${errorMessage}`,
              loading: false,
              rawResponse: { error: errorMessage }
            } 
          : msg
      ));
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [messages, conversationId, apiKey]);

  // Clear all messages and reset conversation
  const clearChat = useCallback(() => {
    setMessages([{ 
      id: '1', 
      text: 'Hello! I am Genie, your iPad chatbot assistant. Ask me a question.',
      sender: 'bot',
      rawResponse: null
    }]);
    setConversationId(null);
    setError(null);
    setLoading(false);
  }, []);

  // Helper function to check if a response contains SQL query
  const hasSQLQuery = (response: any): boolean => {
    return !!(
      response?.attachments?.[0]?.query
    );
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearChat
  };
}; 