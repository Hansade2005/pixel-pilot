/**
 * Test XML detection with xml-js parser
 */

import { xmlParser } from '../components/workspace/xml-parser'

// Test XML content
const testXMLContent = `
Here's what I'll implement for you:

<pilotwrite path="src/components/TestComponent.tsx">
import React from 'react';

const TestComponent = () => {
  return (
    <div className="test-component">
      <h1>Test Component</h1>
      <p>This is a test component created by XML auto-execution.</p>
    </div>
  );
};

export default TestComponent;
</pilotwrite>

Now I'll also edit an existing file:

<pilotedit path="src/App.tsx">
import TestComponent from './components/TestComponent';

// Add TestComponent to the app
</pilotedit>

And delete a file if needed:

<pilotdelete path="src/old-component.tsx" />

That's all the changes needed!
`

// Test the parser
console.log('🧪 Testing XML Parser with xml-js library...')
console.log('📄 Test content length:', testXMLContent.length)

const result = xmlParser.parseXMLTools(testXMLContent)

console.log('\n📊 Parsing Results:')
console.log('- Tools detected:', result.tools.length)
console.log('- Processed content length:', result.processedContent.length)

console.log('\n🔍 Detected Tools:')
result.tools.forEach((tool, index) => {
  console.log(`${index + 1}. ${tool.command}`)
  console.log(`   - Path: ${tool.path}`)
  console.log(`   - Content length: ${tool.content?.length || 0}`)
  console.log(`   - Args:`, Object.keys(tool.args))
})

console.log('\n📝 Processed Content Preview:')
console.log(result.processedContent.substring(0, 300) + '...')

console.log('\n✅ XML Parser Test Complete!')

export { testXMLContent }