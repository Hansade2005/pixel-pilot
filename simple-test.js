// Simple test for JSON parsing improvements
import { jsonToolParser } from './components/workspace/json-tool-parser.js';

// Test malformed JSON
const testJson = `{
 "tool": "write_file",
 "path": "test.tsx",
content": "console.log('test')"
}`;

console.log('Testing improved JSON parsing...');

try {
  const result = jsonToolParser.parseJsonTools(testJson);
  console.log('✅ Success! Parsed', result.tools.length, 'tools');
  if (result.tools.length > 0) {
    console.log('Tool:', result.tools[0].tool);
    console.log('Path:', result.tools[0].path);
  }
} catch (error) {
  console.log('❌ Error:', error.message);
}