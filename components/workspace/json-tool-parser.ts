/**
 * Enhanced JSON-based Tool Parser for AI-generated tool calls
 * Improved reliability and accuracy for parsing tool calls from AI responses
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
  errors: Array<{ message: string; context: string }>
}

/**
 * Parse JSON tool calls from AI streaming content with enhanced reliability
 */
export class JsonToolParser {
  private supportedTools = [
    'write_file', 'edit_file', 'delete_file',
    'read_file', 'list_files', 'create_directory',
    'pilotwrite', 'pilotedit', 'pilotdelete'
  ]

  /**
   * Extract and parse JSON tool calls from content with improved error handling
   */
  public parseJsonTools(content: string): JsonParseResult {
    const tools: JsonToolCall[] = []
    const errors: Array<{ message: string; context: string }> = []
    let processedContent = content

    try {
      // Find JSON tool patterns in the content
      const toolMatches = this.findJsonToolBlocks(content)

      for (const match of toolMatches) {
        try {
          const parsedTool = this.parseJsonBlock(match.json, match.startIndex)
          if (parsedTool) {
            // Validate the parsed tool before adding
            const validation = this.validateToolCall(parsedTool)
            if (validation.valid) {
              tools.push({
                ...parsedTool,
                id: this.generateId(),
                startTime: Date.now()
              })

              // Replace JSON block with placeholder in processed content
              const placeholder = this.createPlaceholder(parsedTool)
              processedContent = processedContent.replace(match.json, placeholder)
            } else {
              errors.push({
                message: `Invalid tool call: ${validation.reason}`,
                context: match.json.substring(0, 100)
              })
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push({
            message: `Failed to parse JSON block: ${errorMessage}`,
            context: match.json.substring(0, 100)
          })
          console.error('[JsonToolParser] Failed to parse JSON block:', error, match.json.substring(0, 200))
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push({
        message: `Critical parsing error: ${errorMessage}`,
        context: content.substring(0, 100)
      })
      console.error('[JsonToolParser] Critical parsing error:', error)
    }

    return { tools, processedContent, errors }
  }

  /**
   * Find JSON tool blocks in content with improved detection
   */
  private findJsonToolBlocks(content: string): Array<{ json: string; startIndex: number }> {
    const blocks: Array<{ json: string; startIndex: number }> = []
    const foundIndices = new Set<number>()

    // Method 1: Find standalone JSON objects with "tool" property
    this.findStandaloneJsonBlocks(content, blocks, foundIndices)

    // Method 2: Find JSON in code blocks (```json or ```)
    this.findCodeBlockJsonBlocks(content, blocks, foundIndices)

    // Method 3: Find JSON objects on single lines
    this.findSingleLineJsonBlocks(content, blocks, foundIndices)

    // Sort blocks by index and remove duplicates
    return blocks
      .sort((a, b) => a.startIndex - b.startIndex)
      .filter((block, index, self) => 
        index === 0 || block.startIndex !== self[index - 1].startIndex
      )
  }

  /**
   * Find standalone JSON blocks with proper brace matching
   */
  private findStandaloneJsonBlocks(
    content: string, 
    blocks: Array<{ json: string; startIndex: number }>,
    foundIndices: Set<number>
  ): void {
    const toolPattern = this.supportedTools.join('|')
    const jsonToolPattern = new RegExp(
      `\\{\\s*["']tool["']\\s*:\\s*["'](${toolPattern})["']`,
      'gi'
    )
    
    let match
    while ((match = jsonToolPattern.exec(content)) !== null) {
      if (foundIndices.has(match.index)) continue

      const completeJson = this.extractCompleteJson(content, match.index)
      if (completeJson) {
        // Verify it's valid JSON
        try {
          JSON.parse(completeJson)
          blocks.push({
            json: completeJson,
            startIndex: match.index
          })
          foundIndices.add(match.index)
        } catch (e) {
          // Invalid JSON, skip
          console.warn('[JsonToolParser] Found invalid JSON at index', match.index)
        }
      }
    }
  }

  /**
   * Find JSON blocks within code blocks
   */
  private findCodeBlockJsonBlocks(
    content: string,
    blocks: Array<{ json: string; startIndex: number }>,
    foundIndices: Set<number>
  ): void {
    // Match both ```json and ``` code blocks
    const codeBlockPattern = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g
    
    let match
    while ((match = codeBlockPattern.exec(content)) !== null) {
      if (foundIndices.has(match.index)) continue

      try {
        const jsonContent = match[1].trim()
        const parsed = JSON.parse(jsonContent)
        
        if (parsed.tool && this.supportedTools.includes(parsed.tool)) {
          blocks.push({
            json: jsonContent,
            startIndex: match.index
          })
          foundIndices.add(match.index)
        }
      } catch (error) {
        // Try to extract valid JSON from the code block
        const extracted = this.tryExtractValidJson(match[1])
        if (extracted) {
          try {
            const parsed = JSON.parse(extracted)
            if (parsed.tool && this.supportedTools.includes(parsed.tool)) {
              blocks.push({
                json: extracted,
                startIndex: match.index
              })
              foundIndices.add(match.index)
            }
          } catch (e) {
            // Still invalid, skip
          }
        }
      }
    }
  }

  /**
   * Find single-line JSON blocks
   */
  private findSingleLineJsonBlocks(
    content: string,
    blocks: Array<{ json: string; startIndex: number }>,
    foundIndices: Set<number>
  ): void {
    const lines = content.split('\n')
    let currentIndex = 0

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmedLine)
          if (parsed.tool && this.supportedTools.includes(parsed.tool)) {
            const lineIndex = content.indexOf(line, currentIndex)
            if (!foundIndices.has(lineIndex)) {
              blocks.push({
                json: trimmedLine,
                startIndex: lineIndex
              })
              foundIndices.add(lineIndex)
            }
          }
        } catch (e) {
          // Not valid JSON, skip
        }
      }
      currentIndex += line.length + 1 // +1 for newline
    }
  }

