import { storageManager } from "@/lib/storage-manager";

/**
 * Test function to verify that all data is properly exported
 */
export async function testBackupExport(): Promise<void> {
  try {
    console.log("Testing backup export functionality...");
    
    // Initialize storage manager
    await storageManager.init();
    
    // Export all data
    const data = await storageManager.exportData();
    
    console.log("Exported data structure:");
    console.log("- Workspaces:", data.workspaces?.length || 0);
    console.log("- Files:", data.files?.length || 0);
    console.log("- Chat Sessions:", data.chatSessions?.length || 0);
    console.log("- Messages:", data.messages?.length || 0);
    console.log("- Deployments:", data.deployments?.length || 0);
    console.log("- Environment Variables:", data.environmentVariables?.length || 0);
    
    // Log sample of each data type
    if (data.workspaces && data.workspaces.length > 0) {
      console.log("Sample workspace:", JSON.stringify(data.workspaces[0], null, 2));
    }
    
    if (data.files && data.files.length > 0) {
      console.log("Sample file:", JSON.stringify(data.files[0], null, 2));
    }
    
    if (data.chatSessions && data.chatSessions.length > 0) {
      console.log("Sample chat session:", JSON.stringify(data.chatSessions[0], null, 2));
    }
    
    if (data.messages && data.messages.length > 0) {
      console.log("Sample message:", JSON.stringify(data.messages[0], null, 2));
    }
    
    console.log("Backup export test completed successfully!");
  } catch (error) {
    console.error("Error during backup export test:", error);
  }
}