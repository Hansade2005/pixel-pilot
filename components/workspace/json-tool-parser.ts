/**
 * Production-Ready YAML Tool Parser
 * Handles YAML tool calls from AI output
 */

import { load } from 'js-yaml'

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
 * Parse YAML tool calls with error recovery
 */
export class YamlToolParser {
  private supportedTools = [
    'write_file', 'edit_file', 'delete_file',
    'read_file', 'list_files', 'create_directory',
    'pilotwrite', 'pilotedit', 'pilotdelete'
  ]

  /**
   * Main parsing method with comprehensive error handling
   */
  public parseJsonTools(content: string): JsonParseResult {
    const tools: JsonToolCall[] = []
    const errors: Array<{ message: string; context: string }> = []
    let processedContent = content

    try {
      const yamlBlocks = this.findYamlToolBlocks(content)

      for (const block of yamlBlocks) {
        try {
          const parsedTool = this.parseYamlBlock(block.yaml)
          if (parsedTool) {
            const validation = this.validateToolCall(parsedTool)
            if (validation.valid) {
              tools.push({
                ...parsedTool,
                id: this.generateId(),
                startTime: Date.now()
              })

              const placeholder = this.createPlaceholder(parsedTool)
              processedContent = processedContent.replace(block.yaml, placeholder)
            } else {
              errors.push({
                message: `Invalid tool call: ${validation.reason}`,
                context: this.truncateContext(block.yaml)
              })
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push({
            message: `Failed to parse YAML block: ${errorMessage}`,
            context: this.truncateContext(block.yaml)
          })
          console.error('[YamlToolParser] Failed to parse YAML block:', error)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push({
        message: `Critical parsing error: ${errorMessage}`,
        context: this.truncateContext(content)
      })
      console.error('[YamlToolParser] Critical parsing error:', error)
    }

    return { tools, processedContent, errors }
  }

  /**
   * Find YAML tool blocks in content - more lenient parsing
   */
  private findYamlToolBlocks(content: string): Array<{ yaml: string; startIndex: number }> {
    const blocks: Array<{ yaml: string; startIndex: number }> = []
    const yamlBlockPattern = /```(?:yaml|tool)\s*([\s\S]*?)```/g

    let match
    while ((match = yamlBlockPattern.exec(content)) !== null) {
      const yamlContent = match[1].trim()
      if (yamlContent) {
        // Try lenient parsing first
        const toolInfo = this.parseYamlLeniently(yamlContent)
        if (toolInfo && this.supportedTools.includes(toolInfo.tool)) {
          blocks.push({
            yaml: match[0],
            startIndex: match.index
          })
        } else {
          // Fallback: try strict parsing
          try {
            const parsed = load(yamlContent) as any
            if (parsed && parsed.tool && this.supportedTools.includes(parsed.tool)) {
              blocks.push({
                yaml: match[0],
                startIndex: match.index
              })
            }
          } catch (error) {
            // Invalid YAML, skip
            console.warn('[YamlToolParser] Invalid YAML block:', error)
          }
        }
      }
    }

    return blocks
  }

  /**
   * Parse YAML leniently to handle minor formatting issues
   */
  private parseYamlLeniently(yamlContent: string): { tool: string; path?: string; content?: string } | null {
    try {
      // First try normal parsing
      const parsed = load(yamlContent) as any
      if (parsed && parsed.tool) {
        return {
          tool: parsed.tool,
          path: parsed.path,
          content: parsed.content
        }
      }
    } catch (error) {
      // If normal parsing fails, try to extract basic info with regex
      console.warn('[YamlToolParser] Normal parsing failed, trying lenient parsing:', error)

      const lines = yamlContent.split('\n')
      let tool: string | undefined
      let path: string | undefined
      let content: string | undefined

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('tool:')) {
          tool = trimmed.substring(5).trim().replace(/^["']|["']$/g, '')
        } else if (trimmed.startsWith('path:')) {
          path = trimmed.substring(5).trim().replace(/^["']|["']$/g, '')
        } else if (trimmed.startsWith('content:') && trimmed.includes('|')) {
          // Extract content after |
          const contentStart = yamlContent.indexOf('content: |')
          if (contentStart !== -1) {
            content = yamlContent.substring(contentStart + 10).trim()
            if (content.startsWith('|')) {
              content = content.substring(1).trim()
            }
            break // Stop parsing after content
          }
        }
      }

      if (tool && this.supportedTools.includes(tool)) {
        return { tool, path, content }
      }
    }

    return null
  }

  /**
   * Parse a single YAML block
   */
  private parseYamlBlock(yamlBlock: string): JsonToolCall | null {
    try {
      // Extract the YAML content from the code block
      const yamlMatch = yamlBlock.match(/```(?:yaml|tool)\s*([\s\S]*?)```/)
      if (!yamlMatch) return null

      const yamlContent = yamlMatch[1].trim()

      // Try strict parsing first
      let parsed = load(yamlContent) as any

      // If strict parsing fails, try lenient parsing
      if (!parsed || !parsed.tool) {
        const lenientResult = this.parseYamlLeniently(yamlContent)
        if (lenientResult) {
          parsed = lenientResult
        } else {
          return null
        }
      }

      // Convert to JsonToolCall format
      const toolCall: Partial<JsonToolCall> = {
        tool: parsed.tool,
        name: parsed.tool,
        args: {},
        status: 'detected'
      }

      // Copy known fields
      if (parsed.path) toolCall.path = parsed.path
      if (parsed.content) toolCall.content = parsed.content
      if (parsed.operation) toolCall.operation = parsed.operation
      if (parsed.search) toolCall.search = parsed.search
      if (parsed.replace) toolCall.replace = parsed.replace
      if (parsed.searchReplaceBlocks) toolCall.searchReplaceBlocks = parsed.searchReplaceBlocks
      if (parsed.replaceAll !== undefined) toolCall.replaceAll = parsed.replaceAll
      if (parsed.occurrenceIndex !== undefined) toolCall.occurrenceIndex = parsed.occurrenceIndex
      if (parsed.validateAfter) toolCall.validateAfter = parsed.validateAfter
      if (parsed.dryRun !== undefined) toolCall.dryRun = parsed.dryRun
      if (parsed.rollbackOnFailure !== undefined) toolCall.rollbackOnFailure = parsed.rollbackOnFailure

      // Put any extra fields in args
      for (const [key, value] of Object.entries(parsed)) {
        if (!['tool', 'path', 'content', 'operation', 'search', 'replace', 'searchReplaceBlocks', 'replaceAll', 'occurrenceIndex', 'validateAfter', 'dryRun', 'rollbackOnFailure'].includes(key)) {
          toolCall.args![key] = value
        }
      }

      return toolCall as JsonToolCall
    } catch (error) {
      console.error('[YamlToolParser] Failed to parse YAML:', error)
      return null
    }
  }

  /**
   * Validate a tool call
   */
  private validateToolCall(toolCall: Partial<JsonToolCall>): { valid: boolean; reason?: string } {
    if (!toolCall.tool || !this.supportedTools.includes(toolCall.tool)) {
      return { valid: false, reason: `Unsupported tool: ${toolCall.tool}` }
    }

    // Add more validation as needed
    return { valid: true }
  }

  /**
   * Create a placeholder for processed content
   */
  private createPlaceholder(toolCall: JsonToolCall): string {
    return `[Tool executed: ${toolCall.tool}]`
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Truncate context for error messages
   */
  private truncateContext(content: string): string {
    return content.length > 100 ? content.substring(0, 100) + '...' : content
  }

  /**
   * Check if content has YAML tools
   */
  public hasYamlTools(content: string): boolean {
    return this.findYamlToolBlocks(content).length > 0
  }

  /**
   * Parse and validate a single YAML tool
   */
  public parseAndValidateSingle(yamlString: string): JsonToolCall | null {
    const result = this.parseJsonTools(yamlString)
    return result.tools.length > 0 ? result.tools[0] : null
  }
}

// Export singleton instance
export const jsonToolParser = new YamlToolParser()

// Export utility functions
export function parseJsonTools(content: string): JsonToolCall[] {
  const result = jsonToolParser.parseJsonTools(content)
  return result.tools
}

export function parseAndValidateJsonTool(jsonString: string): JsonToolCall | null {
  return jsonToolParser.parseAndValidateSingle(jsonString)
}

export function hasJsonTools(content: string): boolean {
  return jsonToolParser.hasYamlTools(content)
}
