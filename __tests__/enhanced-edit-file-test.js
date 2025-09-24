/**
 * Comprehensive test suite for enhanced JSON edit_file implementation
 * Tests all advanced features: multi-operation, rollback, validation, occurrence targeting
 */

const { XMLToolAutoExecutor } = require('../components/workspace/xml-tool-auto-executor.ts')
const { JsonToolParser } = require('../components/workspace/json-tool-parser.ts')

// Mock storage manager
const mockStorageManager = {
  init: async () => {},
  getFile: async (projectId, path) => {
    const files = {
      'test.txt': { content: 'Hello world! Hello universe! Hello everyone!' },
      'config.js': { content: 'const config = { debug: false, port: 3000 }' },
      'multiline.txt': { content: 'Line 1\nLine 2\nLine 3\nLine 2 again\nLine 5' }
    }
    return files[path] || null
  },
  updateFile: async (projectId, path, data) => {
    console.log(`✅ Updated ${path} with new content`)
    console.log('New content:', data.content)
  }
}

async function testBasicSearchReplace() {
  console.log('\n🧪 Test: Basic search/replace')
  
  const executor = new XMLToolAutoExecutor()
  const toolCall = {
    tool: 'edit_file',
    path: 'test.txt',
    search: 'Hello world!',
    replace: 'Goodbye world!'
  }
  
  try {
    const result = await executor.executeJsonTool(toolCall, 'test-project', mockStorageManager)
    console.log('✅ Result:', result)
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

async function testReplaceAll() {
  console.log('\n🧪 Test: Replace all occurrences')
  
  const executor = new XMLToolAutoExecutor()
  const toolCall = {
    tool: 'edit_file',
    path: 'test.txt',
    search: 'Hello',
    replace: 'Hi',
    replaceAll: true
  }
  
  try {
    const result = await executor.executeJsonTool(toolCall, 'test-project', mockStorageManager)
    console.log('✅ Result:', result)
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

async function testOccurrenceIndex() {
  console.log('\n🧪 Test: Replace specific occurrence')
  
  const executor = new XMLToolAutoExecutor()
  const toolCall = {
    tool: 'edit_file',
    path: 'test.txt',
    search: 'Hello',
    replace: 'Hola',
    occurrenceIndex: 2  // Replace 2nd occurrence
  }
  
  try {
    const result = await executor.executeJsonTool(toolCall, 'test-project', mockStorageManager)
    console.log('✅ Result:', result)
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

async function testValidationSuccess() {
  console.log('\n🧪 Test: Post-operation validation (success)')
  
  const executor = new XMLToolAutoExecutor()
  const toolCall = {
    tool: 'edit_file',
    path: 'config.js',
    search: 'debug: false',
    replace: 'debug: true',
    validateAfter: 'debug: true'
  }
  
  try {
    const result = await executor.executeJsonTool(toolCall, 'test-project', mockStorageManager)
    console.log('✅ Result:', result)
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

async function testValidationFailure() {
  console.log('\n🧪 Test: Post-operation validation (failure)')
  
  const executor = new XMLToolAutoExecutor()
  const toolCall = {
    tool: 'edit_file',
    path: 'config.js',
    search: 'port: 3000',
    replace: 'port: 8080',
    validateAfter: 'port: 9000'  // This won't exist after replacement
  }
  
  try {
    const result = await executor.executeJsonTool(toolCall, 'test-project', mockStorageManager)
    console.log('✅ Result:', result)
  } catch (error) {
    console.error('❌ Expected error:', error.message)
  }
}

async function testMultiOperationSuccess() {
  console.log('\n🧪 Test: Multi-operation search/replace (success)')
  
  const executor = new XMLToolAutoExecutor()
  const toolCall = {
    tool: 'edit_file',
    path: 'multiline.txt',
    searchReplaceBlocks: [
      {
        search: 'Line 1',
        replace: 'First line'
      },
      {
        search: 'Line 3',
        replace: 'Third line'
      },
      {
        search: 'Line 2',
        replace: 'Second line',
        occurrenceIndex: 1  // Only first occurrence
      }
    ]
  }
  
  try {
    const result = await executor.executeJsonTool(toolCall, 'test-project', mockStorageManager)
    console.log('✅ Result:', result)
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

async function testMultiOperationFailure() {
  console.log('\n🧪 Test: Multi-operation with rollback')
  
  const executor = new XMLToolAutoExecutor()
  const toolCall = {
    tool: 'edit_file',
    path: 'multiline.txt',
    rollbackOnFailure: true,
    searchReplaceBlocks: [
      {
        search: 'Line 1',
        replace: 'First line'
      },
      {
        search: 'NonExistentText',  // This will fail
        replace: 'New text'
      }
    ]
  }
  
  try {
    const result = await executor.executeJsonTool(toolCall, 'test-project', mockStorageManager)
    console.log('✅ Result:', result)
  } catch (error) {
    console.error('❌ Expected rollback error:', error.message)
  }
}

async function testDryRun() {
  console.log('\n🧪 Test: Dry run validation')
  
  const executor = new XMLToolAutoExecutor()
  const toolCall = {
    tool: 'edit_file',
    path: 'test.txt',
    dryRun: true,
    searchReplaceBlocks: [
      {
        search: 'Hello',
        replace: 'Greetings',
        replaceAll: true
      },
      {
        search: 'universe!',
        replace: 'cosmos!'
      }
    ]
  }
  
  try {
    const result = await executor.executeJsonTool(toolCall, 'test-project', mockStorageManager)
    console.log('✅ Dry run result:', result)
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

async function testAdvancedValidation() {
  console.log('\n🧪 Test: Advanced validation with post-checks')
  
  const executor = new XMLToolAutoExecutor()
  const toolCall = {
    tool: 'edit_file',
    path: 'config.js',
    searchReplaceBlocks: [
      {
        search: 'debug: false',
        replace: 'debug: true',
        validateAfter: 'debug: true'
      },
      {
        search: 'port: 3000',
        replace: 'port: 8080',
        validateAfter: 'port: 8080'
      }
    ]
  }
  
  try {
    const result = await executor.executeJsonTool(toolCall, 'test-project', mockStorageManager)
    console.log('✅ Result:', result)
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

async function testFileNotFound() {
  console.log('\n🧪 Test: File not found error')
  
  const executor = new XMLToolAutoExecutor()
  const toolCall = {
    tool: 'edit_file',
    path: 'nonexistent.txt',
    search: 'anything',
    replace: 'nothing'
  }
  
  try {
    const result = await executor.executeJsonTool(toolCall, 'test-project', mockStorageManager)
    console.log('✅ Result:', result)
  } catch (error) {
    console.error('❌ Expected error:', error.message)
  }
}

async function runAllTests() {
  console.log('🚀 Running Enhanced JSON edit_file Tests\n')
  
  await testBasicSearchReplace()
  await testReplaceAll()
  await testOccurrenceIndex()
  await testValidationSuccess()
  await testValidationFailure()
  await testMultiOperationSuccess()
  await testMultiOperationFailure()
  await testDryRun()
  await testAdvancedValidation()
  await testFileNotFound()
  
  console.log('\n✅ All tests completed!')
}

if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = {
  testBasicSearchReplace,
  testReplaceAll,
  testOccurrenceIndex,
  testValidationSuccess,
  testValidationFailure,
  testMultiOperationSuccess,
  testMultiOperationFailure,
  testDryRun,
  testAdvancedValidation,
  testFileNotFound
}