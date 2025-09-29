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
    
    // Only execute valid file operations and SQL operations (support both pilot and specs tool names)
    const validCommands = [
      'pilotwrite', 'pilotedit', 'pilotdelete',
      'write_file', 'edit_file', 'delete_file',
      'execute_sql'
    ]
    return validCommands.includes(toolCall.command)
  }

  // Execute pilotwrite operation
  private async executePilotWrite(toolCall: XMLToolCall): Promise<any> {
    if (!this.storageManager || !toolCall.path || !toolCall.content) {
      throw new Error('Missing required parameters for pilotwrite')
    }

    try {
      // AI Code Validation and Auto-Fix
      const validation = await this.validateAndFixCode(toolCall.path, toolCall.content, 'create')

      if (!validation.isValid) {
        // Log validation issues but don't block - allow manual override
        console.warn(`[XMLToolAutoExecutor] Code validation issues for ${toolCall.path}:`, validation.errors)
        console.info(`[XMLToolAutoExecutor] Suggestions:`, validation.suggestions)

        // Emit validation warning event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('code-validation-warning', {
            detail: {
              projectId: this.options.projectId,
              filePath: toolCall.path,
              errors: validation.errors,
              suggestions: validation.suggestions,
              autoFixed: validation.autoFixed
            }
          }))
        }
      }

      // Use auto-fixed content if available
      const contentToSave = validation.fixedContent || toolCall.content

      // Check if file already exists
      const existingFile = await this.storageManager.getFile(this.options.projectId, toolCall.path)

      if (existingFile) {
        // Update existing file
        await this.storageManager.updateFile(this.options.projectId, toolCall.path, { 
          content: contentToSave,
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
          message: `✅ File ${toolCall.path} updated successfully.`,
          validation: {
            hadIssues: !validation.isValid,
            autoFixed: validation.autoFixed,
            errors: validation.errors,
            suggestions: validation.suggestions
          }
        }
      } else {
        // Create new file
        const newFile = await this.storageManager.createFile({
          workspaceId: this.options.projectId,
          name: toolCall.path.split('/').pop() || toolCall.path,
          path: toolCall.path,
          content: contentToSave,
          fileType: toolCall.path.split('.').pop() || 'text',
          type: toolCall.path.split('.').pop() || 'text',
          size: contentToSave.length,
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
          message: `✅ File ${toolCall.path} created successfully.`,
          validation: {
            hadIssues: !validation.isValid,
            autoFixed: validation.autoFixed,
            errors: validation.errors,
            suggestions: validation.suggestions
          }
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

      // AI Code Validation and Auto-Fix
      const validation = await this.validateAndFixCode(toolCall.path, toolCall.content, 'edit')

      if (!validation.isValid) {
        // Log validation issues but don't block - allow manual override
        console.warn(`[XMLToolAutoExecutor] Code validation issues for ${toolCall.path}:`, validation.errors)
        console.info(`[XMLToolAutoExecutor] Suggestions:`, validation.suggestions)

        // Emit validation warning event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('code-validation-warning', {
            detail: {
              projectId: this.options.projectId,
              filePath: toolCall.path,
              errors: validation.errors,
              suggestions: validation.suggestions,
              autoFixed: validation.autoFixed
            }
          }))
        }
      }

      // Use auto-fixed content if available
      const contentToSave = validation.fixedContent || toolCall.content

      // For simplicity, we'll replace the entire content for pilotedit
      // In a more sophisticated implementation, we could parse search/replace operations
      await this.storageManager.updateFile(this.options.projectId, toolCall.path, { 
        content: contentToSave,
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
        message: `✅ File ${toolCall.path} edited successfully.`,
        validation: {
          hadIssues: !validation.isValid,
          autoFixed: validation.autoFixed,
          errors: validation.errors,
          suggestions: validation.suggestions
        }
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

  // Execute SQL operation
  private async executeSql(toolCall: XMLToolCall): Promise<any> {
    if (!toolCall.content) {
      throw new Error('Missing SQL content for execute_sql')
    }

    try {
      // Get Supabase project details for the current user
      const { getSupabaseProjectDetails, getDeploymentTokens } = await import('@/lib/cloud-sync')
      const projectDetails = await getSupabaseProjectDetails(this.options.projectId)

      if (!projectDetails?.selectedProjectId) {
        throw new Error('No Supabase project selected. Please select a project in your account settings.')
      }

      // Get the access token to fetch API keys automatically
      const tokens = await getDeploymentTokens(this.options.projectId)
      const accessToken = tokens?.supabase

      if (!accessToken) {
        throw new Error('No Supabase access token found. Please reconnect to Supabase in your account settings.')
      }

      // Use server-side API to fetch API keys automatically (avoids CORS issues)
      let anonKey: string
      let serviceRoleKey: string
      let projectUrl: string

      try {
        // Fetch API keys for the selected project using server-side API
        const apiResponse = await fetch('/api/supabase/fetch-api-keys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            token: accessToken, 
            projectId: projectDetails.selectedProjectId 
          }),
        })

        const apiResult = await apiResponse.json()

        if (!apiResponse.ok || !apiResult.success) {
          throw new Error(apiResult.error || 'Could not retrieve API keys from Supabase Management API')
        }

        anonKey = apiResult.anonKey
        serviceRoleKey = apiResult.serviceRoleKey
        projectUrl = apiResult.projectUrl

        // Store the fetched keys for future use
        await import('@/lib/cloud-sync').then(async ({ storeSupabaseProjectDetails }) => {
          await storeSupabaseProjectDetails(this.options.projectId, {
            projectUrl,
            anonKey,
            serviceRoleKey
          })
        })

      } catch (apiError) {
        console.error('Error fetching API keys from Management API:', apiError)

        // Fallback to manually stored keys if available
        if (projectDetails.anonKey && projectDetails.serviceRoleKey && projectDetails.projectUrl) {
          anonKey = projectDetails.anonKey
          serviceRoleKey = projectDetails.serviceRoleKey
          projectUrl = projectDetails.projectUrl
        } else {
          throw new Error('Failed to fetch API keys automatically and no manual keys stored. Please check your Supabase connection.')
        }
      }

      // Parse the SQL to determine the operation type
      const sql = toolCall.content.trim()

      if (sql.toUpperCase().startsWith('SELECT')) {
        throw new Error('SELECT operations are not allowed. Only CREATE, INSERT, UPDATE, DELETE operations are permitted.')
      }

      // For SQL execution, use server-side API to avoid CORS issues
      // This executes SQL directly using service role permissions
      try {
        // Execute the SQL using the server-side API
        const sqlResponse = await fetch('/api/supabase/execute-sql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            token: accessToken, 
            projectId: projectDetails.selectedProjectId,
            sql: sql
          }),
        })

        const sqlResult = await sqlResponse.json()

        if (!sqlResponse.ok || !sqlResult.success) {
          throw new Error(sqlResult.error || 'SQL execution failed')
        }

        // Return success result
        return sqlResult
      } catch (execError) {
        // If execution fails, provide detailed error but don't simulate success
        console.error('SQL execution error:', execError)
        throw new Error(`SQL execution failed: ${execError instanceof Error ? execError.message : 'Unknown error'}`)
      }
    } catch (error) {
      throw new Error(`Failed to execute SQL: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
        case 'execute_sql':
          result = await this.executeSql(toolCall)
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
  public async executeJsonTool(toolCall: JsonToolCall): Promise<{ 
    skipped?: boolean; 
    message?: string; 
    error?: any;
    validation?: {
      hadIssues: boolean;
      autoFixed: boolean;
      errors: string[];
      suggestions: string[];
    }
  }> {
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

          // AI Code Validation and Auto-Fix
          const writeValidation = await this.validateAndFixCode(toolCall.path, toolCall.content, 'create')

          if (!writeValidation.isValid) {
            // Log validation issues but don't block - allow manual override
            console.warn(`[XMLToolAutoExecutor] Code validation issues for ${toolCall.path}:`, writeValidation.errors)
            console.info(`[XMLToolAutoExecutor] Suggestions:`, writeValidation.suggestions)

            // Emit validation warning event
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('code-validation-warning', {
                detail: {
                  projectId: this.options.projectId,
                  filePath: toolCall.path,
                  errors: writeValidation.errors,
                  suggestions: writeValidation.suggestions,
                  autoFixed: writeValidation.autoFixed
                }
              }))
            }
          }

          // Use auto-fixed content if available
          const contentToSave = writeValidation.fixedContent || toolCall.content
          
          // Check if file exists
          try {
            const existingFile = await storageManager.getFile(projectId, toolCall.path)
            if (existingFile) {
              // File exists, update it
              await storageManager.updateFile(projectId, toolCall.path, { content: contentToSave })
            } else {
              // File doesn't exist, create it
              const fileExtension = toolCall.path.split('.').pop() || 'text'
              await storageManager.createFile({
                workspaceId: projectId,
                name: toolCall.path.split('/').pop() || toolCall.path,
                path: toolCall.path,
                content: contentToSave,
                fileType: fileExtension,
                type: fileExtension,
                size: contentToSave.length,
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
              content: contentToSave,
              fileType: fileExtension,
              type: fileExtension,
              size: contentToSave.length,
              isDirectory: false
            })
          }
          
          // Emit files-changed event with projectId
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('files-changed', {
              detail: { projectId: this.options.projectId }
            }))
          }
          
          return {
            message: `File ${toolCall.path} created successfully`,
            validation: {
              hadIssues: !writeValidation.isValid,
              autoFixed: writeValidation.autoFixed,
              errors: writeValidation.errors,
              suggestions: writeValidation.suggestions
            }
          }

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
      // AI Code Validation and Auto-Fix for direct content replacement
      const editValidation = await this.validateAndFixCode(path, toolCall.content, 'edit')

      if (!editValidation.isValid) {
        // Log validation issues but don't block - allow manual override
        console.warn(`[XMLToolAutoExecutor] Code validation issues for ${path}:`, editValidation.errors)
        console.info(`[XMLToolAutoExecutor] Suggestions:`, editValidation.suggestions)

        // Emit validation warning event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('code-validation-warning', {
            detail: {
              projectId: this.options.projectId,
              filePath: path,
              errors: editValidation.errors,
              suggestions: editValidation.suggestions,
              autoFixed: editValidation.autoFixed
            }
          }))
        }
      }

      // Use auto-fixed content if available
      const contentToSave = editValidation.fixedContent || toolCall.content

      await storageManager.updateFile(projectId, path, { content: contentToSave })
      this.emitFilesChangedEvent()
      return {
        message: `File ${path} updated with new content`,
        validation: {
          hadIssues: !editValidation.isValid,
          autoFixed: editValidation.autoFixed,
          errors: editValidation.errors,
          suggestions: editValidation.suggestions
        }
      }
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

    // AI Code Validation and Auto-Fix for modified content
    const legacyValidation = await this.validateAndFixCode(path, modifiedContent, 'edit')

    if (!legacyValidation.isValid) {
      // Log validation issues but don't block - allow manual override
      console.warn(`[XMLToolAutoExecutor] Code validation issues for ${path}:`, legacyValidation.errors)
      console.info(`[XMLToolAutoExecutor] Suggestions:`, legacyValidation.suggestions)

      // Emit validation warning event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('code-validation-warning', {
          detail: {
            projectId: this.options.projectId,
            filePath: path,
            errors: legacyValidation.errors,
            suggestions: legacyValidation.suggestions,
            autoFixed: legacyValidation.autoFixed
          }
        }))
      }
    }

    // Use auto-fixed content if available
    const contentToSave = legacyValidation.fixedContent || modifiedContent

    // Update file
    await storageManager.updateFile(projectId, path, { content: contentToSave })
    this.emitFilesChangedEvent()

    const replacedCount = replaceAll ? occurrences : 1
    return { 
      message: `File ${path} edited successfully. Replaced ${replacedCount} occurrence(s)`,
      replacedOccurrences: replacedCount,
      validation: {
        hadIssues: !legacyValidation.isValid,
        autoFixed: legacyValidation.autoFixed,
        errors: legacyValidation.errors,
        suggestions: legacyValidation.suggestions
      }
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

    // AI Code Validation and Auto-Fix for final modified content
    const advancedValidation = await this.validateAndFixCode(path, modifiedContent, 'edit')

    if (!advancedValidation.isValid) {
      // Log validation issues but don't block - allow manual override
      console.warn(`[XMLToolAutoExecutor] Code validation issues for ${path}:`, advancedValidation.errors)
      console.info(`[XMLToolAutoExecutor] Suggestions:`, advancedValidation.suggestions)

      // Emit validation warning event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('code-validation-warning', {
          detail: {
            projectId: this.options.projectId,
            filePath: path,
            errors: advancedValidation.errors,
            suggestions: advancedValidation.suggestions,
            autoFixed: advancedValidation.autoFixed
          }
        }))
      }
    }

    // Use auto-fixed content if available
    const contentToSave = advancedValidation.fixedContent || modifiedContent

    // Update file
    await storageManager.updateFile(projectId, path, { content: contentToSave })
    this.emitFilesChangedEvent()

    return {
      message: `File ${path} updated successfully. Applied ${appliedEdits.length}/${searchReplaceBlocks.length} changes.`,
      appliedEdits,
      failedEdits: failedEdits.length > 0 ? failedEdits : undefined,
      validationResults,
      totalReplacements: appliedEdits.reduce((sum, edit) => sum + edit.replacedCount, 0),
      validation: {
        hadIssues: !advancedValidation.isValid,
        autoFixed: advancedValidation.autoFixed,
        errors: advancedValidation.errors,
        suggestions: advancedValidation.suggestions
      }
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

  /**
   * AI-Powered Code Validation and Auto-Fix
   * Validates code syntax, file extension compatibility, and provides auto-fixes
   */
  private async validateAndFixCode(filePath: string, content: string, operation: 'create' | 'edit' = 'create'): Promise<{
    isValid: boolean
    errors: string[]
    fixedContent?: string
    suggestions: string[]
    autoFixed: boolean
  }> {
    const errors: string[] = []
    const suggestions: string[] = []
    let fixedContent = content
    let autoFixed = false

    try {
      // 1. Basic file extension validation
      const fileExt = filePath.split('.').pop()?.toLowerCase()
      const hasJSX = /<[^>]*>[\s\S]*?<\/[^>]*>|<[^>]*\/>/.test(content)
      const hasTSXSyntax = /\.(tsx?|jsx?)$/.test(filePath)

      // Check for JSX in .ts files (not .tsx)
      if (fileExt === 'ts' && hasJSX && !filePath.endsWith('.tsx')) {
        errors.push(`JSX syntax detected in .ts file. Use .tsx extension for React components.`)
        suggestions.push(`Rename file to .tsx extension or remove JSX syntax`)
      }

      // Check for TypeScript syntax in .js files
      if (fileExt === 'js' && (content.includes(': ') || content.includes('interface ') || content.includes('type '))) {
        errors.push(`TypeScript syntax detected in .js file. Use .ts extension.`)
        suggestions.push(`Rename file to .ts extension`)
      }

      // 2. Attempt auto-fixes for common syntax errors
      const autoFixResult = this.performBasicAutoFixes(content, filePath)
      if (autoFixResult.fixed) {
        fixedContent = autoFixResult.content
        autoFixed = true
        console.log(`[XMLToolAutoExecutor] Applied basic auto-fixes for ${filePath}`)
      }

      // 3. AI-powered advanced validation and additional fixes
      const validationResult = await this.performAISyntaxValidation(filePath, fixedContent, operation)

      if (!validationResult.isValid) {
        errors.push(...validationResult.errors)
        suggestions.push(...validationResult.suggestions)

        // Attempt additional AI-powered auto-fix if basic fixes didn't resolve all issues
        if (validationResult.fixedContent && validationResult.canAutoFix && !autoFixed) {
          fixedContent = validationResult.fixedContent
          autoFixed = true
          console.log(`[XMLToolAutoExecutor] Applied AI auto-fixes for ${filePath}`)
        }
      }

      // Final validation check on the (potentially) fixed content
      const finalErrors = this.performFinalValidation(fixedContent, filePath)
      if (finalErrors.length > 0) {
        errors.push(...finalErrors)
      }

      return {
        isValid: errors.length === 0,
        errors,
        fixedContent: autoFixed ? fixedContent : undefined,
        suggestions,
        autoFixed
      }

    } catch (error) {
      console.error('[XMLToolAutoExecutor] Code validation failed:', error)
      // Return as valid if validation fails to avoid blocking operations
      return {
        isValid: true,
        errors: [],
        suggestions: ['Code validation temporarily unavailable'],
        autoFixed: false
      }
    }
  }

  /**
   * Perform basic auto-fixes for common syntax errors
   */
  private performBasicAutoFixes(content: string, filePath: string): { fixed: boolean; content: string } {
    let fixedContent = content
    let hasFixes = false

    try {
      // Fix 1: Balance braces {}
      const openBraces = (fixedContent.match(/\{/g) || []).length
      const closeBraces = (fixedContent.match(/\}/g) || []).length

      if (openBraces > closeBraces) {
        const missingCount = openBraces - closeBraces
        // Add missing closing braces at the end
        fixedContent += '\n' + '}'.repeat(missingCount)
        hasFixes = true
        console.log(`[AutoFix] Added ${missingCount} missing closing braces`)
      }

      // Fix 2: Balance parentheses ()
      const openParens = (fixedContent.match(/\(/g) || []).length
      const closeParens = (fixedContent.match(/\)/g) || []).length

      if (openParens > closeParens) {
        const missingCount = openParens - closeParens
        // Add missing closing parentheses
        fixedContent += ')'.repeat(missingCount)
        hasFixes = true
        console.log(`[AutoFix] Added ${missingCount} missing closing parentheses`)
      }

      // Fix 3: Balance square brackets []
      const openBrackets = (fixedContent.match(/\[/g) || []).length
      const closeBrackets = (fixedContent.match(/\]/g) || []).length

      if (openBrackets > closeBrackets) {
        const missingCount = openBrackets - closeBrackets
        fixedContent += ']'.repeat(missingCount)
        hasFixes = true
        console.log(`[AutoFix] Added ${missingCount} missing closing brackets`)
      }

      // Fix 4: Fix unclosed JSX tags in return statements
      const returnMatch = fixedContent.match(/return\s*\([\s\S]*?\)/g)
      if (returnMatch) {
        let jsxContent = returnMatch[0]
        const originalJsxContent = jsxContent

        // Find JSX tags in return statement
        const jsxTags = jsxContent.match(/<[^>]*>/g) || []
        const openingTags = jsxTags.filter(tag =>
          !tag.startsWith('</') && !tag.endsWith('/>') && !tag.includes('<!')
        )
        const closingTags = jsxTags.filter(tag => tag.startsWith('</'))

        // Add missing closing tags
        if (openingTags.length > closingTags.length) {
          const missingCount = openingTags.length - closingTags.length
          // Add missing closing tags for the last opened tags
          for (let i = 0; i < missingCount && openingTags.length - i - 1 >= 0; i++) {
            const lastOpeningTag = openingTags[openingTags.length - 1 - i]
            const tagName = lastOpeningTag.slice(1, -1).split(' ')[0] // Extract tag name
            jsxContent += `\n</${tagName}>`
          }
          hasFixes = true
          console.log(`[AutoFix] Added ${missingCount} missing closing JSX tags`)

          // Replace the return statement in the original content
          fixedContent = fixedContent.replace(originalJsxContent, jsxContent)
        }
      }

      // Fix 5: Add missing semicolons at end of statements (basic)
      // This is conservative - only add semicolons where clearly missing
      const lines = fixedContent.split('\n')
      const fixedLines = lines.map(line => {
        const trimmed = line.trim()
        // Add semicolon if line ends with variable assignment/return but no semicolon
        if ((trimmed.includes('=') || trimmed.startsWith('return ')) &&
            !trimmed.endsWith(';') &&
            !trimmed.endsWith(',') &&
            !trimmed.endsWith('{') &&
            !trimmed.endsWith('}') &&
            !trimmed.endsWith('(') &&
            !trimmed.endsWith(')') &&
            !trimmed.includes('//') &&
            trimmed.length > 0) {
          return line + ';'
        }
        return line
      })

      if (fixedLines.some((line, i) => line !== lines[i])) {
        fixedContent = fixedLines.join('\n')
        hasFixes = true
        console.log(`[AutoFix] Added missing semicolons`)
      }

      // Fix 6: Fix incomplete JSX expressions
      fixedContent = fixedContent.replace(/\{([^}]*)$/gm, '{$1}') // Close incomplete JSX expressions

      return { fixed: hasFixes, content: fixedContent }

    } catch (error) {
      console.error('[AutoFix] Basic auto-fix failed:', error)
      return { fixed: false, content: fixedContent }
    }
  }

  /**
   * Perform final validation on potentially fixed content
   */
  private performFinalValidation(content: string, filePath: string): string[] {
    const errors: string[] = []

    try {
      // Check braces balance
      const openBraces = (content.match(/\{/g) || []).length
      const closeBraces = (content.match(/\}/g) || []).length
      if (openBraces !== closeBraces) {
        errors.push(`Braces still unbalanced: ${openBraces} opening, ${closeBraces} closing`)
      }

      // Check parentheses balance
      const openParens = (content.match(/\(/g) || []).length
      const closeParens = (content.match(/\)/g) || []).length
      if (openParens !== closeParens) {
        errors.push(`Parentheses still unbalanced: ${openParens} opening, ${closeParens} closing`)
      }

      // Check JSX tags in return statements
      const returnMatch = content.match(/return\s*\([\s\S]*?\)/g)
      if (returnMatch) {
        const jsxContent = returnMatch[0]
        const jsxTags = jsxContent.match(/<[^>]*>/g) || []
        const openingTags = jsxTags.filter(tag =>
          !tag.startsWith('</') && !tag.endsWith('/>') && !tag.includes('<!')
        )
        const closingTags = jsxTags.filter(tag => tag.startsWith('</'))

        if (openingTags.length !== closingTags.length) {
          errors.push(`JSX tags still unbalanced in return statement: ${openingTags.length} opening, ${closingTags.length} closing`)
        }
      }

    } catch (error) {
      console.error('[FinalValidation] Validation failed:', error)
    }

    return errors
  }

  /**
   * Perform AI-powered syntax validation using Mistral Pixtral
   */
  private async performAISyntaxValidation(filePath: string, content: string, operation: 'create' | 'edit'): Promise<{
    isValid: boolean
    errors: string[]
    suggestions: string[]
    fixedContent?: string
    canAutoFix: boolean
  }> {
    try {
      // Import AI functions dynamically (similar to route.ts pattern)
      const { generateText } = await import('ai')
      const { getModel } = await import('@/lib/ai-providers')

      // Use Mistral Pixtral for code analysis
      const model = getModel('pixtral-12b-2409')

      const fileExt = filePath.split('.').pop()?.toLowerCase()
      const language = this.getLanguageFromPath(filePath)

      const prompt = `You are an expert code validator. Analyze the following ${language} code for syntax errors, structural issues, and best practices.

File: ${filePath}
Operation: ${operation}
Language: ${language}

CODE TO VALIDATE:
\`\`\`${language}
${content}
\`\`\`

Please respond with a JSON object containing:
{
  "isValid": boolean,
  "errors": ["error1", "error2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "fixedContent": "corrected code if auto-fixable",
  "canAutoFix": boolean,
  "severity": "low|medium|high"
}

Focus on:
- Syntax errors (missing brackets, braces, semicolons, quotes)
- JSX structure issues (unclosed tags, improper nesting)
- TypeScript errors (type mismatches, missing types)
- Import/export issues
- Logic errors that would cause runtime failures
- File extension compatibility

Only provide auto-fix for clearly fixable issues like missing closing brackets, quotes, or semicolons.`

      const result = await generateText({
        model,
        prompt,
        temperature: 0.1, // Low temperature for consistent analysis
      })

      const response = result.text.trim()

      // Try to parse JSON response
      try {
        const validation = JSON.parse(response)
        return {
          isValid: validation.isValid ?? true,
          errors: Array.isArray(validation.errors) ? validation.errors : [],
          suggestions: Array.isArray(validation.suggestions) ? validation.suggestions : [],
          fixedContent: validation.fixedContent,
          canAutoFix: validation.canAutoFix ?? false
        }
      } catch (parseError) {
        // If JSON parsing fails, try to extract information from text response
        console.warn('[XMLToolAutoExecutor] AI validation returned non-JSON response, using fallback parsing')
        return this.parseTextValidationResponse(response)
      }

    } catch (error) {
      console.error('[XMLToolAutoExecutor] AI validation error:', error)
      // Return valid if AI validation fails
      return {
        isValid: true,
        errors: [],
        suggestions: ['AI validation temporarily unavailable'],
        canAutoFix: false
      }
    }
  }

  /**
   * Fallback parser for non-JSON AI validation responses
   */
  private parseTextValidationResponse(response: string): {
    isValid: boolean
    errors: string[]
    suggestions: string[]
    canAutoFix: boolean
  } {
    const errors: string[] = []
    const suggestions: string[] = []

    // Simple text analysis for common issues
    const lines = response.toLowerCase().split('\n')

    for (const line of lines) {
      if (line.includes('error') || line.includes('invalid') || line.includes('missing')) {
        if (line.includes('bracket') || line.includes('brace') || line.includes('parentheses')) {
          errors.push('Possible bracket/brace/parentheses mismatch')
        } else if (line.includes('jsx') || line.includes('tag')) {
          errors.push('Possible JSX structure issue')
        } else if (line.includes('syntax')) {
          errors.push('Syntax error detected')
        }
      }

      if (line.includes('suggest') || line.includes('recommend') || line.includes('should')) {
        suggestions.push(line.trim())
      }
    }

    // If no specific errors found, assume valid
    const isValid = errors.length === 0

    return {
      isValid,
      errors,
      suggestions,
      canAutoFix: false // Don't auto-fix with fallback parsing
    }
  }
}

export { XMLToolAutoExecutor }
export type { AutoExecutionOptions }