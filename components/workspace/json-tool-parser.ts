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

  public parseJsonTools(content: string): JsonParseResult {
    const tools: JsonToolCall[] = []
    let processedContent = content

    // Step 1: Extract JSON objects from code blocks (more reliable)
    const codeBlockMatches = this.extractFromCodeBlocks(content)
    for (const { json, startIndex } of codeBlockMatches) {
      const parsed = this.safeParseTool(json, startIndex)
      if (parsed) {
        const placeholder = this.makePlaceholder(parsed)
        processedContent = this.replaceFirstOccurrence(processedContent, json, placeholder)
        tools.push({
          ...parsed,
          id: this.generateId(),
          startTime: Date.now()
        })
      }
    }

    // Step 2: Extract inline JSON objects (heuristic-based)
    const inlineMatches = this.extractInlineJsonObjects(content)
    for (const { json, startIndex } of inlineMatches) {
      // Skip if already processed (e.g., part of a code block)
      if (tools.some(t => t.args?.tool === JSON.parse(json).tool && t.path === JSON.parse(json).path)) {
        continue
      }
      const parsed = this.safeParseTool(json, startIndex)
      if (parsed) {
        const placeholder = this.makePlaceholder(parsed)
        processedContent = this.replaceFirstOccurrence(processedContent, json, placeholder)
        tools.push({
          ...parsed,
          id: this.generateId(),
          startTime: Date.now()
        })
      }
    }

    return { tools, processedContent }
  }

  private makePlaceholder(tool: Omit<JsonToolCall, 'id' | 'startTime'>): string {
    const path = tool.path || tool.args?.path || tool.args?.file || tool.args?.filename || 'unknown'
    return `[${tool.tool.toUpperCase()}: ${path}]`
  }

  private replaceFirstOccurrence(str: string, search: string, replace: string): string {
    const index = str.indexOf(search)
    if (index === -1) return str
    return str.substring(0, index) + replace + str.substring(index + search.length)
  }

  /**
   * Safely parse a JSON string into a tool call
   */
  private safeParseTool(jsonString: string, startIndex: number): Omit<JsonToolCall, 'id' | 'startTime'> | null {
    try {
      const parsed = JSON.parse(jsonString)
      if (!parsed.tool || !this.supportedTools.includes(parsed.tool)) {
        return null
      }

      const args = { ...parsed }
      delete args.tool

      return {
        tool: parsed.tool,
        name: parsed.tool,
        path: parsed.path || args.file || args.filename,
        content: parsed.content,
        operation: parsed.operation,
        search: parsed.search,
        replace: parsed.replace,
        args,
        status: 'detected'
      }
    } catch (error) {
      console.warn('[JsonToolParser] Failed to parse candidate JSON:', error, jsonString)
      return null
    }
  }

  /**
   * Extract JSON from ```json ... ``` or ``` ... ``` code blocks
   */
  private extractFromCodeBlocks(content: string): Array<{ json: string; startIndex: number }> {
    const results: Array<{ json: string; startIndex: number }> = []
    const codeBlockRegex = /```(?:json)?\s*({[\s\S]*?})\s*```/gi
    let match
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const jsonStr = match[1].trim()
      // Validate it's real JSON before accepting
      try {
        const obj = JSON.parse(jsonStr)
        if (obj.tool && this.supportedTools.includes(obj.tool)) {
          results.push({ json: jsonStr, startIndex: match.index })
        }
      } catch {
        // Ignore invalid JSON in code blocks
      }
    }
    return results
  }

  /**
   * Extract inline JSON objects using a state machine (robust to nested strings)
   */
  private extractInlineJsonObjects(content: string): Array<{ json: string; startIndex: number }> {
    const results: Array<{ json: string; startIndex: number }> = []
    let i = 0

    while (i < content.length) {
      // Look for opening brace
      if (content[i] === '{') {
        const start = i
        let depth = 0
        let inString = false
        let escapeNext = false

        while (i < content.length) {
          const char = content[i]

          if (escapeNext) {
            escapeNext = false
            i++
            continue
          }

          if (char === '\\') {
            escapeNext = true
            i++
            continue
          }

          if (char === '"' || char === "'") {
            if (!inString) {
              inString = true
            } else {
              inString = false
            }
            i++
            continue
          }

          if (!inString) {
            if (char === '{') depth++
            else if (char === '}') {
              depth--
              if (depth === 0) {
                const candidate = content.substring(start, i + 1)
                // Heuristic: must contain "tool": "..." with supported tool
                if (this.mightBeToolJson(candidate)) {
                  results.push({ json: candidate, startIndex: start })
                }
                break
              }
            }
          }

          i++
        }
        // If we broke due to depth=0, continue from next char
        if (depth === 0) {
          i++ // move past closing }
        } else {
          // Malformed, reset
          i = start + 1
        }
      } else {
        i++
      }
    }

    return results
  }

  /**
   * Quick heuristic to avoid parsing every `{...}` as JSON
   */
  private mightBeToolJson(jsonStr: string): boolean {
    // Must contain "tool": "some_supported_tool"
    const toolMatch = jsonStr.match(/["']tool["']\s*:\s*["']([^"']+)["']/)
    if (!toolMatch) return false
    return this.supportedTools.includes(toolMatch[1])
  }

  private generateId(): string {
    return `json_tool_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  public hasJsonTools(content: string): boolean {
    const pattern = this.supportedTools.map(t => `["']tool["']\\s*:\\s*["']${t}["']`).join('|')
    const regex = new RegExp(`\\{[^{}]*?(?:${pattern})`, 'i')
    return regex.test(content)
  }

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