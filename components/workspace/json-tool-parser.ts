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
    'pilotwrite', 'pilotedit', 'pilotdelete',
    'execute_sql'
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
   * Find JSON tool blocks in content with enhanced pattern matching
   * Looks for patterns like: {"tool": "write_file", ...}
   */
  private findJsonToolBlocks(content: string): Array<{ json: string; startIndex: number }> {
    const blocks: Array<{ json: string; startIndex: number }> = []

    // Multiple patterns to catch various JSON formats
    const patterns = [
      // Standard JSON: {"tool": "write_file", ...}
      /\{\s*["\']tool["\']\s*:\s*["\']([^"\']+)["\']\s*[,}][\s\S]*?\}/g,

      // Malformed JSON with missing quotes: {tool: "write_file", ...}
      /\{\s*tool\s*:\s*["\']([^"\']+)["\']\s*[,}][\s\S]*?\}/g,

      // JSON with unquoted property names: {"tool": "write_file", path: "...", ...}
      /\{\s*["\']?tool["\']?\s*:\s*["\']([^"\']+)["\']\s*,[\s\S]*?\}/g,

      // Very malformed: {tool:"write_file",content:"...",...}
      /\{\s*tool\s*:\s*["\']([^"\']+)["\']\s*,[\s\S]*?\}/g
    ]

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
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
    }

    // Also look for code blocks containing JSON
    const codeBlockPattern = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g
    let match
    while ((match = codeBlockPattern.exec(content)) !== null) {
      try {
        const jsonContent = match[1]
        // Try to parse directly first
        let parsed = JSON.parse(jsonContent)
        if (parsed.tool && this.supportedTools.includes(parsed.tool)) {
          blocks.push({
            json: jsonContent,
            startIndex: match.index
          })
        }
      } catch (error) {
        // If direct parsing fails, try repair
        console.warn('[JsonToolParser] Code block JSON parsing failed, attempting repair')
        const repairedJson = this.repairJson(match[1])
        if (repairedJson) {
          try {
            const parsed = JSON.parse(repairedJson)
            if (parsed.tool && this.supportedTools.includes(parsed.tool)) {
              blocks.push({
                json: repairedJson,
                startIndex: match.index
              })
            }
          } catch (repairError) {
            console.error('[JsonToolParser] Code block JSON repair failed:', repairError)
          }
        }
      }
    }

    // Remove duplicates based on startIndex
    const uniqueBlocks = blocks.filter((block, index, self) =>
      index === self.findIndex(b => b.startIndex === block.startIndex)
    )

    return uniqueBlocks
  }

  /**
   * Extract complete JSON object from content starting at index with enhanced error handling
   */
  private extractCompleteJson(content: string, startIndex: number): string | null {
    let braceCount = 0
    let inString = false
    let escapeNext = false
    let jsonEnd = -1
    let inMultilineString = false

    // Find the actual start of the JSON object
    let actualStart = startIndex
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') {
        actualStart = i
        break
      }
      // Skip whitespace and potential malformed prefixes
      if (!/\s/.test(content[i])) {
        break
      }
    }

    for (let i = actualStart; i < content.length; i++) {
      const char = content[i]

      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (char === '\\') {
        escapeNext = true
        continue
      }

      // Handle string literals
      if (char === '"' || char === "'") {
        if (!inString) {
          inString = true
        } else if (!escapeNext) {
          inString = false
        }
        continue
      }

      // Only process structural characters when not in a string
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

    if (jsonEnd > actualStart) {
      const jsonString = content.substring(actualStart, jsonEnd + 1)

      // Validate that we have a reasonable JSON structure
      const openBraces = (jsonString.match(/\{/g) || []).length
      const closeBraces = (jsonString.match(/\}/g) || []).length

      if (openBraces === closeBraces && openBraces > 0) {
        return jsonString
      }
    }

    return null
  }

  /**
   * Repair common JSON syntax errors with enhanced robustness
   */
  private repairJson(jsonString: string): string | null {
    try {
      let repaired = jsonString.trim()

      // Fix 0: Handle malformed opening quotes (like "{ instead of {)
      if (repaired.startsWith('"{') && repaired.endsWith('}"')) {
        repaired = repaired.slice(1, -1) // Remove outer quotes
      }

      // Fix 1: Add missing quotes around unquoted property names at start of object
      // Match patterns like: tool: "write_file" -> "tool": "write_file"
      repaired = repaired.replace(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm, '"$1":')

      // Fix 2: Add missing quotes around unquoted property names after commas
      repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')

      // Fix 3: Add missing quotes around unquoted string values
      // Match patterns like: "path": src/file.js -> "path": "src/file.js"
      // But be careful not to quote already quoted strings or numbers/booleans
      repaired = repaired.replace(/:\s*([a-zA-Z_][a-zA-Z0-9_\/\-\.]+)(\s*[,}])/g, (match, value, end) => {
        // Don't quote if it's already quoted, a number, boolean, or null
        if (value.startsWith('"') || value.startsWith("'") ||
            /^-?\d+(\.\d+)?$/.test(value) ||
            value === 'true' || value === 'false' || value === 'null') {
          return match
        }
        return `: "${value}"${end}`
      })

      // Fix 4: Handle multiline content fields by properly escaping
      // Look for content fields that span multiple lines
      const contentMatch = repaired.match(/"content"\s*:\s*"([\s\S]*?)"(\s*[,}])/);
      if (contentMatch) {
        const contentValue = contentMatch[1];
        // If content contains unescaped quotes or newlines, we need to handle it carefully
        if (contentValue.includes('"') && !contentValue.includes('\\"')) {
          // Replace unescaped quotes with escaped ones
          const escapedContent = contentValue.replace(/"/g, '\\"');
          repaired = repaired.replace(contentMatch[0], `"content": "${escapedContent}"${contentMatch[2]}`);
        }
      }

      // Fix 5: Remove trailing commas before closing braces/brackets
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1')

      // Fix 6: Ensure proper quote consistency (convert single quotes to double)
      repaired = repaired.replace(/'/g, '"')

      // Fix 7: Handle incomplete JSON by ensuring it ends properly
      if (!repaired.trim().endsWith('}')) {
        // Try to find where the JSON should end
        const lastBrace = repaired.lastIndexOf('}');
        if (lastBrace > 0) {
          repaired = repaired.substring(0, lastBrace + 1);
        }
      }

      console.log('[JsonToolParser] Repaired JSON:', repaired)
      return repaired

    } catch (error) {
      console.error('[JsonToolParser] JSON repair failed:', error)
      return null
    }
  }

  /**
   * Parse individual JSON block
   */
  private parseJsonBlock(jsonString: string, startIndex: number): Omit<JsonToolCall, 'id' | 'startTime'> | null {
    try {
      // First try to parse as-is
      let parsed = JSON.parse(jsonString)

      if (!parsed.tool || !this.supportedTools.includes(parsed.tool)) {
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
      // If parsing fails, try to repair the JSON
      console.warn('[JsonToolParser] JSON parsing failed, attempting repair:', error)

      try {
        const repairedJson = this.repairJson(jsonString)
        if (repairedJson) {
          const parsed = JSON.parse(repairedJson)

          if (!parsed.tool || !this.supportedTools.includes(parsed.tool)) {
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
        }
      } catch (repairError) {
        console.error('[JsonToolParser] JSON repair also failed:', repairError)
      }

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