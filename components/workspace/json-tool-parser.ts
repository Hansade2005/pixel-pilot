/**
 * JSON-based Tool Parser for AI-generated tool calls
 * Replaces XML parsing with reliable JSON parsing similar to specs route
 */

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
   * Parse individual JSON block
   */
  private parseJsonBlock(jsonString: string, startIndex: number): Omit<JsonToolCall, 'id' | 'startTime'> | null {
    try {
      // Preprocess JSON string to handle fenced content before parsing
      const preprocessedJson = this.preprocessJsonForFencedContent(jsonString)
      const parsed = JSON.parse(preprocessedJson)

      if (!parsed.tool || !this.supportedTools.includes(parsed.tool)) {
        return null
      }

      // Build standardized args object
      const args: Record<string, any> = { ...parsed }
      delete args.tool // Remove tool from args since it's a separate field

      // Extract fenced content for write_file operations
      let content = parsed.content || args.content
      if (parsed.tool === 'write_file' && content && typeof content === 'string') {
        content = this.extractFencedContent(content)
      }

      return {
        tool: parsed.tool,
        name: parsed.tool, // For compatibility
        path: parsed.path || args.file || args.filename,
        content: content,
        operation: parsed.operation,
        search: parsed.search,
        replace: parsed.replace,
        args,
        status: 'detected' as const
      }

    } catch (error) {
      console.error('[JsonToolParser] JSON parsing failed:', error)
      return null
    }
  }

  /**
   * Extract fenced content from write_file operations
   * Handles content wrapped in <<<CONTENT>>> and <<<END>>> markers
   */
  private extractFencedContent(content: string): string {
    if (!content || typeof content !== 'string') {
      return content
    }

    // Check if content uses the fenced format
    const fenceStart = '<<<CONTENT>>>'
    const fenceEnd = '<<<END>>>'

    const startIndex = content.indexOf(fenceStart)
    const endIndex = content.indexOf(fenceEnd)

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      // Extract content between fences
      const fencedContent = content.substring(
        startIndex + fenceStart.length,
        endIndex
      )
      return fencedContent.trim()
    }

    // If no fences found, return content as-is (backward compatibility)
    return content
  }

  /**
   * Preprocess JSON string to handle fenced content before parsing
   * This prevents JSON parsing errors from unescaped control characters in fenced content
   */
  private preprocessJsonForFencedContent(jsonString: string): string {
    // Check if the JSON contains fenced content markers
    if (!jsonString.includes('<<<CONTENT>>>') || !jsonString.includes('<<<END>>>')) {
      return jsonString; // No fenced content, return as-is
    }

    // Find the content field and replace fenced content with escaped version
    // Use a more robust approach that doesn't rely on complex regex for quoted strings

    const fenceStart = '<<<CONTENT>>>'
    const fenceEnd = '<<<END>>>'

    // Find the start of the content field
    const contentFieldStart = jsonString.indexOf('"content":')
    if (contentFieldStart === -1) {
      return jsonString
    }

    // Find the opening quote of the content value
    const contentValueStart = jsonString.indexOf('"', contentFieldStart + 10) // Skip "content":
    if (contentValueStart === -1) {
      return jsonString
    }

    // Now find the fenced content within this content value
    const fencedStart = jsonString.indexOf(fenceStart, contentValueStart)
    const fencedEnd = jsonString.indexOf(fenceEnd, fencedStart)

    if (fencedStart === -1 || fencedEnd === -1 || fencedEnd <= fencedStart) {
      return jsonString
    }

    // Extract the fenced content
    const fencedContent = jsonString.substring(
      fencedStart + fenceStart.length,
      fencedEnd
    ).trim()

    // Escape the fenced content for JSON
    const escapedContent = fencedContent
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/"/g, '\\"')    // Escape quotes
      .replace(/\n/g, '\\n')   // Escape newlines
      .replace(/\r/g, '\\r')   // Escape carriage returns
      .replace(/\t/g, '\\t')   // Escape tabs
      .replace(/\f/g, '\\f')   // Escape form feeds
      .replace(/\x08/g, '\\b') // Escape backspaces (use \x08 for actual backspace char)

    // Replace the entire fenced content block with the escaped content
    const beforeFenced = jsonString.substring(0, fencedStart)
    const afterFenced = jsonString.substring(fencedEnd + fenceEnd.length)

    const processedJson = beforeFenced + escapedContent + afterFenced

    return processedJson
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

  /**
   * Generate unique ID for tool call
   */
  private generateId(): string {
    return `json_tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const jsonToolParser = new JsonToolParser()

// Export utility function
export function parseJsonTools(content: string): JsonToolCall[] {
  const result = jsonToolParser.parseJsonTools(content)
  return result.tools
}