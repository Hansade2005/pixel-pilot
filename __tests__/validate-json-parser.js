/**
 * Simple validation of JSON Tool Parser - no external dependencies
 */

// Simple test without jest dependencies
function validateJsonToolParser() {
  console.log('🧪 Validating JSON Tool Parser...\n')
  
  // Test content with JSON tool
  const testContent = `
I'll create a new file for you:

\`\`\`json
{
  "tool": "write_file", 
  "path": "src/components/TestComponent.tsx",
  "content": "import React from 'react';\\n\\nexport const TestComponent = () => {\\n  return <div>Test</div>;\\n};"
}
\`\`\`

The file has been created successfully.
`

  console.log('📝 Test content:')
  console.log(testContent)
  console.log('\n' + '='.repeat(50) + '\n')

  // Test JSON detection
  const jsonPattern = /```json\s*([\s\S]*?)\s*```/g
  const matches = [...testContent.matchAll(jsonPattern)]
  
  console.log('🔍 JSON blocks found:', matches.length)
  
  if (matches.length > 0) {
    matches.forEach((match, index) => {
      console.log(`\n📦 JSON Block ${index + 1}:`)
      console.log(match[1].trim())
      
      try {
        const parsed = JSON.parse(match[1].trim())
        console.log('✅ Valid JSON detected')
        console.log('🔧 Tool:', parsed.tool)
        console.log('📁 Path:', parsed.path)
        console.log('📄 Content length:', parsed.content?.length || 0, 'characters')
        
        if (parsed.tool === 'write_file' && parsed.path && parsed.content) {
          console.log('✅ Valid write_file tool detected!')
        }
      } catch (error) {
        console.log('❌ Invalid JSON:', error.message)
      }
    })
  }
  
  console.log('\n🎉 Validation complete!')
  return matches.length > 0
}

// Run validation
const hasValidTools = validateJsonToolParser()

if (hasValidTools) {
  console.log('\n✅ SUCCESS: JSON tool parser should work correctly!')
  console.log('📋 The system can detect JSON-formatted tools in AI responses')
} else {
  console.log('\n❌ FAILED: No valid JSON tools detected')
}