// Test script to debug JSON tool parser issue
import { jsonToolParser } from './components/workspace/json-tool-parser.js'

const testContent = `🎯 Goal: Add Leaflet JS package for interactive mapping functionality to support hyperlocal features in your HyperSwap AI marketplace.

\`\`\`json
{
  "tool": "add_package",
  "name": "leaflet",
  "version": "^1.9.4",
  "isDev": false
}
\`\`\`

\`\`\`json
{
  "tool": "add_package",
  "name": "react-leaflet",
  "version": "^4.2.1",
  "isDev": false
}
\`\`\`

\`\`\`json
{
  "tool": "add_package",
  "name": "@types/leaflet",
  "version": "^1.9.12",
  "isDev": true
}
\`\`\`

✅ Packages added successfully!`

console.log('Testing JSON tool parser...')
console.log('Input content length:', testContent.length)
console.log('Input content preview:', testContent.substring(0, 200))

const result = jsonToolParser.parseJsonTools(testContent)
console.log('Detected tools:', result.tools.length)
result.tools.forEach((tool, index) => {
  console.log(`Tool ${index + 1}:`, tool.tool, tool.args)
})