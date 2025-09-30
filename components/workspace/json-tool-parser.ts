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
      const toolBlocks = this.findToolBlocks(content)

      for (const block of toolBlocks) {
        try {
          const parsedTool = this.parseToolBlock(block.content, block.format)
          if (parsedTool) {
            const validation = this.validateToolCall(parsedTool)
            if (validation.valid) {
              tools.push({
                ...parsedTool,
                id: this.generateId(),
                startTime: Date.now()
              })

              const placeholder = this.createPlaceholder(parsedTool)
              processedContent = processedContent.replace(block.content, placeholder)
            } else {
              errors.push({
                message: `Invalid tool call: ${validation.reason}`,
                context: this.truncateContext(block.content)
              })
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push({
            message: `Failed to parse ${block.format.toUpperCase()} block: ${errorMessage}`,
            context: this.truncateContext(block.content)
          })
          console.error(`[YamlToolParser] Failed to parse ${block.format.toUpperCase()} block:`, error)
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
   * Find tool blocks in content (supports both JSON and YAML)
   */
  private findToolBlocks(content: string): Array<{ content: string; startIndex: number; format: 'json' | 'yaml' }> {
    const blocks: Array<{ content: string; startIndex: number; format: 'json' | 'yaml' }> = []
    const toolBlockPattern = /```(?:json|yaml|tool)\s*([\s\S]*?)```/g

    let match
    while ((match = toolBlockPattern.exec(content)) !== null) {
      const blockContent = match[1].trim()
      if (blockContent) {
        // Determine format based on the opening tag
        const fullMatch = match[0]
        let format: 'json' | 'yaml' = 'yaml'
        if (fullMatch.startsWith('```json')) {
          format = 'json'
        } else if (fullMatch.startsWith('```yaml') || fullMatch.startsWith('```tool')) {
          format = 'yaml'
        }

        try {
          // Try to parse to validate it's a valid tool block
          let parsed: any
          if (format === 'json') {
            parsed = JSON.parse(blockContent)
          } else {
            parsed = load(blockContent) as any
          }

          if (parsed && parsed.tool && this.supportedTools.includes(parsed.tool)) {
            blocks.push({
              content: fullMatch,
              startIndex: match.index,
              format
            })
          }
        } catch (error) {
          // Invalid format, skip
          console.warn('[YamlToolParser] Invalid tool block:', error)
        }
      }
    }

    return blocks
  }

  /**
   * Parse a single tool block (supports both JSON and YAML)
   */
  private parseToolBlock(toolBlock: string, format: 'json' | 'yaml'): JsonToolCall | null {
    try {
      // Extract the content from the code block
      const contentMatch = toolBlock.match(/```(?:json|yaml|tool)\s*([\s\S]*?)```/)
      if (!contentMatch) return null

      const blockContent = contentMatch[1].trim()
      let parsed: any

      // Parse based on format
      if (format === 'json') {
        parsed = JSON.parse(blockContent)
      } else {
        parsed = load(blockContent) as any
      }

      if (!parsed || !parsed.tool) return null

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
      console.error(`[YamlToolParser] Failed to parse ${format.toUpperCase()}:`, error)
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
   * Check if content has tool blocks (supports both JSON and YAML)
   */
  public hasToolBlocks(content: string): boolean {
    return this.findToolBlocks(content).length > 0
  }

  /**
   * Parse and validate a single tool block
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
  return jsonToolParser.hasToolBlocks(content)
}
