/**
 * Advanced XML Parser for AI-generated XML tools
 * Uses xml-js library for reliable parsing of custom XML tags
 */

import { xml2js, Element, ElementCompact } from 'xml-js'

export interface ParsedXMLTool {
  id: string
  name: string
  command: string
  path?: string
  content?: string
  args: Record<string, any>
  rawXml: string
  startTime: number
}

export interface XMLParseResult {
  tools: ParsedXMLTool[]
  processedContent: string
}

/**
 * Parse XML content using xml-js library for maximum reliability
 * Supports custom XML tags like <pilotwrite>, <pilotedit>, <pilotdelete>
 */
export class XMLParser {
  private supportedTags = [
    'pilotwrite', 'pilotedit', 'pilotdelete',
    'write_file', 'edit_file', 'delete_file'
  ]

  /**
   * Extract and parse XML tools from content
   */
  public parseXMLTools(content: string): XMLParseResult {
    const tools: ParsedXMLTool[] = []
    let processedContent = content

    // Find all XML-like tags in the content
    const xmlMatches = this.findXMLBlocks(content)

    for (const match of xmlMatches) {
      try {
        const parsedTool = this.parseXMLBlock(match.xml, match.tagName)
        if (parsedTool) {
          tools.push({
            ...parsedTool,
            id: this.generateId(),
            rawXml: match.xml,
            startTime: Date.now()
          })

          // Replace XML block with placeholder in processed content
          const placeholder = `[${parsedTool.name.toUpperCase()}: ${parsedTool.path || 'unknown'}]`
          processedContent = processedContent.replace(match.xml, placeholder)
        }
      } catch (error) {
        console.error('[XMLParser] Failed to parse XML block:', error, match.xml)
      }
    }

    return { tools, processedContent }
  }

  /**
   * Find XML blocks in content using regex as initial detection
   * Then validate with xml-js parser
   */
  private findXMLBlocks(content: string): Array<{ xml: string; tagName: string }> {
    const blocks: Array<{ xml: string; tagName: string }> = []
    
    // Create regex pattern for all supported tags
    const tagPattern = this.supportedTags.join('|')
    const xmlRegex = new RegExp(`<(${tagPattern})([^>]*)>([\\s\\S]*?)<\\/\\1>`, 'gi')
    
    let match
    while ((match = xmlRegex.exec(content)) !== null) {
      blocks.push({
        xml: match[0],
        tagName: match[1]
      })
    }

    return blocks
  }

  /**
   * Parse individual XML block using xml-js
   */
  private parseXMLBlock(xmlString: string, tagName: string): Omit<ParsedXMLTool, 'id' | 'rawXml' | 'startTime'> | null {
    try {
      // Parse XML using xml-js with compact: false for full structure
      const result = xml2js(xmlString, { 
        compact: false,
        ignoreDeclaration: true,
        ignoreInstruction: true,
        ignoreComment: true,
        ignoreDoctype: true
      }) as { elements: Element[] }

      if (!result.elements || result.elements.length === 0) {
        return null
      }

      const rootElement = result.elements[0]
      
      if (rootElement.type !== 'element' || !rootElement.name) {
        return null
      }

      // Extract attributes (path, operation, etc.)
      const attributes = rootElement.attributes || {}
      
      // Extract content from child text elements
      let content = ''
      if (rootElement.elements) {
        content = rootElement.elements
          .filter(el => el.type === 'text')
          .map(el => el.text || '')
          .join('')
          .trim()
      }

      // Build args object from attributes and content
      const args: Record<string, any> = {
        ...attributes,
        content: content || attributes.content
      }

      return {
        name: rootElement.name,
        command: rootElement.name,
        path: String(attributes.path || ''),
        content: content || String(attributes.content || ''),
        args
      }

    } catch (error) {
      console.error('[XMLParser] xml-js parsing failed:', error)
      return null
    }
  }

  /**
   * Generate unique ID for XML tool
   */
  private generateId(): string {
    return `xml_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Validate if content contains supported XML tools
   */
  public hasXMLTools(content: string): boolean {
    const tagPattern = this.supportedTags.join('|')
    const xmlRegex = new RegExp(`<(${tagPattern})([^>]*)>([\\s\\S]*?)<\\/\\1>`, 'i')
    return xmlRegex.test(content)
  }

  /**
   * Get supported XML tool tags
   */
  public getSupportedTags(): string[] {
    return [...this.supportedTags]
  }
}

// Export singleton instance
export const xmlParser = new XMLParser()

// Export utility function for backward compatibility
export function parseXMLTools(content: string): ParsedXMLTool[] {
  const result = xmlParser.parseXMLTools(content)
  return result.tools
}