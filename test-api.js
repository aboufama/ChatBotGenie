require('dotenv').config();

const apiToken = process.env.API_TOKEN;
const spaceId = process.env.SPACE_ID;
const instanceUrl = process.env.INSTANCE_URL;
const warehouseId = process.env.WAREHOUSE_ID;

console.log("Testing Databricks Genie API connection...");

async function testGenieAPI() {
  try {
    console.log("API Token:", apiToken ? `${apiToken.substring(0, 8)}...` : "Not found");
    console.log("Space ID:", spaceId);
    console.log("Instance URL:", instanceUrl);
    console.log("Warehouse ID:", warehouseId);
    
    console.log("\nTesting API connection...");
    
    // Test connection by attempting to start a conversation
    const response = await fetch(`https://${instanceUrl}/api/2.0/genie/spaces/${spaceId}/start-conversation`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "Show me the top 5 customers by purchase amount" }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log("\nAPI connection successful!");
    console.log("Conversation ID:", data.conversation_id);
    console.log("Message ID:", data.message_id);
    
    // Poll for response to ensure everything is working
    console.log("\nPolling for response...");
    const pollResult = await pollForResponse(data.conversation_id, data.message_id);
    
    // Test attachment endpoint if an attachment is present
    if (pollResult?.attachments?.[0]?.attachment_id) {
      console.log("\nFound attachment, testing attachment query result endpoint...");
      const attachmentId = pollResult.attachments[0].attachment_id;
      console.log("Attachment ID:", attachmentId);
      
      try {
        const attachmentResult = await fetch(`https://${instanceUrl}/api/2.0/genie/spaces/${spaceId}/conversations/${data.conversation_id}/messages/${data.message_id}/attachments/${attachmentId}/query-result`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${apiToken}` },
        });
        
        if (!attachmentResult.ok) {
          const errorText = await attachmentResult.text();
          console.log(`Attachment endpoint not available: ${errorText}`);
        } else {
          const attachmentData = await attachmentResult.json();
          console.log("Attachment query result endpoint working!");
          console.log("Data sample:", JSON.stringify(attachmentData).substring(0, 100) + "...");
        }
      } catch (attachmentError) {
        console.log("Attachment endpoint test failed:", attachmentError.message);
      }
    } else {
      console.log("\nNo attachment found in response, skipping attachment endpoint test.");
    }
    
    console.log("\nAPI integration test completed successfully!");
    return { success: true, data: pollResult };
  } catch (error) {
    console.error("\nAPI TEST FAILED:", error.message);
    return { success: false, error: error.message };
  }
}

async function pollForResponse(conversationId, messageId, attempts = 0) {
  // Add delay for retries
  if (attempts > 0) {
    const delay = Math.min(1000 * Math.pow(1.5, attempts), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  const response = await fetch(`https://${instanceUrl}/api/2.0/genie/spaces/${spaceId}/conversations/${conversationId}/messages/${messageId}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${apiToken}` },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }
  
  const data = await response.json();
  console.log(`Poll attempt ${attempts + 1}, status: ${data.status}`);
  
  // Continue polling if not complete
  if ((data.status !== "COMPLETED" && data.status !== "FAILED") && attempts < 10) {
    return await pollForResponse(conversationId, messageId, attempts + 1);
  }
  
  return data;
}

// Run the test
testGenieAPI().then(result => {
  if (result.success) {
    console.log("\nAPI TEST SUCCESS: Your credentials are working correctly!");
  } else {
    console.log("\nAPI TEST FAILED: Please check your credentials and try again.");
    console.log("Error:", result.error);
  }
}); 