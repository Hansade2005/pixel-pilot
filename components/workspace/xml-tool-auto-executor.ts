// Auto-execution service for XML tools during streaming
import { XMLToolCall } from './chat-panel'
import { jsonToolParser, JsonToolCall } from './json-tool-parser'

interface AutoExecutionOptions {
  projectId: string
  onExecutionStart?: (toolCall: XMLToolCall) => void
  onExecutionComplete?: (toolCall: XMLToolCall, result: any) => void
  onExecutionError?: (toolCall: XMLToolCall, error: Error) => void
}

class XMLToolAutoExecutor {
  private options: AutoExecutionOptions
  private executionQueue: Set<string> = new Set()
  private storageManager: any

  constructor(options: AutoExecutionOptions) {
    this.options = options
    this.initStorageManager()
  }

  // Public getter for options to access projectId and other settings
  public get executorOptions(): AutoExecutionOptions {
    return this.options
  }

  private async initStorageManager() {
    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      this.storageManager = storageManager
    } catch (error) {
      console.error('[XMLToolAutoExecutor] Failed to initialize storage manager:', error)
    }
  }

  // Check if XML tool should be auto-executed
  private shouldAutoExecute(toolCall: XMLToolCall): boolean {
    // Don't execute if already in queue or if it doesn't have valid content
    if (this.executionQueue.has(toolCall.id)) return false
    if (!toolCall.path || !toolCall.command) return false
    
    // Only execute valid file operations (support both pilot and specs tool names)
    const validCommands = [
      'pilotwrite', 'pilotedit', 'pilotdelete',
      'write_file', 'edit_file', 'delete_file'
    ]
    return validCommands.includes(toolCall.command)
  }

  // Execute pilotwrite operation
  private async executePilotWrite(toolCall: XMLToolCall): Promise<any> {
    if (!this.storageManager || !toolCall.path || !toolCall.content) {
      throw new Error('Missing required parameters for pilotwrite')
    }

    try {
      // Check if file already exists
      const existingFile = await this.storageManager.getFile(this.options.projectId, toolCall.path)

      if (existingFile) {
        // Update existing file
        await this.storageManager.updateFile(this.options.projectId, toolCall.path, { 
          content: toolCall.content,
          updatedAt: new Date().toISOString()
        })

        // Emit files-changed event
        window.dispatchEvent(new CustomEvent('files-changed', {
          detail: { projectId: this.options.projectId }
        }))
        
        return {
          success: true,
          action: 'updated',
          path: toolCall.path,
          message: `✅ File ${toolCall.path} updated successfully.`
        }
      } else {
        // Create new file
        const newFile = await this.storageManager.createFile({
          workspaceId: this.options.projectId,
          name: toolCall.path.split('/').pop() || toolCall.path,
          path: toolCall.path,
          content: toolCall.content,
          fileType: toolCall.path.split('.').pop() || 'text',
          type: toolCall.path.split('.').pop() || 'text',
          size: toolCall.content.length,
          isDirectory: false
        })

        // Emit files-changed event
        window.dispatchEvent(new CustomEvent('files-changed', {
          detail: { projectId: this.options.projectId }
        }))
        
        return {
          success: true,
          action: 'created',
          path: toolCall.path,
          fileId: newFile.id,
          message: `✅ File ${toolCall.path} created successfully.`
        }
      }
    } catch (error) {
      throw new Error(`Failed to write file ${toolCall.path}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Execute pilotedit operation  
  private async executePilotEdit(toolCall: XMLToolCall): Promise<any> {
    if (!this.storageManager || !toolCall.path || !toolCall.content) {
      throw new Error('Missing required parameters for pilotedit')
    }

    try {
      // Check if file exists
      const existingFile = await this.storageManager.getFile(this.options.projectId, toolCall.path)

      if (!existingFile) {
        throw new Error(`File not found: ${toolCall.path}`)
      }

      // For simplicity, we'll replace the entire content for pilotedit
      // In a more sophisticated implementation, we could parse search/replace operations
      await this.storageManager.updateFile(this.options.projectId, toolCall.path, { 
        content: toolCall.content,
        updatedAt: new Date().toISOString()
      })

      // Emit files-changed event
      window.dispatchEvent(new CustomEvent('files-changed', {
        detail: { projectId: this.options.projectId }
      }))
      
      return {
        success: true,
        action: 'edited',
        path: toolCall.path,
        message: `✅ File ${toolCall.path} edited successfully.`
      }
    } catch (error) {
      throw new Error(`Failed to edit file ${toolCall.path}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Execute pilotdelete operation
  private async executePilotDelete(toolCall: XMLToolCall): Promise<any> {
    if (!this.storageManager || !toolCall.path) {
      throw new Error('Missing required parameters for pilotdelete')
    }

    try {
      // Check if file exists
      const existingFile = await this.storageManager.getFile(this.options.projectId, toolCall.path)

      if (!existingFile) {
        throw new Error(`File not found: ${toolCall.path}`)
      }

      // Delete the file
      const result = await this.storageManager.deleteFile(this.options.projectId, toolCall.path)
      
      if (result) {
        // Emit files-changed event
        window.dispatchEvent(new CustomEvent('files-changed', {
          detail: { projectId: this.options.projectId }
        }))

        return {
          success: true,
          action: 'deleted',
          path: toolCall.path,
          message: `✅ File ${toolCall.path} deleted successfully.`
        }
      } else {
        throw new Error(`Failed to delete file ${toolCall.path}`)
      }
    } catch (error) {
      throw new Error(`Failed to delete file ${toolCall.path}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Main execution method
  public async executeXMLTool(toolCall: XMLToolCall): Promise<any> {
    if (!this.shouldAutoExecute(toolCall)) {
      return { skipped: true, reason: 'Tool execution skipped' }
    }

    // Add to execution queue
    this.executionQueue.add(toolCall.id)
    
    try {
      // Notify execution start
      this.options.onExecutionStart?.(toolCall)

      let result: any

      // Execute based on command type (support both pilot and specs tool names)
      switch (toolCall.command) {
        case 'pilotwrite':
        case 'write_file':
          result = await this.executePilotWrite(toolCall)
          break
        case 'pilotedit':
        case 'edit_file':
          result = await this.executePilotEdit(toolCall)
          break
        case 'pilotdelete':
        case 'delete_file':
          result = await this.executePilotDelete(toolCall)
          break
        default:
          throw new Error(`Unknown command: ${toolCall.command}`)
      }

      // Update tool call with result
      const updatedToolCall = {
        ...toolCall,
        status: 'completed' as const,
        result,
        endTime: Date.now()
      }

      // Notify execution complete
      this.options.onExecutionComplete?.(updatedToolCall, result)

      // Emit comprehensive tool execution event
      window.dispatchEvent(new CustomEvent('xml-tool-executed', {
        detail: {
          projectId: this.options.projectId,
          toolCall: updatedToolCall,
          result,
          action: result.action,
          path: result.path
        }
      }))
      
      return result

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      
      // Update tool call with error
      const updatedToolCall = {
        ...toolCall,
        status: 'failed' as const,
        error: errorObj.message,
        endTime: Date.now()
      }

      // Notify execution error
      this.options.onExecutionError?.(updatedToolCall, errorObj)
      
      throw errorObj
    } finally {
      // Remove from execution queue
      this.executionQueue.delete(toolCall.id)
    }
  }

  // Process multiple JSON tool calls from streaming content - Direct JSON support
  public async processStreamingJsonTools(content: string): Promise<JsonToolCall[]> {
    const executedTools: JsonToolCall[] = []
    
    try {
      // Use JSON parser for reliable tool parsing
      const parseResult = jsonToolParser.parseJsonTools(content)
      const toolCalls = parseResult.tools
      
      // Execute each tool directly
      for (const toolCall of toolCalls) {
        try {
          const result = await this.executeJsonTool(toolCall)
          if (!result.skipped) {
            executedTools.push({
              ...toolCall,
              status: 'completed'
            })
            
            // Emit JSON tool execution event
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('json-tool-executed', {
                detail: { 
                  toolCall: {...toolCall, status: 'completed'}, 
                  result 
                }
              }))
            }
          }
        } catch (error) {
          executedTools.push({
            ...toolCall,
            status: 'failed'
          })
          console.error(`[XMLToolAutoExecutor] Error executing JSON tool ${toolCall.tool}:`, error)
        }
      }
      
      return executedTools
      
    } catch (error) {
      console.error('[XMLToolAutoExecutor] Error processing streaming JSON tools:', error)
      return []
    }
  }

  // Execute a single JSON tool call
  public async executeJsonTool(toolCall: JsonToolCall): Promise<{ skipped?: boolean; message?: string; error?: any }> {
    // Check if already executing
    if (this.executionQueue.has(toolCall.id)) {
      console.warn(`[XMLToolAutoExecutor] Tool ${toolCall.id} already in execution queue, skipping`)
      return { skipped: true, message: 'Tool already executing' }
    }

    // Add to execution queue
    this.executionQueue.add(toolCall.id)

    try {
      console.log(`[XMLToolAutoExecutor] Executing JSON tool: ${toolCall.tool} for path: ${toolCall.path}`)

      // Get the storage manager instance - dynamic import to match existing pattern
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      const projectId = this.options.projectId
      
      switch (toolCall.tool) {
        case 'write_file':
        case 'pilotwrite':
          if (!toolCall.path || !toolCall.content) {
            throw new Error('write_file requires path and content')
          }
          
          // Check if file exists
          try {
            const existingFile = await storageManager.getFile(projectId, toolCall.path)
            if (existingFile) {
              // File exists, update it
              await storageManager.updateFile(projectId, toolCall.path, { content: toolCall.content })
            } else {
              // File doesn't exist, create it
              const fileExtension = toolCall.path.split('.').pop() || 'text'
              await storageManager.createFile({
                workspaceId: projectId,
                name: toolCall.path.split('/').pop() || toolCall.path,
                path: toolCall.path,
                content: toolCall.content,
                fileType: fileExtension,
                type: fileExtension,
                size: toolCall.content.length,
                isDirectory: false
              })
            }
          } catch (error) {
            // If getFile fails, assume file doesn't exist and create it
            const fileExtension = toolCall.path.split('.').pop() || 'text'
            await storageManager.createFile({
              workspaceId: projectId,
              name: toolCall.path.split('/').pop() || toolCall.path,
              path: toolCall.path,
              content: toolCall.content,
              fileType: fileExtension,
              type: fileExtension,
              size: toolCall.content.length,
              isDirectory: false
            })
          }
          
          // Emit files-changed event with projectId
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('files-changed', {
              detail: { projectId: this.options.projectId }
            }))
          }
          
          return { message: `File ${toolCall.path} created successfully` }

        case 'edit_file':
        case 'pilotedit':
          return await this.executeAdvancedEditFile(toolCall, projectId, storageManager)

        case 'delete_file':
        case 'pilotdelete':
          if (!toolCall.path) {
            throw new Error('delete_file requires path')
          }
          
          await storageManager.deleteFile(projectId, toolCall.path)
          
          // Emit files-changed event with projectId
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('files-changed', {
              detail: { projectId: this.options.projectId }
            }))
          }
          
          return { message: `File ${toolCall.path} deleted successfully` }

        default:
          throw new Error(`Unsupported JSON tool: ${toolCall.tool}`)
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      console.error(`[XMLToolAutoExecutor] Error executing JSON tool ${toolCall.tool}:`, errorObj)
      throw errorObj
    } finally {
      // Remove from execution queue
      this.executionQueue.delete(toolCall.id)
    }
  }

  // Legacy: Process multiple tool calls from streaming content (XML compatibility)
  public async processStreamingXMLTools(content: string): Promise<XMLToolCall[]> {
    const executedTools: XMLToolCall[] = []
    
    try {
      // Use JSON parser for reliable tool parsing
      const parseResult = jsonToolParser.parseJsonTools(content)
      const toolCalls = this.convertJsonToolsToXMLToolCalls(parseResult.tools)
      
      // Execute each tool
      for (const toolCall of toolCalls) {
        try {
          const result = await this.executeXMLTool(toolCall)
          if (!result.skipped) {
            executedTools.push({
              ...toolCall,
              status: 'completed',
              result
            })
          }
        } catch (error) {
          executedTools.push({
            ...toolCall,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }
    } catch (error) {
      console.error('[XMLToolAutoExecutor] Error processing streaming XML tools:', error)
    }

    return executedTools
  }

  // Helper method to determine language from file path
  private getLanguageFromPath(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'js': return 'javascript'
      case 'ts': return 'typescript'
      case 'tsx': return 'typescript'
      case 'jsx': return 'javascript'
      case 'py': return 'python'
      case 'css': return 'css'
      case 'scss': return 'scss'
      case 'html': return 'html'
      case 'json': return 'json'
      case 'md': return 'markdown'
      case 'yml':
      case 'yaml': return 'yaml'
      default: return 'text'
    }
  }

  // Convert JsonToolCall to XMLToolCall format for backward compatibility
  private convertJsonToolsToXMLToolCalls(jsonTools: JsonToolCall[]): XMLToolCall[] {
    return jsonTools.map(tool => ({
      id: tool.id,
      name: tool.tool || tool.name || 'unknown',
      command: tool.tool as 'pilotwrite' | 'pilotedit' | 'pilotdelete' | 'write_file' | 'edit_file' | 'delete_file',
      path: tool.path || '',
      content: tool.content || '',
      args: tool.args,
      status: 'detected' as const,
      startTime: tool.startTime
    }))
  }

  /**
   * Advanced edit_file implementation with sophisticated search/replace capabilities
   * Supports multi-operation validation, rollback system, occurrence targeting, and post-validation
   */
  private async executeAdvancedEditFile(toolCall: any, projectId: string, storageManager: any) {
    const { path } = toolCall
    
    if (!path) {
      throw new Error('edit_file requires path')
    }

    // Check if file exists
    const existingFile = await storageManager.getFile(projectId, path)
    if (!existingFile) {
      throw new Error(`File not found: ${path}`)
    }

    // Handle legacy format (single search/replace)
    if (toolCall.search && toolCall.replace !== undefined) {
      return await this.handleLegacyEditFile(toolCall, existingFile, projectId, storageManager)
    }

    // Handle direct content replacement
    if (toolCall.content && !toolCall.searchReplaceBlocks) {
      await storageManager.updateFile(projectId, path, { content: toolCall.content })
      this.emitFilesChangedEvent()
      return { message: `File ${path} updated with new content` }
    }

    // Handle advanced search/replace blocks
    if (toolCall.searchReplaceBlocks && Array.isArray(toolCall.searchReplaceBlocks)) {
      return await this.handleAdvancedSearchReplace(toolCall, existingFile, projectId, storageManager)
    }

    throw new Error('edit_file requires content or searchReplaceBlocks')
  }

  /**
   * Handle legacy single search/replace operation with enhanced features
   */
  private async handleLegacyEditFile(toolCall: any, existingFile: any, projectId: string, storageManager: any) {
    const { path, search, replace, replaceAll, occurrenceIndex, validateAfter } = toolCall
    let modifiedContent = existingFile.content

    // Count occurrences
    const occurrences = this.countOccurrences(modifiedContent, search)
    if (occurrences === 0) {
      throw new Error(`Search text not found in ${path}`)
    }

    // Check occurrence index validity
    if (occurrenceIndex && occurrenceIndex > occurrences) {
      throw new Error(`Requested occurrence ${occurrenceIndex} but only ${occurrences} found`)
    }

    // Perform replacement
    if (occurrenceIndex) {
      modifiedContent = this.replaceNthOccurrence(modifiedContent, search, replace, occurrenceIndex)
    } else if (replaceAll) {
      modifiedContent = modifiedContent.replaceAll(search, replace)
    } else {
      modifiedContent = modifiedContent.replace(search, replace)
    }

    // Post-operation validation
    if (validateAfter && !modifiedContent.includes(validateAfter)) {
      throw new Error(`Validation failed: expected text "${validateAfter}" not found after operation`)
    }

    // Update file
    await storageManager.updateFile(projectId, path, { content: modifiedContent })
    this.emitFilesChangedEvent()

    const replacedCount = replaceAll ? occurrences : 1
    return { 
      message: `File ${path} edited successfully. Replaced ${replacedCount} occurrence(s)`,
      replacedOccurrences: replacedCount
    }
  }

  /**
   * Handle advanced multi-operation search/replace with validation and rollback
   */
  private async handleAdvancedSearchReplace(toolCall: any, existingFile: any, projectId: string, storageManager: any) {
    const { path, searchReplaceBlocks, dryRun = false, rollbackOnFailure = true } = toolCall
    const originalContent = existingFile.content
    let modifiedContent = originalContent

    // Track operations
    const appliedEdits: Array<{
      blockIndex: number
      search: string
      replace: string
      status: string
      replacedCount: number
      validationPassed?: boolean
    }> = []
    const failedEdits: Array<{
      blockIndex: number
      search: string
      replace: string
      reason: string
    }> = []
    const contentSnapshots = [originalContent]

    // Phase 1: Validation (always performed)
    let tempContent = originalContent
    const validationResults = []

    for (let i = 0; i < searchReplaceBlocks.length; i++) {
      const block = searchReplaceBlocks[i]
      const { search, replace, replaceAll, occurrenceIndex, validateAfter } = block
      
      const occurrences = this.countOccurrences(tempContent, search)
      let canApply = true
      let reason = ''

      if (occurrences === 0) {
        canApply = false
        reason = 'Search text not found'
      } else if (occurrenceIndex && occurrenceIndex > occurrences) {
        canApply = false
        reason = `Requested occurrence ${occurrenceIndex} but only ${occurrences} found`
      }

      validationResults.push({
        blockIndex: i,
        canApply,
        reason,
        occurrencesFound: occurrences
      })

      // Simulate change for next validation
      if (canApply) {
        if (occurrenceIndex) {
          tempContent = this.replaceNthOccurrence(tempContent, search, replace, occurrenceIndex)
        } else if (replaceAll) {
          tempContent = tempContent.replaceAll(search, replace)
        } else {
          tempContent = tempContent.replace(search, replace)
        }

        // Validate after change
        if (validateAfter && !tempContent.includes(validateAfter)) {
          canApply = false
          reason = `Post-validation failed: "${validateAfter}" not found`
          validationResults[i].canApply = false
          validationResults[i].reason = reason
        }
      }
    }

    // Check for validation failures
    const failedValidations = validationResults.filter(r => !r.canApply)
    
    if (dryRun) {
      return {
        message: `Dry run completed. ${validationResults.length - failedValidations.length}/${validationResults.length} operations would succeed`,
        dryRunResults: {
          totalBlocks: searchReplaceBlocks.length,
          validBlocks: validationResults.length - failedValidations.length,
          invalidBlocks: failedValidations.length,
          validationResults,
          previewContent: tempContent
        }
      }
    }

    // Phase 2: Apply changes
    for (let i = 0; i < searchReplaceBlocks.length; i++) {
      const block = searchReplaceBlocks[i]
      const validation = validationResults[i]
      
      if (!validation.canApply) {
        failedEdits.push({
          blockIndex: i,
          search: block.search,
          replace: block.replace,
          reason: validation.reason
        })
        
        if (rollbackOnFailure) {
          throw new Error(`Operation ${i + 1} failed: ${validation.reason}. Rolling back all changes.`)
        }
        continue
      }

      const { search, replace, replaceAll, occurrenceIndex, validateAfter } = block
      let replacedCount = 0

      // Apply replacement
      if (occurrenceIndex) {
        modifiedContent = this.replaceNthOccurrence(modifiedContent, search, replace, occurrenceIndex)
        replacedCount = 1
      } else if (replaceAll) {
        const beforeCount = this.countOccurrences(modifiedContent, search)
        modifiedContent = modifiedContent.replaceAll(search, replace)
        replacedCount = beforeCount
      } else {
        modifiedContent = modifiedContent.replace(search, replace)
        replacedCount = 1
      }

      // Post-operation validation
      let validationPassed = true
      if (validateAfter && !modifiedContent.includes(validateAfter)) {
        validationPassed = false
        if (rollbackOnFailure) {
          throw new Error(`Post-validation failed for operation ${i + 1}. Rolling back all changes.`)
        }
      }

      appliedEdits.push({
        blockIndex: i,
        search,
        replace,
        status: 'applied',
        replacedCount,
        validationPassed
      })

      contentSnapshots.push(modifiedContent)
    }

    if (appliedEdits.length === 0) {
      throw new Error('No changes could be applied. All operations failed.')
    }

    // Update file
    await storageManager.updateFile(projectId, path, { content: modifiedContent })
    this.emitFilesChangedEvent()

    return {
      message: `File ${path} updated successfully. Applied ${appliedEdits.length}/${searchReplaceBlocks.length} changes.`,
      appliedEdits,
      failedEdits: failedEdits.length > 0 ? failedEdits : undefined,
      validationResults,
      totalReplacements: appliedEdits.reduce((sum, edit) => sum + edit.replacedCount, 0)
    }
  }

  /**
   * Helper: Count occurrences of search text
   */
  private countOccurrences(content: string, searchText: string): number {
    return (content.match(new RegExp(this.escapeRegExp(searchText), 'g')) || []).length
  }

  /**
   * Helper: Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Helper: Find nth occurrence index
   */
  private findNthOccurrence(content: string, searchText: string, n: number): number {
    let index = -1
    for (let i = 0; i < n; i++) {
      index = content.indexOf(searchText, index + 1)
      if (index === -1) return -1
    }
    return index
  }

  /**
   * Helper: Replace nth occurrence
   */
  private replaceNthOccurrence(content: string, searchText: string, replaceText: string, n: number): string {
    const index = this.findNthOccurrence(content, searchText, n)
    if (index === -1) return content
    return content.substring(0, index) + replaceText + content.substring(index + searchText.length)
  }

  /**
   * Helper: Emit files changed event
   */
  private emitFilesChangedEvent(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('files-changed', {
        detail: { projectId: this.options.projectId }
      }))
    }
  }
}

export { XMLToolAutoExecutor }
export type { AutoExecutionOptions }