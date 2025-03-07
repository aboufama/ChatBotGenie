import { useState, useCallback } from 'react';
import { 
  startConversation, 
  pollForResponse, 
  createMessage,
  getSQLQueryResult,
  executeSQLQuery,
  transformDatabricksResultToChartData
} from './genieApi';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  loading?: boolean;
  rawResponse?: any;
  extractedContent?: string;
  sqlChartData?: any;
  sqlError?: string;
  isQueryResponse?: boolean;
}

// Custom hook for basic chat service
export const useChatServiceExtended = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: '1', 
      text: 'Hello! I am Genie, your terminal chatbot assistant. Ask me a question.',
      sender: 'bot',
      rawResponse: null
    },
  ]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState('');

  // Function to extract content based on response type
  const extractContent = (response: any): { content: string, isQueryResponse: boolean } => {
    console.log("Extracting content from response", response);
    
    // Check if this is a SQL query response (has query attachment)
    if (response?.attachments?.[0]?.query) {
      // SQL Query Response - extract description from query
      const description = response.attachments[0].query.description || "No query description available";
      
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

  // Helper function to check if a response contains SQL query
  const hasSQLQuery = (response: any): boolean => {
    return !!(response?.attachments?.[0]?.query);
  };

  // Find the last bot message in the chat
  const findLastBotMessageIndex = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'bot' && !messages[i].loading) {
        return i;
      }
    }
    return -1;
  };

  // Function to send a message
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    setError(null);
    setLastUserMessage(text);
    setLoading(true);
    
    // Add user message to the chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      sender: 'user',
    };
    
    // Add loading indicator message
    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      text: '',
      sender: 'bot',
      loading: true,
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage, loadingMessage]);
    
    try {
      // Start conversation if not already started
      if (!conversationId) {
        const convoId = await startConversation(text);
        setConversationId(convoId);
      }
      
      // Create message and get response
      const messageResult = await createMessage(conversationId || '', text);
      const msgId = messageResult.id;
      
      // Poll for response
      const response = await pollForResponse(conversationId || '', msgId);
      const { content, isQueryResponse } = extractContent(response);
      
      // Variables for SQL execution
      let sqlExecutionResult = null;
      let sqlChartData = null;
      let sqlError: string | undefined = undefined;
      
      // For messages with SQL queries, execute the query directly with Databricks
      if (isQueryResponse && response?.attachments?.[0]?.query?.query) {
        try {
          const sqlQuery = response.attachments[0].query.query;
          
          // Execute SQL query directly with Databricks API
          sqlExecutionResult = await executeSQLQuery(sqlQuery);
          
          // Transform result to chart-friendly format
          sqlChartData = transformDatabricksResultToChartData(sqlExecutionResult);
        } catch (sqlErr) {
          console.error('Error executing SQL query with Databricks API:', sqlErr);
          sqlError = sqlErr instanceof Error ? sqlErr.message : 'Error executing SQL query';
        }
      }
      
      // For messages with SQL queries, also get SQL results from Genie
      let sqlResult = null;
      if (hasSQLQuery(response) && conversationId && msgId) {
        try {
          sqlResult = await getSQLQueryResult(conversationId, msgId);
        } catch (sqlErr) {
          console.error('Error getting SQL results from Genie:', sqlErr);
        }
      }
      
      // Replace loading message with actual response
      setMessages(prevMessages => {
        const newMessages = [...prevMessages];
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].loading) {
            newMessages[i] = {
              id: Date.now().toString(),
              text: content,
              sender: 'bot',
              rawResponse: response,
              extractedContent: content,
              isQueryResponse,
              sqlChartData,
              sqlError
            };
            break;
          }
        }
        return newMessages;
      });
      
    } catch (e: any) {
      console.error('Error in sendMessage:', e);
      setError(e.message || 'An error occurred while sending your message');
      
      // Replace loading message with error
      setMessages(prevMessages => {
        const newMessages = [...prevMessages];
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].loading) {
            newMessages[i] = {
              id: Date.now().toString(),
              text: `Error: ${e.message || 'An error occurred'}`,
              sender: 'bot',
              rawResponse: { error: e }
            };
            break;
          }
        }
        return newMessages;
      });
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Function to clear the chat
  const clearChat = useCallback(() => {
    setMessages([
      { 
        id: '1', 
        text: 'Hello! I am Genie, your terminal chatbot assistant. Ask me a question.',
        sender: 'bot',
        rawResponse: null 
      },
    ]);
    setConversationId(null);
    setLastUserMessage('');
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearChat,
    lastUserMessage
  };
};

export default useChatServiceExtended; 