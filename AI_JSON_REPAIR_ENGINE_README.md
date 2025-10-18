# AI JSON Repair Engine

A powerful and accurate JSON parser designed to handle malformed JSON output from Large Language Models (LLMs) like GPT, Claude, and others.

## Features

- **Control Character Handling**: Automatically escapes unescaped newlines, tabs, carriage returns, and other control characters in JSON strings
- **Markdown Extraction**: Strips JSON from markdown code blocks
- **Missing Comma Detection**: Adds missing commas between array elements and object properties
- **Quote Fixing**: Handles mixed quotes and unquoted keys
- **Trailing Content Removal**: Removes explanatory text after valid JSON structures
- **Multiple Repair Strategies**: Tries different parsing approaches for maximum success rate
- **Confidence Scoring**: Provides confidence levels for parsed results
- **Comprehensive Logging**: Tracks all fixes and processing details

## Installation

```bash
npm install ai-json-fixer
```

Then create the engine:

```javascript
import { AIJSONRepairEngine } from './ai-json-repair-engine.js';

const engine = new AIJSONRepairEngine();
```

## Usage

### Basic Usage

```javascript
const malformedJson = `{"name": "John" "age": 30}`;
const result = engine.repair(malformedJson);

if (result.data) {
  console.log('Parsed successfully:', result.data);
  console.log('Confidence:', result.confidence);
} else {
  console.log('Failed to parse:', result.warnings);
}
```

### Complex LLM Output

```javascript
const llmOutput = `
\`\`\`json
{
  "tool": "write_file"
  "path": "src/components/Example.tsx"
  "content": "import React from 'react'\n\nexport default function Example() {\n  return <div>Hello World</div>\n}"
}
\`\`\`

This creates a React component.`;

const result = engine.repair(llmOutput);
console.log(result.data);
// Output: { tool: 'write_file', path: 'src/components/Example.tsx', content: '...' }
```

### Quick Parse

```javascript
const data = engine.parse(malformedJson); // Returns parsed object or null
```

## API Reference

### AIJSONRepairEngine

#### Constructor Options

```javascript
const engine = new AIJSONRepairEngine({
  escapeControlChars: true,  // Escape control characters in strings
  aggressiveMode: true,      // Use aggressive parsing mode
  trackFixes: true,          // Track applied fixes
  maxRetries: 3              // Maximum repair attempts
});
```

#### Methods

##### `repair(input, parseOptions)`

Repairs and parses malformed JSON input.

**Parameters:**
- `input` (string): The malformed JSON string
- `parseOptions` (object): Additional parsing options passed to ai-json-fixer

**Returns:** Object with:
- `data`: Parsed JSON object or null
- `fixes`: Array of applied fixes
- `confidence`: Confidence score (0-1)
- `warnings`: Array of warning messages
- `processingTime`: Time taken in milliseconds
- `engine`: Engine name
- `version`: Engine version

##### `parse(input, parseOptions)`

Quick parse method that returns only the data or null.

## Supported Malformations

- Missing commas between properties/elements
- Unescaped newlines, tabs, carriage returns in strings
- JSON wrapped in markdown code blocks
- Trailing explanatory text
- Unquoted object keys
- Mixed single/double quotes
- Trailing commas
- And more...

## Test Results

The engine successfully handles 9/10 common LLM output patterns with high confidence scores.

## Performance

- Fast preprocessing with regex-based control character escaping
- Multiple fallback strategies for maximum accuracy
- Processing time typically under 10ms for most inputs

## Dependencies

- `ai-json-fixer`: Core JSON repair functionality

## License

MIT