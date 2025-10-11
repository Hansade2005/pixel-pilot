import { AIJSONRepairEngine } from './ai-json-repair-engine.js';

/**
 * Schema-Aware AI JSON Repair Engine
 * Enhanced version that understands tool schemas and can reconstruct missing structural elements
 */
export class SchemaAwareJSONRepairEngine extends AIJSONRepairEngine {
  constructor(options = {}) {
    super(options);
    this.schemas = {};
    this.loadToolSchemas();
  }

  /**
   * Load predefined tool schemas
   */
  loadToolSchemas() {
    this.schemas = {
      write_file: {
        type: 'object',
        required: ['tool', 'path', 'content'],
        properties: {
          tool: { type: 'string', enum: ['write_file'] },
          path: { type: 'string' },
          content: { type: 'string' }
        }
      },
      delete_file: {
        type: 'object',
        required: ['tool', 'path'],
        properties: {
          tool: { type: 'string', enum: ['delete_file'] },
          path: { type: 'string' }
        }
      },
      edit_file: {
        type: 'object',
        required: ['tool', 'path'],
        properties: {
          tool: { type: 'string', enum: ['edit_file'] },
          path: { type: 'string' },
          search: { type: 'string' },
          replace: { type: 'string' },
          searchReplaceBlocks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                search: { type: 'string' },
                replace: { type: 'string' },
                occurrenceIndex: { type: 'number' },
                validateAfter: { type: 'string' }
              }
            }
          },
          occurrenceIndex: { type: 'number' },
          replaceAll: { type: 'boolean' },
          validateAfter: { type: 'string' },
          dryRun: { type: 'boolean' },
          rollbackOnFailure: { type: 'boolean' }
        }
      }
    };
  }

  /**
   * Enhanced repair method with schema awareness
   */
  repair(input, parseOptions = {}) {
    const startTime = Date.now();

    try {
      // First try the base engine
      let result = super.repair(input, parseOptions);

      // If base engine failed, try schema-aware reconstruction
      if (!result.data) {
        result = this.schemaAwareRepair(input, parseOptions);
      }

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      return {
        ...result,
        processingTime,
        engine: 'SchemaAwareJSONRepairEngine',
        version: '1.0.0'
      };

    } catch (error) {
      return {
        data: null,
        fixes: [],
        confidence: 0,
        warnings: [`Schema-aware engine error: ${error.message}`],
        processingTime: Date.now() - startTime,
        engine: 'SchemaAwareJSONRepairEngine',
        version: '1.0.0'
      };
    }
  }

  /**
   * Schema-aware repair for severely broken JSON
   */
  schemaAwareRepair(input, parseOptions) {
    // Extract potential tool name
    const toolMatch = input.match(/"tool"\s*:\s*"([^"]+)"/);
    if (!toolMatch) {
      return {
        data: null,
        fixes: [],
        confidence: 0,
        warnings: ['No tool identifier found in input']
      };
    }

    const toolName = toolMatch[1];
    const schema = this.schemas[toolName];

    if (!schema) {
      return {
        data: null,
        fixes: [],
        confidence: 0,
        warnings: [`Unknown tool: ${toolName}`]
      };
    }

    // Try to reconstruct the JSON based on schema
    const reconstructed = this.reconstructFromSchema(input, schema, toolName);

    if (reconstructed) {
      // Try to parse the reconstructed JSON
      return super.repair(reconstructed, parseOptions);
    }

    return {
      data: null,
      fixes: [],
      confidence: 0,
      warnings: ['Schema-aware reconstruction failed']
    };
  }

  /**
   * Reconstruct JSON from schema knowledge
   */
  reconstructFromSchema(input, schema, toolName) {
    try {
      // Clean and preprocess input
      let cleaned = input
        .replace(/```\w*\n?/g, '') // Remove markdown
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .trim();

      // Handle unclosed strings by finding the last quote and closing it
      cleaned = this.fixUnclosedStrings(cleaned);

      // Extract key-value pairs using regex
      const pairs = this.extractKeyValuePairs(cleaned);

      // Build JSON object based on schema
      const obj = { tool: toolName };

      // Add required properties
      for (const required of schema.required) {
        if (required !== 'tool') {
          const value = pairs[required];
          if (value !== undefined) {
            obj[required] = value;
          } else {
            // Try to infer missing required properties
            obj[required] = this.inferMissingProperty(required, pairs);
          }
        }
      }

      // Add optional properties
      for (const [key, value] of Object.entries(pairs)) {
        if (!obj.hasOwnProperty(key) && key !== 'tool') {
          obj[key] = value;
        }
      }

      // Convert back to JSON string
      return JSON.stringify(obj, null, 2);

    } catch (error) {
      return null;
    }
  }

  /**
   * Fix unclosed strings by finding unmatched quotes
   */
  fixUnclosedStrings(input) {
    const chars = input.split('');
    let inString = false;
    let escapeNext = false;
    let lastQuoteIndex = -1;

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        if (inString) {
          lastQuoteIndex = i;
        }
      }
    }

    // If still in string at the end, close it
    if (inString) {
      // Find a good place to close the string (before }, ], or end)
      let closeIndex = chars.length;
      for (let i = lastQuoteIndex + 1; i < chars.length; i++) {
        if (chars[i] === '}' || chars[i] === ']' || chars[i] === ',') {
          closeIndex = i;
          break;
        }
      }
      chars.splice(closeIndex, 0, '"');
    }

    return chars.join('');
  }

  /**
   * Extract key-value pairs from malformed JSON string
   */
  extractKeyValuePairs(input) {
    const pairs = {};
    const regex = /"([^"]+)"\s*:\s*("([^"]*)"|\[([^\]]*)\]|{([^}]*)}|([^,}\]]*))/g;
    let match;

    while ((match = regex.exec(input)) !== null) {
      const key = match[1];
      let value;

      if (match[3] !== undefined) {
        // String value - escape control characters
        value = this.escapeControlCharsInString(match[3]);
      } else if (match[4] !== undefined) {
        // Array value
        value = JSON.parse(`[${match[4]}]`);
      } else if (match[5] !== undefined) {
        // Object value
        value = JSON.parse(`{${match[5]}}`);
      } else if (match[6] !== undefined) {
        // Other value (number, boolean, null)
        value = JSON.parse(match[6]);
      }

      pairs[key] = value;
    }

    return pairs;
  }

  /**
   * Escape control characters in a string value
   */
  escapeControlCharsInString(str) {
    return str
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\f/g, '\\f')
      .replace(/\x08/g, '\\b'); // backspace
  }

  /**
   * Infer missing required properties based on context
   */
  inferMissingProperty(property, pairs) {
    switch (property) {
      case 'path':
        // Look for file path patterns
        for (const [key, value] of Object.entries(pairs)) {
          if (typeof value === 'string' && (value.includes('.js') || value.includes('.ts') || value.includes('.tsx'))) {
            return value;
          }
        }
        return 'inferred-path.js';

      case 'content':
        // Look for content-like strings
        for (const [key, value] of Object.entries(pairs)) {
          if (typeof value === 'string' && value.includes('import') || value.includes('function')) {
            return value;
          }
        }
        return 'inferred-content';

      default:
        return `inferred-${property}`;
    }
  }

  /**
   * Enhanced parsing method that handles various malformed JSON formats
   * This is the main method that should be used for AI tool parsing
   */
  parseToolCall(input) {
    if (!input || typeof input !== 'string') {
      return null;
    }

    // Clean input - remove markdown fences and normalize whitespace
    let cleanInput = input.trim();
    cleanInput = cleanInput.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');

    // Strategy 1: Try standard JSON parsing (fastest, highest confidence)
    try {
      const parsed = JSON.parse(cleanInput);
      if (this.isValidToolCall(parsed)) {
        return {
          tool: parsed.tool,
          path: parsed.path,
          content: parsed.content,
          args: this.buildArgsFromParsed(parsed),
          confidence: 1.0,
          method: 'standard_json'
        };
      }
    } catch (error) {
      // Continue to next strategy
    }

    // Strategy 2: Extract from code blocks
    const codeBlockMatch = input.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1]);
        if (this.isValidToolCall(parsed)) {
          return {
            tool: parsed.tool,
            path: parsed.path,
            content: parsed.content,
            args: this.buildArgsFromParsed(parsed),
            confidence: 0.9,
            method: 'code_block'
          };
        }
      } catch (error) {
        // Continue to next strategy
      }
    }

    // Strategy 3: Pattern matching for malformed JSON
    const patternResult = this.tryPatternMatching(cleanInput);
    if (patternResult) {
      return {
        ...patternResult,
        confidence: 0.6,
        method: 'pattern_matching'
      };
    }

    // Strategy 4: Schema-aware repair (last resort)
    const repairResult = this.repair(cleanInput);
    if (repairResult.data && repairResult.confidence > 0.3 && this.isValidToolCall(repairResult.data)) {
      return {
        tool: repairResult.data.tool,
        path: repairResult.data.path,
        content: repairResult.data.content,
        args: this.buildArgsFromParsed(repairResult.data),
        confidence: repairResult.confidence * 0.8, // Slightly lower confidence for repaired data
        method: 'schema_aware_repair'
      };
    }

    return null;
  }







  /**
   * Check if tool is supported
   */
  isSupportedTool(toolName) {
    const supportedTools = [
      'write_file', 'edit_file', 'delete_file',
      'read_file', 'list_files', 'create_directory',
      'pilotwrite', 'pilotedit', 'pilotdelete'
    ];
    return supportedTools.includes(toolName);
  }

  /**
   * Parse AI-generated tool calls with robust malformed JSON handling
   * Returns structured tool call data with confidence scoring
   */
  parseToolCall(input) {
    if (!input || typeof input !== 'string') {
      return null;
    }

    // Clean input - remove markdown fences and normalize whitespace
    let cleanInput = input.trim();
    cleanInput = cleanInput.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');

    // Strategy 1: Try standard JSON parsing (fastest, highest confidence)
    try {
      const parsed = JSON.parse(cleanInput);
      if (this.isValidToolCall(parsed)) {
        return {
          tool: parsed.tool,
          path: parsed.path,
          content: parsed.content,
          args: this.buildArgsFromParsed(parsed),
          confidence: 1.0,
          method: 'standard_json'
        };
      }
    } catch (error) {
      // Continue to next strategy
    }

    // Strategy 2: Extract from code blocks
    const codeBlockMatch = input.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1]);
        if (this.isValidToolCall(parsed)) {
          return {
            tool: parsed.tool,
            path: parsed.path,
            content: parsed.content,
            args: this.buildArgsFromParsed(parsed),
            confidence: 0.9,
            method: 'code_block'
          };
        }
      } catch (error) {
        // Continue to next strategy
      }
    }

    // Strategy 3: Pattern matching for malformed JSON
    const patternResult = this.tryPatternMatching(cleanInput);
    if (patternResult) {
      return {
        ...patternResult,
        confidence: 0.6,
        method: 'pattern_matching'
      };
    }

    // Strategy 4: Schema-aware repair (last resort)
    const repairResult = this.repair(cleanInput);
    if (repairResult.data && repairResult.confidence > 0.3 && this.isValidToolCall(repairResult.data)) {
      return {
        tool: repairResult.data.tool,
        path: repairResult.data.path,
        content: repairResult.data.content,
        args: this.buildArgsFromParsed(repairResult.data),
        confidence: repairResult.confidence * 0.8, // Slightly lower confidence for repaired data
        method: 'schema_aware_repair'
      };
    }

    return null;
  }

  /**
   * Extract content block from nested JSON structures
   */
  extractContentBlock(input) {
    // Look for content field with nested object
    const contentMatch = input.match(/"content"\s*:\s*(\{[\s\S]*\}(?:\s*\n?\s*\})*)/);
    if (contentMatch) {
      try {
        return JSON.parse(contentMatch[1]);
      } catch (error) {
        // Try to fix common issues
        let contentStr = contentMatch[1];
        contentStr = contentStr.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
        try {
          return JSON.parse(contentStr);
        } catch (error2) {
          return contentStr; // Return as string if parsing fails
        }
      }
    }
    return null;
  }

  /**
   * Try pattern matching for severely malformed JSON
   */
  tryPatternMatching(input) {
    const patterns = {
      tool: /"tool"\s*:\s*"([^"]+)"/,
      path: /"path"\s*:\s*"([^"]+)"/,
      content: /"content"\s*:\s*(\{[\s\S]*?\}(?:\s*\n?\s*\})*)/
    };

    const toolMatch = input.match(patterns.tool);
    if (!toolMatch || !this.isSupportedTool(toolMatch[1])) {
      return null;
    }

    const result = {
      tool: toolMatch[1],
      path: null,
      content: null,
      args: {}
    };

    // Extract path
    const pathMatch = input.match(patterns.path);
    if (pathMatch) {
      result.path = pathMatch[1];
    }

    // Extract content (try as JSON object first, then as string)
    const contentMatch = input.match(patterns.content);
    if (contentMatch) {
      result.content = this.extractContentBlock(input) || contentMatch[1];
    }

    // Build args from additional patterns
    result.args = this.buildArgsFromPatterns(input);

    return result.tool && result.path ? result : null;
  }

  /**
   * Build args object from pattern-matched input
   */
  buildArgsFromPatterns(input) {
    const args = {};
    const argPatterns = {
      operation: /"operation"\s*:\s*"([^"]+)"/,
      search: /"search"\s*:\s*"([^"]+)"/,
      replace: /"replace"\s*:\s*"([^"]+)"/,
      replaceAll: /"replaceAll"\s*:\s*(true|false)/,
      occurrenceIndex: /"occurrenceIndex"\s*:\s*(\d+)/,
      validateAfter: /"validateAfter"\s*:\s*"([^"]+)"/,
      dryRun: /"dryRun"\s*:\s*(true|false)/,
      rollbackOnFailure: /"rollbackOnFailure"\s*:\s*(true|false)/
    };

    for (const [key, pattern] of Object.entries(argPatterns)) {
      const match = input.match(pattern);
      if (match) {
        if (key.includes('Index')) {
          args[key] = parseInt(match[1]);
        } else if (key.includes('All') || key.includes('Run') || key.includes('Failure')) {
          args[key] = match[1] === 'true';
        } else {
          args[key] = match[1];
        }
      }
    }

    return args;
  }

  /**
   * Build args object from successfully parsed JSON
   */
  buildArgsFromParsed(parsed) {
    const args = { ...parsed };
    delete args.tool;
    delete args.path;
    delete args.content;
    return args;
  }

  /**
   * Validate if parsed object is a valid tool call
   */
  isValidToolCall(obj) {
    return obj &&
           typeof obj === 'object' &&
           obj.tool &&
           this.isSupportedTool(obj.tool);
  }
}