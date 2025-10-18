import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// XML Command Processing System for Streaming File Operations
interface XMLCommand {
  type: 'write' | 'edit' | 'delete'
  path: string
  content?: string
  operation?: string
  search?: string
  replace?: string
  fullMatch: string
}

function extractXMLCommands(text: string): XMLCommand[] {
  const commands: XMLCommand[] = []
  
  // Extract pilotwrite commands - use Array.from with RegExp exec
  const writeRegex = /<pilotwrite\s+path=["']([^"']+)["'][^>]*>(.*?)<\/pilotwrite>/gi
  let writeMatch
  while ((writeMatch = writeRegex.exec(text)) !== null) {
    commands.push({
      type: 'write',
      path: writeMatch[1],
      content: writeMatch[2],
      fullMatch: writeMatch[0]
    })
  }
  
  // Extract pilotedit commands
  const editRegex = /<pilotedit\s+path=["']([^"']+)["']\s+operation=["']([^"']+)["']\s+search=["']([^"']*?)["']\s+replace=["']([^"']*?)["'][^>]*\s*\/>/gi
  let editMatch
  while ((editMatch = editRegex.exec(text)) !== null) {
    commands.push({
      type: 'edit',
      path: editMatch[1],
      operation: editMatch[2],
      search: editMatch[3],
      replace: editMatch[4],
      fullMatch: editMatch[0]
    })
  }
  
  // Extract pilotdelete commands
  const deleteRegex = /<pilotdelete\s+path=["']([^"']+)["'][^>]*\s*\/>/gi
  let deleteMatch
  while ((deleteMatch = deleteRegex.exec(text)) !== null) {
    commands.push({
      type: 'delete',
      path: deleteMatch[1],
      fullMatch: deleteMatch[0]
    })
  }
  
  return commands
}

async function executeXMLCommand(command: XMLCommand, projectId: string): Promise<{success: boolean, message: string, error?: string}> {
  try {
    const { storageManager } = await import('@/lib/storage-manager')
    await storageManager.init()
    
    console.log(`[XML COMMAND] Executing ${command.type} on ${command.path}`)
    
    switch (command.type) {
      case 'write':
        if (!command.content) {
          return { success: false, message: 'No content provided for write command', error: 'Missing content' }
        }
        
        // Check if file exists
        const existingFile = await storageManager.getFile(projectId, command.path)
        
        if (existingFile) {
          // Update existing file
          await storageManager.updateFile(projectId, command.path, { content: command.content })
          return { success: true, message: `✅ File ${command.path} updated successfully` }
        } else {
          // Create new file
          await storageManager.createFile({
            workspaceId: projectId,
            name: command.path.split('/').pop() || command.path,
            path: command.path,
            content: command.content,
            fileType: command.path.split('.').pop() || 'text',
            type: command.path.split('.').pop() || 'text',
            size: command.content.length,
            isDirectory: false
          })
          return { success: true, message: `✅ File ${command.path} created successfully` }
        }
        
      case 'edit':
        if (!command.search || command.replace === undefined) {
          return { success: false, message: 'Search and replace parameters required for edit command', error: 'Missing parameters' }
        }
        
        const fileToEdit = await storageManager.getFile(projectId, command.path)
        if (!fileToEdit) {
          return { success: false, message: `File not found: ${command.path}`, error: 'File not found' }
        }
        
        if (!fileToEdit.content.includes(command.search)) {
          return { success: false, message: `Search text not found in ${command.path}`, error: 'Search text not found' }
        }
        
        // Use replaceAll by default (matching the normal tool behavior)
        const updatedContent = fileToEdit.content.replace(new RegExp(command.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), command.replace)
        await storageManager.updateFile(projectId, command.path, { content: updatedContent })
        return { success: true, message: `✅ File ${command.path} edited successfully` }
        
      case 'delete':
        const fileToDelete = await storageManager.getFile(projectId, command.path)
        if (!fileToDelete) {
          return { success: false, message: `File not found: ${command.path}`, error: 'File not found' }
        }
        
        const deleteResult = await storageManager.deleteFile(projectId, command.path)
        if (deleteResult) {
          return { success: true, message: `✅ File ${command.path} deleted successfully` }
        } else {
          return { success: false, message: `Failed to delete ${command.path}`, error: 'Delete operation failed' }
        }
        
      default:
        return { success: false, message: `Unknown command type: ${command.type}`, error: 'Invalid command type' }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[XML COMMAND ERROR] ${command.type} failed for ${command.path}:`, error)
    return { 
      success: false, 
      message: `Failed to execute ${command.type} on ${command.path}: ${errorMessage}`,
      error: errorMessage
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { content, projectId } = body
    
    // Validate input
    if (!content || !projectId) {
      return NextResponse.json({ error: 'Missing content or projectId' }, { status: 400 })
    }
    
    // Get user from Supabase
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract XML commands from content
    const commands = extractXMLCommands(content)
    console.log('[XML-API] Extracted commands:', commands.length, commands)
    
    if (commands.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No XML commands found',
        toolCalls: []
      })
    }

    // Execute each command and format as tool calls
    const toolCalls = []
    for (const command of commands) {
      const result = await executeXMLCommand(command, projectId)
      
      // Map XML command to standard tool name
      const toolNameMap: Record<string, string> = {
        'write': 'write_file',
        'edit': 'edit_file', 
        'delete': 'delete_file'
      }
      
      const toolName = toolNameMap[command.type] || command.type
      
      // Format as tool call with input and output matching normal tool structure
      let input: any = { path: command.path }
      
      if (command.type === 'write') {
        input.content = command.content
      } else if (command.type === 'edit') {
        // Convert XML edit format to normal tool format
        input.searchReplaceBlocks = [{
          search: command.search || '',
          replace: command.replace || '',
          replaceAll: true, // Default to replace all occurrences
          occurrenceIndex: undefined,
          validateAfter: undefined
        }]
        input.dryRun = false
        input.rollbackOnFailure = true
      }
      // delete_file only needs path, which is already set
      
      const toolCall = {
        id: `xml-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: toolName,
        input: input,
        result: {
          success: result.success,
          message: result.message,
          error: result.error,
          path: command.path,
          content: command.content,
          action: result.success ? (command.type === 'write' ? 'created' : command.type === 'edit' ? 'modified' : 'deleted') : 'failed'
        }
      }
      
      toolCalls.push(toolCall)
    }

    console.log('[XML-API] Final tool calls:', toolCalls)
    
    return NextResponse.json({
      success: true,
      message: `Executed ${toolCalls.length} XML commands`,
      toolCalls: toolCalls
    })

  } catch (error) {
    console.error('XML execution API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
