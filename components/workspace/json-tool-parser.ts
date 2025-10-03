/**
 * JSON-based Tool Parser for AI-generated tool calls
 * Replaces XML parsing with reliable JSON parsing similar to specs route
 */

import { SchemaAwareJSONRepairEngine } from '../../schema-aware-json-repair-engine.js'

// Type definition for repair engine result
interface RepairResult {
  data: any | null
  fixes: string[]
  confidence: number
  warnings: string[]
  processingTime?: number
  engine?: string
  version?: string
}

export interface SearchReplaceBlock {
  search: string
  replace: string
  replaceAll?: boolean
  occurrenceIndex?: number
  validateAfter?: string
}

export interface JsonToolCall {
  id: string
  tool: string
  name?: string
  path?: string
  content?: string
  operation?: string
  search?: string
  replace?: string
  searchReplaceBlocks?: SearchReplaceBlock[]
  replaceAll?: boolean
  occurrenceIndex?: number
  validateAfter?: string
  dryRun?: boolean
  rollbackOnFailure?: boolean
  args: Record<string, any>
  status: 'detected' | 'processing' | 'executing' | 'completed' | 'failed'
  result?: any
  error?: string
  startTime: number
  endTime?: number
}

export interface JsonParseResult {
  tools: JsonToolCall[]
  processedContent: string
}

/**
 * Parse JSON tool calls from AI streaming content
 * Supports JSON format like: {"tool": "write_file", "path": "...", "content": "..."}
 */
export class JsonToolParser {
  private supportedTools = [
    'write_file', 'edit_file', 'delete_file',
    'read_file', 'list_files', 'create_directory',
    'pilotwrite', 'pilotedit', 'pilotdelete'
  ]
  private repairEngine = new SchemaAwareJSONRepairEngine()

  /**
   * Extract and parse JSON tool calls from content
   */
  public parseJsonTools(content: string): JsonParseResult {
    const tools: JsonToolCall[] = []
    let processedContent = content

    // Find JSON tool patterns in the content
    const toolMatches = this.findJsonToolBlocks(content)

    for (const match of toolMatches) {
      try {
        const parsedTool = this.parseJsonBlock(match.json, match.startIndex)
        if (parsedTool) {
          tools.push({
            ...parsedTool,
            id: this.generateId(),
            startTime: Date.now()
          })

          // Replace JSON block with placeholder in processed content
          const placeholder = `[${parsedTool.tool.toUpperCase()}: ${parsedTool.path || parsedTool.args.path || 'unknown'}]`
          processedContent = processedContent.replace(match.json, placeholder)
        }
      } catch (error) {
        console.error('[JsonToolParser] Failed to parse JSON block:', error, match.json)
      }
    }

    return { tools, processedContent }
  }

  /**
   * Find JSON tool blocks in content
   * Looks for patterns like: {"tool": "write_file", ...}
   */
  private findJsonToolBlocks(content: string): Array<{ json: string; startIndex: number }> {
    const blocks: Array<{ json: string; startIndex: number }> = []
    
    // Pattern to find JSON objects with "tool" property
    const jsonToolPattern = /\{\s*["\']tool["\']\s*:\s*["\']([^"\']+)["\']\s*[,}][\s\S]*?\}/g
    
    let match
    while ((match = jsonToolPattern.exec(content)) !== null) {
      const toolName = match[1]
      if (this.supportedTools.includes(toolName)) {
        // Try to extract the complete JSON object
        const completeJson = this.extractCompleteJson(content, match.index)
        if (completeJson) {
          blocks.push({
            json: completeJson,
            startIndex: match.index
          })
        }
      }
    }

    // Also look for code blocks containing JSON
    const codeBlockPattern = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g
    while ((match = codeBlockPattern.exec(content)) !== null) {
      try {
        const jsonContent = match[1]
        const parsed = JSON.parse(jsonContent)
        if (parsed.tool && this.supportedTools.includes(parsed.tool)) {
          blocks.push({
            json: jsonContent,
            startIndex: match.index
          })
        }
      } catch (error) {
        // Ignore malformed JSON in code blocks
      }
    }

    return blocks
  }

  /**
   * Extract complete JSON object from content starting at index
   */
  private extractCompleteJson(content: string, startIndex: number): string | null {
    let braceCount = 0
    let inString = false
    let escapeNext = false
    let jsonEnd = -1

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i]

      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (char === '\\') {
        escapeNext = true
        continue
      }

      if (char === '"' || char === "'") {
        inString = !inString
        continue
      }

      if (!inString) {
        if (char === '{') {
          braceCount++
        } else if (char === '}') {
          braceCount--
          if (braceCount === 0) {
            jsonEnd = i
            break
          }
        }
      }
    }

    if (jsonEnd > startIndex) {
      return content.substring(startIndex, jsonEnd + 1)
    }

    return null
  }

