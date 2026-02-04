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
    'pilotwrite', 'pilotedit', 'pilotdelete',
    'remove_package'
  ]
  private repairEngine = new SchemaAwareJSONRepairEngine()

  /**
   * Extract and parse JSON tool calls from content
   */
  public parseJsonTools(content: string): JsonParseResult {
    // Add safety check for invalid input
    if (!content || typeof content !== 'string') {
      console.warn('[JsonToolParser] Invalid input content:', content)
      return { tools: [], processedContent: content || '' }
    }

    const tools: JsonToolCall[] = []
    let processedContent = content

    try {
      // Find JSON tool patterns in the content using enhanced parsing
      const toolMatches = this.findJsonToolBlocksEnhanced(content)

      for (const match of toolMatches) {
        try {
          // Validate match data
          if (!match || !match.json || typeof match.json !== 'string') {
            console.warn('[JsonToolParser] Invalid match object:', match)
            continue
          }

          const parsedTool = this.parseJsonBlockEnhanced(match.json, match.startIndex)
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
          console.error('[JsonToolParser] Failed to parse individual JSON block:', error)
          console.error('[JsonToolParser] Problematic JSON block (first 200 chars):', (match?.json || '').substring(0, 200))
          // Continue processing other blocks instead of crashing
        }
      }
    } catch (error) {
      console.error('[JsonToolParser] Critical error in parseJsonTools:', error)
      // Return empty result instead of crashing
      return { tools: [], processedContent: content }
    }

    return { tools, processedContent }
  }

  /**
   * Enhanced JSON tool block finding with better malformed JSON support
   */
  private findJsonToolBlocksEnhanced(content: string): Array<{ json: string; startIndex: number }> {
    const blocks: Array<{ json: string; startIndex: number }> = []

    // First try the enhanced parsing method from the schema-aware engine
    const enhancedResult = (this.repairEngine as any).parseToolCall(content)
    if (enhancedResult && Array.isArray(enhancedResult) && enhancedResult.length > 0) {
      // If enhanced parsing found tool calls, convert them to the expected format
      for (const tool of enhancedResult) {
        if (tool.tool && this.supportedTools.includes(tool.tool)) {
          // Find the JSON portion in the content
          const jsonMatch = content.match(/\{[\s\S]*?\}/)
          if (jsonMatch) {
            blocks.push({
              json: jsonMatch[0],
              startIndex: jsonMatch.index || 0
            })
          }
        }
      }
      if (blocks.length > 0) {
        return blocks // Return if enhanced parsing found tools
      }
    }

    // Fall back to manual parsing methods if enhanced parsing didn't find tools
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
        // Try enhanced parsing on the code block content
        const enhancedResult = (this.repairEngine as any).parseToolCall(match[1])
        if (enhancedResult) {
          blocks.push({
            json: match[1],
            startIndex: match.index
          })
        }
        // Ignore malformed JSON in code blocks if enhanced parsing also fails
      }
    }

    return blocks
  }

  /**
   * Enhanced JSON block parsing using the schema-aware engine
   */
  private parseJsonBlockEnhanced(jsonString: string, startIndex: number): Omit<JsonToolCall, 'id' | 'startTime'> | null {
    try {
      // First try the enhanced parsing method
      const enhancedResult = (this.repairEngine as any).parseToolCall(jsonString)
      if (enhancedResult) {
        // Convert enhanced result to JsonToolCall format
        return {
          tool: enhancedResult.tool,
          name: enhancedResult.tool,
          path: enhancedResult.path,
          content: enhancedResult.content,
          operation: enhancedResult.args.operation,
          search: enhancedResult.args.search,
          replace: enhancedResult.args.replace,
          searchReplaceBlocks: enhancedResult.args.searchReplaceBlocks,
          replaceAll: enhancedResult.args.replaceAll,
          occurrenceIndex: enhancedResult.args.occurrenceIndex,
          validateAfter: enhancedResult.args.validateAfter,
          dryRun: enhancedResult.args.dryRun,
          rollbackOnFailure: enhancedResult.args.rollbackOnFailure,
          args: enhancedResult.args,
          status: 'detected' as const
        }
      }

      // Fall back to original parsing method
      return this.parseJsonBlock(jsonString, startIndex)

    } catch (error) {
      console.error('[JsonToolParser] Enhanced parsing completely failed:', error)
      return null
    }
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
    const codeBlockPattern = /```(?:json)?\s*\n?(\{[\s\S]*?\n?\})\s*\n?```/g
    while ((match = codeBlockPattern.exec(content)) !== null) {
      try {
        const jsonContent = match[1].trim()

        // Try standard JSON.parse first
        let parsed: any
        try {
          parsed = JSON.parse(jsonContent)
        } catch (parseError) {
          // If standard parsing fails, use schema-aware repair engine
          const repairResult = this.repairEngine.repair(jsonContent) as RepairResult

          if (repairResult.data && repairResult.confidence > 0.5) {
            parsed = repairResult.data
          } else {
            continue
          }
        }

        if (parsed.tool && this.supportedTools.includes(parsed.tool)) {
          blocks.push({
            json: jsonContent,
            startIndex: match.index
          })
        }
      } catch (error) {
        // Continue processing other blocks
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

    // Fallback: If we can't find a complete JSON object, try to extract until we hit a reasonable stopping point
    // This handles cases where the JSON might be at the end of the content or followed by other content
    let fallbackEnd = -1
    let fallbackBraceCount = 0
    let fallbackInString = false
    let fallbackEscapeNext = false

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i]

      if (fallbackEscapeNext) {
        fallbackEscapeNext = false
        continue
      }

      if (char === '\\') {
        fallbackEscapeNext = true
        continue
      }

      if (char === '"' || char === "'") {
        fallbackInString = !fallbackInString
        continue
      }

      if (!fallbackInString) {
        if (char === '{') {
          fallbackBraceCount++
        } else if (char === '}') {
          fallbackBraceCount--
          // If we've closed all braces and we're past the opening brace, this is likely our JSON
          if (fallbackBraceCount === 0 && i > startIndex) {
            fallbackEnd = i
            break
          }
        }
      }
    }

    if (fallbackEnd > startIndex) {
      return content.substring(startIndex, fallbackEnd + 1)
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
