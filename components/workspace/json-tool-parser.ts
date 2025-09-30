/**
 * Enhanced JSON-based Tool Parser for AI-generated tool calls
 * Handles escaped content and multi-line strings reliably
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
                context: this.truncateContext(match.json)
              })
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push({
            message: `Failed to parse JSON block: ${errorMessage}`,
            context: this.truncateContext(match.json)
          })
          console.error('[JsonToolParser] Failed to parse JSON block:', error)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push({
        message: `Critical parsing error: ${errorMessage}`,
        context: this.truncateContext(content)
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

    // Method 1: Find JSON in code blocks (most reliable for large content)
    this.findCodeBlockJsonBlocks(content, blocks, foundIndices)

    // Method 2: Find standalone JSON objects with "tool" property
    this.findStandaloneJsonBlocks(content, blocks, foundIndices)

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
   * Find JSON blocks within code blocks - MOST RELIABLE METHOD
   */
  private findCodeBlockJsonBlocks(
    content: string,
    blocks: Array<{ json: string; startIndex: number }>,
    foundIndices: Set<number>
  ): void {
    // Match both ```json and ``` code blocks
    const codeBlockPattern = /```(?:json)?\s*([\s\S]*?)```/g
    
    let match
    while ((match = codeBlockPattern.exec(content)) !== null) {
      if (foundIndices.has(match.index)) continue

      try {
        const jsonContent = match[1].trim()
        
        // Skip if empty
        if (!jsonContent) continue
        
        // Try to parse directly first
        let parsed
        try {
          parsed = JSON.parse(jsonContent)
        } catch (firstError) {
          // If direct parse fails, try to extract and clean
          const extracted = this.extractJsonFromCodeBlock(jsonContent)
          if (extracted) {
            try {
              parsed = JSON.parse(extracted)
            } catch (secondError) {
              console.warn('[JsonToolParser] Failed to parse code block JSON:', secondError)
              continue
            }
          } else {
            continue
          }
        }
        
        if (parsed && parsed.tool && this.supportedTools.includes(parsed.tool)) {
          blocks.push({
            json: JSON.stringify(parsed), // Use the successfully parsed version
            startIndex: match.index
          })
          foundIndices.add(match.index)
        }
      } catch (error) {
        console.warn('[JsonToolParser] Error processing code block:', error)
      }
    }
  }

  /**
   * Extract JSON from code block content, handling common issues
   */
  private extractJsonFromCodeBlock(content: string): string | null {
    // Remove comments
    let cleaned = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    
    // Remove trailing commas
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')
    
    // Find the first { and last }
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null
    }
    
    return cleaned.substring(firstBrace, lastBrace + 1)
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
          const parsed = JSON.parse(completeJson)
          blocks.push({
            json: JSON.stringify(parsed), // Use stringified version for consistency
            startIndex: match.index
          })
          foundIndices.add(match.index)
        } catch (e) {
          console.warn('[JsonToolParser] Found invalid standalone JSON at index', match.index)
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
          if (parsed && parsed.tool && this.supportedTools.includes(parsed.tool)) {
            const lineIndex = content.indexOf(line, currentIndex)
            if (!foundIndices.has(lineIndex)) {
              blocks.push({
                json: JSON.stringify(parsed),
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
   * Extract complete JSON object with IMPROVED brace and string handling
   */
  private extractCompleteJson(content: string, startIndex: number): string | null {
    let braceCount = 0
    let inString = false
    let escapeNext = false
    let stringDelimiter = ''
    let jsonEnd = -1
    let started = false

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i]
      const prevChar = i > 0 ? content[i - 1] : ''

      // Handle escape sequences
      if (escapeNext) {
        escapeNext = false
        continue
      }

      // Check for escape character, but only if in string
      if (char === '\\' && inString) {
        escapeNext = true
        continue
      }

      // Handle string delimiters
      if ((char === '"' || char === "'") && !escapeNext) {
        if (!inString) {
          // Starting a string
          inString = true
          stringDelimiter = char
        } else if (char === stringDelimiter) {
          // Ending a string (must match the opening delimiter)
          inString = false
          stringDelimiter = ''
        }
        continue
      }

      // Only count braces outside of strings
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
      
      // Try to parse the extracted JSON
      try {
        const parsed = JSON.parse(extracted)
        return JSON.stringify(parsed) // Return clean stringified version
      } catch (e) {
        console.warn('[JsonToolParser] Extracted JSON failed to parse, attempting repair...')
        // Try to repair common issues
        const repaired = this.repairJson(extracted)
        if (repaired) {
          try {
            const parsed = JSON.parse(repaired)
            return JSON.stringify(parsed)
          } catch (e2) {
            console.warn('[JsonToolParser] Repair failed')
            return null
          }
        }
        return null
      }
    }

    return null
  }

  /**
   * Attempt to repair common JSON issues
   */
  private repairJson(jsonString: string): string | null {
    try {
      let repaired = jsonString.trim()
      
      // Remove trailing commas before closing braces/brackets
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1')
      
      // Remove comments (single line and multi-line)
      repaired = repaired.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
      
      // Try to find and extract just the JSON object
      const firstBrace = repaired.indexOf('{')
      const lastBrace = repaired.lastIndexOf('}')
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        repaired = repaired.substring(firstBrace, lastBrace + 1)
      }
      
      // Remove any garbage after the last closing brace
      const finalCloseBrace = repaired.lastIndexOf('}')
      if (finalCloseBrace !== -1 && finalCloseBrace < repaired.length - 1) {
        repaired = repaired.substring(0, finalCloseBrace + 1)
      }
      
      return repaired
    } catch (error) {
      return null
    }
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

      // IMPORTANT: Content should already be properly unescaped by JSON.parse()
      // JSON.parse() automatically converts "\\n" to "\n", "\\"" to "\"", etc.

      // Handle search/replace blocks
      const searchReplaceBlocks = parsed.searchReplaceBlocks || 
                                  parsed.search_replace_blocks ||
                                  parsed.blocks

      return {
        tool: parsed.tool,
        name: parsed.name || parsed.tool,
        path,
        content, // This is already properly unescaped
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
      console.error('[JsonToolParser] Failed JSON string (first 500 chars):', jsonString.substring(0, 500))
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
   * Truncate context for error messages
   */
  private truncateContext(text: string, maxLength: number = 200): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
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