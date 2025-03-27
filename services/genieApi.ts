/**
 * genieApi.ts
 * 
 * API client for interfacing with Databricks Genie and SQL services.
 * This module provides functions for:
 * - Starting and managing conversations with Genie
 * - Executing SQL queries via Databricks SQL API
 * - Transforming query results into chart-friendly data formats
 * 
 * Environment variables are used for authentication (API_TOKEN, SPACE_ID, etc.)
 * and should be configured in the .env file.
 */

// services/genieApi.ts - Simple API client that returns raw JSON
import {
  SPACE_ID,
  INSTANCE_URL,
  WAREHOUSE_ID
} from '@env';

// API_TOKEN is now passed as a parameter or read from .env as fallback
import { API_TOKEN as DEFAULT_API_TOKEN } from '@env';

// Helper to get API token - only use the provided API token
const getApiToken = (apiToken?: string): string => {
  if (!apiToken) {
    throw new Error('API token is required but was not provided');
  }
  return apiToken;
};

// Start a new conversation with Genie - returns raw API response
export const startConversation = async (question: string, apiToken?: string): Promise<any> => {
  try {
    console.log(`Starting conversation with message: "${question}"`);
    
    const response = await fetch(`https://${INSTANCE_URL}/api/2.0/genie/spaces/${SPACE_ID}/start-conversation`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getApiToken(apiToken)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: question }),
    });
    
    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error starting conversation:", error);
    throw error;
  }
};

// Create a new message in an existing conversation - returns raw API response
export const createMessage = async (conversationId: string, question: string, apiToken?: string): Promise<any> => {
  try {
    console.log(`Creating message in conversation ${conversationId}: "${question}"`);
    
    const response = await fetch(`https://${INSTANCE_URL}/api/2.0/genie/spaces/${SPACE_ID}/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getApiToken(apiToken)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: question }),
    });
    
    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating message:", error);
    throw error;
  }
};

// Poll for a conversation response from Genie - returns raw API response
export const pollForResponse = async (
  conversationId: string,
  messageId: string,
  apiToken?: string,
  attempts: number = 0
): Promise<any> => {
  try {
    // Add delay for retries
    if (attempts > 0) {
      const delay = Math.min(1000 * Math.pow(1.5, attempts), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    const response = await fetch(`https://${INSTANCE_URL}/api/2.0/genie/spaces/${SPACE_ID}/conversations/${conversationId}/messages/${messageId}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${getApiToken(apiToken)}` },
    });
    
    if (response.status === 409 && attempts < 15) {
      console.log(`Received 409 conflict, retrying... (attempt ${attempts + 1})`);
      return await pollForResponse(conversationId, messageId, apiToken, attempts + 1);
    }
    
    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }
    
    const data = await response.json();
    
    // Continue polling if not complete
    if ((data.status !== "COMPLETED" && data.status !== "FAILED") && attempts < 20) {
      return await pollForResponse(conversationId, messageId, apiToken, attempts + 1);
    }
    
    return data;
  } catch (error) {
    console.error("Error polling for response:", error);
    throw error;
  }
};

// Get SQL query results for a message - returns raw API response
export const getSQLQueryResult = async (
  conversationId: string,
  messageId: string,
  apiToken?: string,
  attempts: number = 0
): Promise<any> => {
  try {
    // Add delay for retries
    if (attempts > 0) {
      const delay = Math.min(1000 * Math.pow(1.5, attempts), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    const response = await fetch(`https://${INSTANCE_URL}/api/2.0/genie/spaces/${SPACE_ID}/conversations/${conversationId}/messages/${messageId}/query-result`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${getApiToken(apiToken)}` },
    });
    
    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }
    
    const data = await response.json();
    
    // Get the statement state if available
    const state = data.statement_response?.status?.state;
    
    // Continue polling if query is still running
    if ((state === "RUNNING" || state === "PENDING") && attempts < 15) {
      return await getSQLQueryResult(conversationId, messageId, apiToken, attempts + 1);
    }
    
    return data;
  } catch (error) {
    console.error("Error getting SQL query result:", error);
    throw error;
  }
};

// Get query results for a specific attachment - matches updated API
export const getAttachmentQueryResult = async (
  conversationId: string,
  messageId: string,
  attachmentId: string,
  apiToken?: string,
  attempts: number = 0
): Promise<any> => {
  try {
    // Add delay for retries
    if (attempts > 0) {
      const delay = Math.min(1000 * Math.pow(1.5, attempts), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    const response = await fetch(`https://${INSTANCE_URL}/api/2.0/genie/spaces/${SPACE_ID}/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}/query-result`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${getApiToken(apiToken)}` },
    });
    
    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }
    
    const data = await response.json();
    
    // Continue polling if query is still running (based on status if available)
    if (data.statement_response?.status?.state === "RUNNING" && attempts < 15) {
      return await getAttachmentQueryResult(conversationId, messageId, attachmentId, apiToken, attempts + 1);
    }
    
    return data;
  } catch (error) {
    console.error("Error getting attachment query result:", error);
    throw error;
  }
};

// Transform the SQL query result into chart data - basic implementation
export const transformQueryResultToChartData = (queryResult: any): any => {
  // Just return the raw data - this will be modified in the SQL chart component
  return queryResult;
};

// Execute SQL query directly using Databricks SQL API
export const executeSQLQuery = async (sqlQuery: string, apiToken?: string): Promise<any> => {
  try {
    console.log(`Executing SQL query with Databricks API: "${sqlQuery}"`);
    
    const response = await fetch(`https://${INSTANCE_URL}/api/2.0/sql/statements/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getApiToken(apiToken)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        statement: sqlQuery,
        warehouse_id: WAREHOUSE_ID,
        wait_timeout: "30s", // Wait up to 30 seconds for results
        disposition: "INLINE", // Get results inline in the response
        format: "JSON_ARRAY", // Return results as JSON array
        row_limit: 10000 // Increased row limit to ensure more data is returned
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Databricks SQL API error ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if execution failed
    if (data.status?.state === "FAILED") {
      throw new Error(`SQL execution failed: ${data.status?.error?.message || "Unknown error"}`);
    }
    
    return data;
  } catch (error) {
    console.error("Error executing SQL query:", error);
    throw error;
  }
};

// Transform SQL result from Databricks API into chart data
export const transformDatabricksResultToChartData = (result: any): any => {
  if (!result || !result.result || !result.manifest) {
    return null;
  }
  
  try {
    const schema = result.manifest.schema;
    const columnNames = schema.columns.map((col: any) => col.name);
    const data = result.result.data_array || [];
    
    // Return formatted data suitable for charts with all rows preserved
    return {
      columnNames,
      rows: data,
      rowCount: data.length,
      totalRowCount: result.result.total_row_count || data.length
    };
  } catch (error) {
    console.error("Error transforming Databricks result to chart data:", error);
    return null;
  }
}; 