  /**
   * Try to extract valid JSON from potentially malformed content
   */
  private tryExtractValidJson(content: string): string | null {
    // Remove common issues
    let cleaned = content.trim()
    
    // Remove trailing commas
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')
    
    // Try to find the outermost braces
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const extracted = cleaned.substring(firstBrace, lastBrace + 1)
      try {
        JSON.parse(extracted)
        return extracted
      } catch (e) {
        return null
      }
    }
    
    return null
  }

  /**
   * Extract complete JSON object with improved brace matching
   */
  private extractCompleteJson(content: string, startIndex: number): string | null {
    let braceCount = 0
    let inString = false
    let escapeNext = false
    let stringChar = ''
    let jsonEnd = -1
    let started = false

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i]

      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (char === '\\' && inString) {
        escapeNext = true
        continue
      }

      if ((char === '"' || char === "'") && !inString) {
        inString = true
        stringChar = char
        continue
      }

      if (char === stringChar && inString) {
        inString = false
        stringChar = ''
        continue
      }

      if (!inString) {
        if (char === '{') {
          braceCount++
          started = true
        } else if (char === '}') {
          braceCount--
          if (started && braceCount === 0) {
            jsonEnd = i
            break
          }
        }
      }
    }

    if (jsonEnd > startIndex) {
      const extracted = content.substring(startIndex, jsonEnd + 1)
      
      // Final validation
      try {
        JSON.parse(extracted)
        return extracted
      } catch (e) {
        console.warn('[JsonToolParser] Extracted invalid JSON, attempting repair...')
        const repaired = this.tryExtractValidJson(extracted)
        return repaired
      }
    }

    return null
  }

  /**
   * Parse individual JSON block with enhanced error handling
   */
  private parseJsonBlock(jsonString: string, startIndex: number): Omit<JsonToolCall, 'id' | 'startTime'> | null {
    try {
      // Clean the JSON string
      const cleanedJson = jsonString.trim()
      const parsed = JSON.parse(cleanedJson)
      
      if (!parsed.tool) {
        console.warn('[JsonToolParser] Missing "tool" field in JSON')
        return null
      }

      if (!this.supportedTools.includes(parsed.tool)) {
        console.warn('[JsonToolParser] Unsupported tool:', parsed.tool)
        return null
      }

      // Build standardized args object
      const args: Record<string, any> = { ...parsed }
      delete args.tool // Remove tool from args since it's a separate field

      // Extract common fields with fallbacks
      const path = parsed.path || parsed.file || parsed.filename || args.path
      const content = parsed.content || args.content

      // Handle search/replace blocks
      const searchReplaceBlocks = parsed.searchReplaceBlocks || 
                                  parsed.search_replace_blocks ||
                                  parsed.blocks

      return {
        tool: parsed.tool,
        name: parsed.name || parsed.tool,
        path,
        content,
        operation: parsed.operation || args.operation,
        search: parsed.search || args.search,
        replace: parsed.replace || args.replace,
        searchReplaceBlocks,
        replaceAll: parsed.replaceAll ?? args.replaceAll ?? false,
        occurrenceIndex: parsed.occurrenceIndex ?? args.occurrenceIndex,
        validateAfter: parsed.validateAfter || args.validateAfter,
        dryRun: parsed.dryRun ?? args.dryRun ?? false,
        rollbackOnFailure: parsed.rollbackOnFailure ?? args.rollbackOnFailure ?? true,
        args,
        status: 'detected' as const
      }

    } catch (error) {
      console.error('[JsonToolParser] JSON parsing failed:', error)
      console.error('[JsonToolParser] Failed JSON string:', jsonString.substring(0, 200))
      return null
    }
  }

  /**
   * Validate parsed tool call
   */
  private validateToolCall(tool: Omit<JsonToolCall, 'id' | 'startTime'>): { valid: boolean; reason?: string } {
    // Check tool-specific requirements
    switch (tool.tool) {
      case 'write_file':
      case 'pilotwrite':
        if (!tool.path && !tool.args.path) {
          return { valid: false, reason: 'Missing required field: path' }
        }
        if (tool.content === undefined && tool.args.content === undefined) {
          return { valid: false, reason: 'Missing required field: content' }
        }
        break

      case 'edit_file':
      case 'pilotedit':
        if (!tool.path && !tool.args.path) {
          return { valid: false, reason: 'Missing required field: path' }
        }
        if (!tool.search && !tool.searchReplaceBlocks && !tool.args.search) {
          return { valid: false, reason: 'Missing required field: search or searchReplaceBlocks' }
        }
        break

      case 'delete_file':
      case 'pilotdelete':
        if (!tool.path && !tool.args.path) {
          return { valid: false, reason: 'Missing required field: path' }
        }
        break

      case 'read_file':
        if (!tool.path && !tool.args.path) {
          return { valid: false, reason: 'Missing required field: path' }
        }
        break

      case 'create_directory':
        if (!tool.path && !tool.args.path) {
          return { valid: false, reason: 'Missing required field: path' }
        }
        break
    }

    return { valid: true }
  }

  /**
   * Create placeholder text for processed content
   */
  private createPlaceholder(tool: Omit<JsonToolCall, 'id' | 'startTime'>): string {
    const toolName = tool.tool.toUpperCase()
    const target = tool.path || tool.args.path || 'unknown'
    return `[${toolName}: ${target}]`
  }

  /**
   * Generate unique ID for tool call
   */
  private generateId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 11)
    return `json_tool_${timestamp}_${random}`
  }

  /**
   * Validate if content contains supported JSON tools
   */
  public hasJsonTools(content: string): boolean {
    const toolPattern = this.supportedTools.join('|')
    const jsonToolRegex = new RegExp(`["']tool["']\\s*:\\s*["'](?:${toolPattern})["']`, 'i')
    return jsonToolRegex.test(content)
  }

  /**
   * Get supported tool names
   */
  public getSupportedTools(): string[] {
    return [...this.supportedTools]
  }

  /**
   * Add custom tool to supported tools
   */
  public addSupportedTool(toolName: string): void {
    if (!this.supportedTools.includes(toolName)) {
      this.supportedTools.push(toolName)
    }
  }

  /**
   * Remove tool from supported tools
   */
  public removeSupportedTool(toolName: string): void {
    const index = this.supportedTools.indexOf(toolName)
    if (index > -1) {
      this.supportedTools.splice(index, 1)
    }
  }

  /**
   * Parse and validate a single JSON string
   */
  public parseAndValidateSingle(jsonString: string): JsonToolCall | null {
    try {
      const parsed = this.parseJsonBlock(jsonString, 0)
      if (!parsed) return null

      const validation = this.validateToolCall(parsed)
      if (!validation.valid) {
        console.warn('[JsonToolParser] Validation failed:', validation.reason)
        return null
      }

      return {
        ...parsed,
        id: this.generateId(),
        startTime: Date.now()
      }
    } catch (error) {
      console.error('[JsonToolParser] Failed to parse single JSON:', error)
      return null
    }
  }
}

// Export singleton instance
export const jsonToolParser = new JsonToolParser()

// Export utility functions
export function parseJsonTools(content: string): JsonToolCall[] {
  const result = jsonToolParser.parseJsonTools(content)
  return result.tools
}

export function parseAndValidateJsonTool(jsonString: string): JsonToolCall | null {
  return jsonToolParser.parseAndValidateSingle(jsonString)
}

export function hasJsonTools(content: string): boolean {
  return jsonToolParser.hasJsonTools(content)
}