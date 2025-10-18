// Test script for AI-powered code validation
import * as fs from 'fs'
import * as path from 'path'

// Mock the XMLToolAutoExecutor for testing
class ValidationTester {
  private async validateAndFixCode(filePath: string, content: string): Promise<{
    isValid: boolean
    errors: string[]
    fixedContent?: string
    suggestions: string[]
    autoFixed: boolean
  }> {
    const errors: string[] = []
    const suggestions: string[] = []

    try {
      // 1. Basic file extension validation
      const fileExt = filePath.split('.').pop()?.toLowerCase()
      const hasJSX = /<[^>]*>[\s\S]*?<\/[^>]*>|<[^>]*\/>/.test(content)

      // Check for JSX in .ts files (not .tsx)
      if (fileExt === 'ts' && hasJSX && !filePath.endsWith('.tsx')) {
        errors.push(`JSX syntax detected in .ts file. Use .tsx extension for React components.`)
        suggestions.push(`Rename file to .tsx extension or remove JSX syntax`)
      }

      // Check for TypeScript syntax in .js files
      if (fileExt === 'js' && (content.includes(': ') || content.includes('interface ') || content.includes('type '))) {
        errors.push(`TypeScript syntax detected in .js file. Use .ts extension.`)
        suggestions.push(`Rename file to .ts extension`)
      }

      // 2. Basic syntax validation (simplified for testing)
      const openBraces = (content.match(/\{/g) || []).length
      const closeBraces = (content.match(/\}/g) || []).length
      const openParens = (content.match(/\(/g) || []).length
      const closeParens = (content.match(/\)/g) || []).length

      if (openBraces !== closeBraces) {
        errors.push(`Mismatched braces: ${openBraces} opening, ${closeBraces} closing`)
      }

      if (openParens !== closeParens) {
        errors.push(`Mismatched parentheses: ${openParens} opening, ${closeParens} closing`)
      }

      // Check for unclosed JSX tags (improved logic)
      // Only check for JSX tags in contexts where JSX is expected (return statements, JSX expressions)
      const returnMatch = content.match(/return\s*\([\s\S]*?\)/g)
      let jsxContent = ''

      if (returnMatch) {
        jsxContent = returnMatch[0]
      }

      const jsxTags = jsxContent.match(/<[^>]*>/g) || []
      console.log('JSX content found:', jsxContent.substring(0, 100) + '...')
      console.log('JSX tags in return:', jsxTags)

      const openingTags = jsxTags.filter(tag =>
        !tag.startsWith('</') && // Not closing tags
        !tag.endsWith('/>') &&   // Not self-closing
        !tag.includes('<!')      // Not comments
      )
      const closingTags = jsxTags.filter(tag => tag.startsWith('</'))
      const selfClosingTags = jsxTags.filter(tag => tag.endsWith('/>'))

      console.log('Opening tags:', openingTags)
      console.log('Closing tags:', closingTags)
      console.log('Self-closing tags:', selfClosingTags)

      // Each opening tag should have a corresponding closing tag
      // This is a simplified check - real JSX validation is more complex
      if (openingTags.length > closingTags.length) {
        errors.push(`Unclosed JSX tags detected: ${openingTags.length} opening, ${closingTags.length} closing`)
      }

      return {
        isValid: errors.length === 0,
        errors,
        suggestions,
        autoFixed: false
      }

    } catch (error) {
      console.error('[ValidationTester] Code validation failed:', error)
      return {
        isValid: true,
        errors: [],
        suggestions: ['Code validation temporarily unavailable'],
        autoFixed: false
      }
    }
  }

  async testValidation(filePath: string) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      console.log(`\n🔍 Testing validation for: ${path.basename(filePath)}`)
      console.log('=' .repeat(50))

      const result = await this.validateAndFixCode(filePath, content)

      console.log(`✅ Valid: ${result.isValid}`)
      console.log(`🔧 Auto-fixed: ${result.autoFixed}`)

      if (result.errors.length > 0) {
        console.log('\n❌ Errors found:')
        result.errors.forEach((error, i) => {
          console.log(`  ${i + 1}. ${error}`)
        })
      }

      if (result.suggestions.length > 0) {
        console.log('\n💡 Suggestions:')
        result.suggestions.forEach((suggestion, i) => {
          console.log(`  ${i + 1}. ${suggestion}`)
        })
      }

      return result
    } catch (error) {
      console.error('Test failed:', error)
      return null
    }
  }
}

// Run tests
async function runTests() {
  const tester = new ValidationTester()

  console.log('🧪 AI Code Validation Test Suite')
  console.log('================================')

  // Test 1: File with JSX in .ts (should fail)
  const test1Result = await tester.testValidation('./test-validation.ts')

  // Test 2: Create a clean file for comparison
  const cleanFilePath = './test-clean.tsx'
  const cleanContent = `import React from 'react'

interface TestProps {
  name: string
  age: number
}

const TestComponent: React.FC<TestProps> = ({ name, age }) => {
  return (
    <div>
      <h1>Hello {name}</h1>
      <p>Age: {age}</p>
    </div>
  )
}

export default TestComponent`

  fs.writeFileSync(cleanFilePath, cleanContent)
  const test2Result = await tester.testValidation(cleanFilePath)

  // Summary
  console.log('\n📊 Test Summary:')
  console.log('================')
  console.log(`Test 1 (JSX in .ts): ${test1Result?.isValid ? '❌ Should have failed' : '✅ Correctly detected errors'}`)
  console.log(`Test 2 (Clean .tsx): ${test2Result?.isValid ? '✅ Passed validation' : '❌ Unexpectedly failed'}`)

  // Cleanup
  try {
    fs.unlinkSync('./test-validation.ts')
    fs.unlinkSync('./test-clean.tsx')
    console.log('\n🧹 Cleaned up test files')
  } catch (e) {
    // Ignore cleanup errors
  }
}

runTests().catch(console.error)