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
}

// Export a default instance
export const schemaAwareEngine = new SchemaAwareJSONRepairEngine();