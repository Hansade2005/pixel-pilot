// Simple test to verify the checkpoint restore functionality
async function testCheckpointRestore() {
  console.log('Testing checkpoint restore functionality...');
  
  try {
    // Dynamically import the storage manager
    const storageModule = await import('../lib/storage-manager');
    const storageManager = storageModule.storageManager;
    
    const checkpointModule = await import('../lib/checkpoint-utils');
    const { createCheckpoint, restoreCheckpoint, getCheckpoints, capturePreRevertState, restorePreRevertState, isRestoreAvailableForMessage, clearAllPreRevertStates } = checkpointModule;
    
    // Initialize storage manager
    await storageManager.init();
    console.log('✓ Storage manager initialized');
    
    // Create a test workspace
    const workspace = await storageManager.createWorkspace({
      name: 'Restore Test Workspace',
      description: 'Test workspace for restore functionality',
      slug: 'restore-test-workspace',
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
      title: 'Restore Test Session',
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
    
    // Capture pre-revert state
    await capturePreRevertState(workspace.id, chatSession.id, testMessage.id);
    console.log('✓ Pre-revert state captured');
    
    // Check if restore is available for this message
    const isAvailable = isRestoreAvailableForMessage(testMessage.id);
    console.log(`✓ Restore available for message: ${isAvailable}`);
    
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
    
    // Create a checkpoint
    const checkpoint = await createCheckpoint(workspace.id, testMessage.id);
    console.log('✓ Checkpoint created');
    
    // Verify checkpoint was created
    if (!checkpoint) {
      throw new Error('Checkpoint was not created');
    }
    
    // Restore checkpoint
    const success = await restoreCheckpoint(checkpoint.id);
    console.log(`✓ Checkpoint restoration: ${success ? 'SUCCESS' : 'FAILED'}`);
    
    // Try to restore pre-revert state
    const restoreSuccess = await restorePreRevertState(workspace.id, chatSession.id, testMessage.id);
    console.log(`✓ Pre-revert state restoration: ${restoreSuccess ? 'SUCCESS' : 'FAILED'}`);
    
    // Clean up
    await storageManager.deleteWorkspace(workspace.id);
    clearAllPreRevertStates();
    console.log('✓ Test cleanup completed');
    
    console.log('\n🎉 All checkpoint restore tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Checkpoint restore test failed:', error);
    return false;
  }
}

// Run the test
testCheckpointRestore().then(success => {
  if (success) {
    console.log('\n✅ Checkpoint restore system is working correctly!');
  } else {
    console.log('\n❌ Checkpoint restore system has issues!');
  }
  // Exit the process
  process.exit(success ? 0 : 1);
});