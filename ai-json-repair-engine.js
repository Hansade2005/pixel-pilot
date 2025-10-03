import { LLMJSONParser } from 'ai-json-fixer';

/**
 * Advanced AI JSON Repair Engine
 * A powerful and accurate JSON parser designed to handle malformed JSON output from LLMs
 * Extends ai-json-fixer with additional preprocessing and repair capabilities
 */
export class AIJSONRepairEngine {
  constructor(options = {}) {
    this.parser = new LLMJSONParser();
    this.options = {
      escapeControlChars: true,
      aggressiveMode: true,
      trackFixes: true,
      maxRetries: 3,
      ...options
    };
  }

  /**
   * Preprocesses JSON string to escape unescaped control characters in strings
   * @param {string} jsonStr - The raw JSON string
   * @returns {string} - Preprocessed JSON string
   */
  preprocessControlChars(jsonStr) {
    if (!this.options.escapeControlChars) return jsonStr;

    // Escape control characters in quoted strings
    return jsonStr.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
      return match
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/\f/g, '\\f')
        .replace(/\x08/g, '\\b')  // backspace
        .replace(/\x0C/g, '\\f'); // form feed (already have \f)
    });
  }

  /**
   * Attempts to repair and parse malformed JSON
   * @param {string} input - The malformed JSON input
   * @param {object} parseOptions - Additional parsing options
   * @returns {object} - Parse result with data, fixes, confidence, and warnings
   */
  repair(input, parseOptions = {}) {
    const startTime = Date.now();

    try {
      // Preprocess to escape control characters
      let processedInput = this.preprocessControlChars(input);

      // Attempt parsing with different strategies
      let result = this.attemptParse(processedInput, parseOptions);

      // If failed, try additional repair strategies
      if (!result.data && this.options.maxRetries > 1) {
        result = this.attemptAdvancedRepairs(processedInput, parseOptions);
      }

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      return {
        ...result,
        processingTime,
        engine: 'AIJSONRepairEngine',
        version: '1.0.0'
      };

    } catch (error) {
      return {
        data: null,
        fixes: [],
        confidence: 0,
        warnings: [`Engine error: ${error.message}`],
        processingTime: Date.now() - startTime,
        engine: 'AIJSONRepairEngine',
        version: '1.0.0'
      };
    }
  }

  /**
   * Attempts basic parsing with ai-json-fixer
   */
  attemptParse(input, parseOptions) {
    const options = {
      mode: this.options.aggressiveMode ? 'aggressive' : 'standard',
      stripMarkdown: true,
      trimTrailing: true,
      fixQuotes: true,
      addMissingCommas: true,
      trackFixes: this.options.trackFixes,
      ...parseOptions
    };

    return this.parser.tryParse(input, options);
  }

  /**
   * Attempts advanced repair strategies if basic parsing fails
   */
  attemptAdvancedRepairs(input, parseOptions) {
    // Strategy 1: Try with different preprocessing
    let result = this.tryAlternativePreprocessing(input, parseOptions);
    if (result.data) return result;

    // Strategy 2: Try fixing common LLM mistakes
    result = this.tryCommonFixes(input, parseOptions);
    if (result.data) return result;

    // Strategy 3: Last resort - try standard JSON.parse with minimal fixes
    result = this.tryStandardParse(input);

    return result;
  }

  /**
   * Tries alternative preprocessing approaches
   */
  tryAlternativePreprocessing(input, parseOptions) {
    // Try without control char escaping
    const noEscapeInput = input;
    const result = this.attemptParse(noEscapeInput, { ...parseOptions, mode: 'strict' });
    if (result.data) return result;

    // Try with more aggressive control char handling
    const aggressiveEscape = input.replace(/[\x00-\x1F\x7F]/g, (char) => {
      return '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0');
    });
    return this.attemptParse(aggressiveEscape, parseOptions);
  }

  /**
   * Tries common LLM output fixes
   */
  tryCommonFixes(input, parseOptions) {
    // Fix trailing commas in objects/arrays
    let fixed = input
      .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote unquoted keys
      .replace(/'/g, '"'); // Convert single quotes to double quotes

    return this.attemptParse(fixed, parseOptions);
  }

  /**
   * Last resort: try standard JSON.parse
   */
  tryStandardParse(input) {
    try {
      const data = JSON.parse(input);
      return {
        data,
        fixes: [{ type: 'standard_parse', description: 'Parsed with standard JSON.parse' }],
        confidence: 1.0,
        warnings: []
      };
    } catch (error) {
      return {
        data: null,
        fixes: [],
        confidence: 0,
        warnings: [`Standard parse failed: ${error.message}`]
      };
    }
  }

  /**
   * Quick parse method for simple cases
   */
  parse(input, parseOptions = {}) {
    const result = this.repair(input, parseOptions);
    return result.data;
  }
}

// Export a default instance for convenience
export const aiJsonRepair = new AIJSONRepairEngine();