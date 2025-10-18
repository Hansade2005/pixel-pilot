import { storageManager } from '../lib/storage-manager'
import { createCheckpoint, restoreCheckpoint, getCheckpoints } from '../lib/checkpoint-utils'

describe('Checkpoint System', () => {
  beforeAll(async () => {
    await storageManager.init()
  })

  it('should create and restore checkpoints', async () => {
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
    })

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
    })

    const file2 = await storageManager.createFile({
      workspaceId: workspace.id,
      name: 'test2.js',
      path: 'src/test2.js',
      content: 'console.log("This is test file 2");',
      fileType: 'js',
      type: 'js',
      size: 35,
      isDirectory: false
    })

    // Create a checkpoint
    const messageId = 'test-message-1'
    const checkpoint = await createCheckpoint(workspace.id, messageId)

    // Verify checkpoint was created
    expect(checkpoint).toBeDefined()
    expect(checkpoint.workspaceId).toBe(workspace.id)
    expect(checkpoint.messageId).toBe(messageId)
    expect(checkpoint.files.length).toBe(2)

    // Modify files
    await storageManager.updateFile(workspace.id, 'test1.txt', {
      content: 'This is modified test file 1'
    })

    await storageManager.createFile({
      workspaceId: workspace.id,
      name: 'test3.md',
      path: 'docs/test3.md',
      content: '# Test file 3',
      fileType: 'md',
      type: 'md',
      size: 15,
      isDirectory: false
    })

    // Verify files were modified
    const filesAfterModification = await storageManager.getFiles(workspace.id)
    expect(filesAfterModification.length).toBe(3)

    // Restore checkpoint
    const success = await restoreCheckpoint(checkpoint.id)
    expect(success).toBe(true)

    // Verify files were restored
    const filesAfterRestore = await storageManager.getFiles(workspace.id)
    expect(filesAfterRestore.length).toBe(2)

    const restoredFile1 = filesAfterRestore.find(f => f.path === 'test1.txt')
    expect(restoredFile1).toBeDefined()
    expect(restoredFile1?.content).toBe('This is test file 1')

    // Clean up
    await storageManager.deleteWorkspace(workspace.id)
  })

  it('should get checkpoints for a workspace', async () => {
    // Create a test workspace
    const workspace = await storageManager.createWorkspace({
      name: 'Test Workspace 2',
      description: 'Test workspace for getting checkpoints',
      slug: 'test-workspace-2',
      userId: 'test-user',
      isPublic: false,
      isTemplate: false,
      lastActivity: new Date().toISOString(),
      deploymentStatus: 'not_deployed'
    })

    // Create checkpoints
    const messageId1 = 'test-message-1'
    const messageId2 = 'test-message-2'
    
    await createCheckpoint(workspace.id, messageId1)
    await createCheckpoint(workspace.id, messageId2)

    // Get checkpoints
    const checkpoints = await getCheckpoints(workspace.id)
    expect(checkpoints.length).toBe(2)
    expect(checkpoints.some(cp => cp.messageId === messageId1)).toBe(true)
    expect(checkpoints.some(cp => cp.messageId === messageId2)).toBe(true)

    // Clean up
    await storageManager.deleteWorkspace(workspace.id)
  })
})