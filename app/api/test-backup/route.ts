import { NextResponse } from 'next/server'
import { storageManager } from '@/lib/storage-manager'

export async function GET() {
  try {
    // Initialize storage manager
    await storageManager.init()
    
    // Export all data
    const data = await storageManager.exportData()
    
    // Return the exported data
    return NextResponse.json({
      success: true,
      data: {
        workspaces: data.workspaces?.length || 0,
        files: data.files?.length || 0,
        chatSessions: data.chatSessions?.length || 0,
        messages: data.messages?.length || 0,
        deployments: data.deployments?.length || 0,
        environmentVariables: data.environmentVariables?.length || 0,
        sampleData: {
          workspaces: data.workspaces?.slice(0, 1) || [],
          files: data.files?.slice(0, 1) || [],
          chatSessions: data.chatSessions?.slice(0, 1) || [],
          messages: data.messages?.slice(0, 1) || [],
          deployments: data.deployments?.slice(0, 1) || [],
          environmentVariables: data.environmentVariables?.slice(0, 1) || []
        }
      }
    })
  } catch (error: any) {
    console.error('Error testing backup:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to test backup' 
    }, { status: 500 })
  }
}