  /**
   * Parse individual JSON block using schema-aware repair engine
   */
  private parseJsonBlock(jsonString: string, startIndex: number): Omit<JsonToolCall, 'id' | 'startTime'> | null {
    try {
      // First try standard JSON.parse
      let parsed: any
      
      try {
        parsed = JSON.parse(jsonString)
      } catch (parseError) {
        // If standard parsing fails, use schema-aware repair engine
        console.log('[JsonToolParser] Standard parse failed, trying schema-aware repair...')
        const repairResult = this.repairEngine.repair(jsonString) as RepairResult
        
        if (repairResult.data && repairResult.confidence > 0.5) {
          parsed = repairResult.data
          console.log('[JsonToolParser] Successfully repaired JSON with confidence:', repairResult.confidence)
          if (repairResult.fixes.length > 0) {
            console.log('[JsonToolParser] Applied fixes:', repairResult.fixes)
          }
        } else {
          console.error('[JsonToolParser] Schema-aware repair failed or low confidence:', repairResult.confidence)
          return null
        }
      }
      
      if (!parsed.tool || !this.supportedTools.includes(parsed.tool)) {
        console.warn('[JsonToolParser] Invalid or unsupported tool:', parsed.tool)
        return null
      }

      // Build standardized args object
      const args: Record<string, any> = { ...parsed }
      delete args.tool // Remove tool from args since it's a separate field

      return {
        tool: parsed.tool,
        name: parsed.tool, // For compatibility
        path: parsed.path || args.file || args.filename,
        content: parsed.content || args.content,
        operation: parsed.operation,
        search: parsed.search,
        replace: parsed.replace,
        searchReplaceBlocks: parsed.searchReplaceBlocks,
        replaceAll: parsed.replaceAll,
        occurrenceIndex: parsed.occurrenceIndex,
        validateAfter: parsed.validateAfter,
        dryRun: parsed.dryRun,
        rollbackOnFailure: parsed.rollbackOnFailure,
        args,
        status: 'detected' as const
      }

    } catch (error) {
      console.error('[JsonToolParser] JSON parsing completely failed:', error)
      return null
    }
  }

  /**
   * Generate unique ID for tool call
   */
  private generateId(): string {
    return `json_tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Validate if content contains supported JSON tools
   */
  public hasJsonTools(content: string): boolean {
    const toolPattern = this.supportedTools.join('|')
    const jsonToolRegex = new RegExp(`\\{[^}]*["\']tool["\']\s*:\s*["\'](?:${toolPattern})["\']`, 'i')
    return jsonToolRegex.test(content)
  }

  /**
   * Get supported tool names
   */
  public getSupportedTools(): string[] {
    return [...this.supportedTools]
  }
}

// Export singleton instance
export const jsonToolParser = new JsonToolParser()

// Export utility function
export function parseJsonTools(content: string): JsonToolCall[] {
  const result = jsonToolParser.parseJsonTools(content)
  return result.tools
}