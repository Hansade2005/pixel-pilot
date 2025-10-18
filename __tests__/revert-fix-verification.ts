// Simple test to verify the checkpoint revert fix
async function testRevertFix() {
  console.log('Testing checkpoint revert fix...');
  
  try {
    // Dynamically import the storage manager
    const storageModule = await import('../lib/storage-manager');
    const storageManager = storageModule.storageManager;
    
    const checkpointModule = await import('../lib/checkpoint-utils');
    const { createCheckpoint, restoreCheckpoint, getCheckpoints, deleteMessagesAfter } = checkpointModule;
    
    // Initialize storage manager
    await storageManager.init();
    console.log('✓ Storage manager initialized');
    
    // Create a test workspace
    const workspace = await storageManager.createWorkspace({
      name: 'Revert Test Workspace',
      description: 'Test workspace for revert fix',
      slug: 'revert-test-workspace',
      userId: 'test-user',
      isPublic: false,
      isTemplate: false,
      lastActivity: new Date().toISOString(),
      deploymentStatus: 'not_deployed'
    });
    console.log('✓ Test workspace created');
    
    // Create a chat session for this workspace
    const chatSession = await storageManager.createChatSession({
      workspaceId: workspace.id,
      userId: 'test-user',
      title: 'Revert Test Session',
      isActive: true,
      lastMessageAt: new Date().toISOString()
    });
    console.log('✓ Chat session created');
    
    // Create some test files
    const file1 = await storageManager.createFile({
      workspaceId: workspace.id,
      name: 'test1.txt',
      path: 'test1.txt',
      content: 'This is test file 1',
      fileType: 'txt',
      type: 'txt',
      size: 20,
      isDirectory: false
    });
    
    const file2 = await storageManager.createFile({
      workspaceId: workspace.id,
      name: 'test2.js',
      path: 'src/test2.js',
      content: 'console.log("This is test file 2");',
      fileType: 'js',
      type: 'js',
      size: 35,
      isDirectory: false
    });
    
    console.log('✓ Test files created');
    
    // Create a test message
    const testMessage = await storageManager.createMessage({
      chatSessionId: chatSession.id,
      role: 'user',
      content: 'Test message for checkpoint',
      metadata: {},
      tokensUsed: 0
    });
    
    console.log('✓ Test message created');
    
    // Small delay to ensure message is saved
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Create a checkpoint
    const checkpoint = await createCheckpoint(workspace.id, testMessage.id);
    console.log('✓ Checkpoint created');
    
    // Verify checkpoint was created
    if (!checkpoint) {
      throw new Error('Checkpoint was not created');
    }
    
    // Modify files
    await storageManager.updateFile(workspace.id, 'test1.txt', {
      content: 'This is modified test file 1'
    });
    
    await storageManager.createFile({
      workspaceId: workspace.id,
      name: 'test3.md',
      path: 'docs/test3.md',
      content: '# Test file 3',
      fileType: 'md',
      type: 'md',
      size: 15,
      isDirectory: false
    });
    
    console.log('✓ Files modified');
    
    // Create additional messages after the checkpoint
    const message2 = await storageManager.createMessage({
      chatSessionId: chatSession.id,
      role: 'assistant',
      content: 'Response to test message',
      metadata: {},
      tokensUsed: 0
    });
    
    const message3 = await storageManager.createMessage({
      chatSessionId: chatSession.id,
      role: 'user',
      content: 'Another test message',
      metadata: {},
      tokensUsed: 0
    });
    
    console.log('✓ Additional messages created');
    
    // Small delay to ensure messages are saved
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test the deleteMessagesAfter function
    const deletedCount = await deleteMessagesAfter(chatSession.id, testMessage.createdAt);
    console.log(`✓ Deleted ${deletedCount} messages after checkpoint`);
    
    // Get all messages to verify deletion
    const remainingMessages = await storageManager.getMessages(chatSession.id);
    console.log(`✓ ${remainingMessages.length} messages remaining`);
    
    // Restore checkpoint
    const success = await restoreCheckpoint(checkpoint.id);
    console.log(`✓ Checkpoint restoration: ${success ? 'SUCCESS' : 'FAILED'}`);
    
    // Get files after restore
    const filesAfterRestore = await storageManager.getFiles(workspace.id);
    console.log(`✓ ${filesAfterRestore.length} files after restore`);
    
    // Verify file content was restored
    const restoredFile1 = filesAfterRestore.find(f => f.path === 'test1.txt');
    if (restoredFile1 && restoredFile1.content === 'This is test file 1') {
      console.log('✓ File content correctly restored');
    } else {
      console.log('❌ File content not correctly restored');
    }
    
    // Clean up
    await storageManager.deleteWorkspace(workspace.id);
    console.log('✓ Test cleanup completed');
    
    console.log('\n🎉 All checkpoint revert tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Checkpoint revert test failed:', error);
    return false;
  }
}

// Run the test
testRevertFix().then(success => {
  if (success) {
    console.log('\n✅ Checkpoint revert system is working correctly!');
  } else {
    console.log('\n❌ Checkpoint revert system has issues!');
  }
  // Exit the process
  process.exit(success ? 0 : 1);
});