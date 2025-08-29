import { NextResponse } from 'next/server'
import { storageManager } from '@/lib/storage-manager'

export async function GET() {
  try {
    // Initialize storage manager
    await storageManager.init()
    
    // Clear existing data
    await storageManager.clearAll()
    
    // Create some test data
    const testWorkspace = await storageManager.createWorkspace({
      name: 'Test Workspace',
      slug: 'test-workspace',
      userId: 'test-user-id',
      description: 'Test workspace for backup/restore'
    })
    
    const testFile = await storageManager.createFile({
      name: 'test.txt',
      path: '/test.txt',
      content: 'This is a test file',
      workspaceId: testWorkspace.id,
      fileType: 'text'
    })
    
    const testChatSession = await storageManager.createChatSession({
      title: 'Test Chat',
      userId: 'test-user-id',
      workspaceId: testWorkspace.id,
      model: 'gpt-4',
      isActive: true
    })
    
    const testMessage = await storageManager.createMessage({
      content: 'Hello, this is a test message',
      role: 'user',
      chatSessionId: testChatSession.id
    })
    
    const testDeployment = await storageManager.createDeployment({
      url: 'https://test-app.vercel.app',
      branch: 'main',
      status: 'ready',
      provider: 'vercel',
      commitSha: 'abc123',
      commitMessage: 'Test deployment',
      workspaceId: testWorkspace.id,
      environment: 'production'
    })
    
    const testEnvVar = await storageManager.createEnvironmentVariable({
      key: 'TEST_KEY',
      value: 'test-value',
      isSecret: false,
      workspaceId: testWorkspace.id,
      environment: 'production'
    })
    
    // Export all data
    const exportedData = await storageManager.exportData()
    
    // Clear data again
    await storageManager.clearAll()
    
    // Import data back
    for (const [tableName, tableData] of Object.entries(exportedData)) {
      if (Array.isArray(tableData) && tableData.length > 0) {
        await storageManager.importTable(tableName, tableData)
      }
    }
    
    // Verify data was restored
    const restoredWorkspaces = await storageManager.getWorkspaces('test-user-id')
    const restoredFiles = await storageManager.getFiles(testWorkspace.id)
    const restoredChatSessions = await storageManager.getChatSessions('test-user-id')
    const restoredMessages = await storageManager.getMessages(testChatSession.id)
    const restoredDeployments = await storageManager.getDeployments(testWorkspace.id)
    const restoredEnvVars = await storageManager.getEnvironmentVariables(testWorkspace.id)
    
    return NextResponse.json({
      success: true,
      message: 'Test data created, exported, cleared, and restored successfully',
      verification: {
        workspaces: restoredWorkspaces.length,
        files: restoredFiles.length,
        chatSessions: restoredChatSessions.length,
        messages: restoredMessages.length,
        deployments: restoredDeployments.length,
        environmentVariables: restoredEnvVars.length
      }
    })
  } catch (error: any) {
    console.error('Error testing restore:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to test restore' 
    }, { status: 500 })
  }
}