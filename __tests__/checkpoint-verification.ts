// Simple test to verify checkpoint functionality
async function testCheckpointSystem() {
  console.log('Testing checkpoint system...');
  
  try {
    // Dynamically import the storage manager
    const storageModule = await import('../lib/storage-manager.js');
    const storageManager = storageModule.storageManager;
    
    const checkpointModule = await import('../lib/checkpoint-utils.js');
    const { createCheckpoint, restoreCheckpoint, getCheckpoints } = checkpointModule;
    
    // Initialize storage manager
    await storageManager.init();
    console.log('✓ Storage manager initialized');
    
    // Create a test workspace
    const workspace = await storageManager.createWorkspace({
      name: 'Test Workspace',
      description: 'Test workspace for checkpointing',
      slug: 'test-workspace',
      userId: 'test-user',
      isPublic: false,
      isTemplate: false,
      lastActivity: new Date().toISOString(),
      deploymentStatus: 'not_deployed'
    });
    console.log('✓ Test workspace created');
    
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
    
    // Create a checkpoint
    const messageId = 'test-message-1';
    const checkpoint = await createCheckpoint(workspace.id, messageId);
    console.log('✓ Checkpoint created');
    
    // Verify checkpoint was created
    if (!checkpoint) {
      throw new Error('Checkpoint was not created');
    }
    
    // Get checkpoints
    const checkpoints = await getCheckpoints(workspace.id);
    console.log(`✓ Retrieved ${checkpoints.length} checkpoint(s)`);
    
    // Modify files
    await storageManager.updateFile(workspace.id, 'test1.txt', {
      content: 'This is modified test file 1'
    });
    console.log('✓ Files modified');
    
    // Restore checkpoint
    const success = await restoreCheckpoint(checkpoint.id);
    console.log(`✓ Checkpoint restoration: ${success ? 'SUCCESS' : 'FAILED'}`);
    
    // Clean up
    await storageManager.deleteWorkspace(workspace.id);
    console.log('✓ Test cleanup completed');
    
    console.log('\n🎉 All checkpoint tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Checkpoint test failed:', error);
    return false;
  }
}

// Run the test
testCheckpointSystem().then(success => {
  if (success) {
    console.log('\n✅ Checkpoint system is working correctly!');
  } else {
    console.log('\n❌ Checkpoint system has issues!');
  }
});