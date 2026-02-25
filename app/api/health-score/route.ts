import { NextRequest, NextResponse } from 'next/server'

// Analyze project files and return a health score
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { files } = body

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'Files array is required' }, { status: 400 })
    }

    // Analyze each dimension
    const codeQuality = analyzeCodeQuality(files)
    const security = analyzeSecurity(files)
    const performance = analyzePerformance(files)
    const accessibility = analyzeAccessibility(files)
    const maintainability = analyzeMaintainability(files)

    const overallScore = Math.round(
      (codeQuality.score + security.score + performance.score + accessibility.score + maintainability.score) / 5
    )

    return NextResponse.json({
      overall: {
        score: overallScore,
        grade: getGrade(overallScore),
        totalFiles: files.length,
        totalLines: files.reduce((sum: number, f: any) => sum + (f.content?.split('\n').length || 0), 0),
      },
      dimensions: {
        codeQuality,
        security,
        performance,
        accessibility,
        maintainability,
      },
    })
  } catch (error) {
    console.error('[HealthScore] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

interface HealthDimension {
  score: number
  grade: string
  issues: Array<{ severity: 'low' | 'medium' | 'high'; message: string; file?: string }>
  suggestions: string[]
}

function analyzeCodeQuality(files: any[]): HealthDimension {
  const issues: HealthDimension['issues'] = []
  const suggestions: string[] = []
  let deductions = 0

  for (const file of files) {
    if (!file.content || !file.path) continue
    const lines = file.content.split('\n')
    const ext = file.path.split('.').pop()?.toLowerCase()

    // Check for very long files
    if (lines.length > 500) {
      issues.push({ severity: 'medium', message: `File has ${lines.length} lines - consider splitting`, file: file.path })
      deductions += 2
    }

    // Check for console.log statements in production code
    if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) {
      const consoleLogs = lines.filter((l: string) => /console\.(log|debug|info)\(/.test(l) && !l.trim().startsWith('//')).length
      if (consoleLogs > 5) {
        issues.push({ severity: 'low', message: `${consoleLogs} console.log statements found`, file: file.path })
        deductions += 1
      }

      // Check for any type usage
      const anyCount = (file.content.match(/:\s*any\b/g) || []).length
      if (anyCount > 3) {
        issues.push({ severity: 'medium', message: `${anyCount} uses of 'any' type - weakens type safety`, file: file.path })
        deductions += 2
      }

      // Check for TODO/FIXME/HACK comments
      const todoCount = (file.content.match(/\/\/\s*(TODO|FIXME|HACK|XXX)/gi) || []).length
      if (todoCount > 0) {
        issues.push({ severity: 'low', message: `${todoCount} TODO/FIXME comments`, file: file.path })
        deductions += 0.5
      }

      // Check for very long lines
      const longLines = lines.filter((l: string) => l.length > 200).length
      if (longLines > 3) {
        issues.push({ severity: 'low', message: `${longLines} lines exceed 200 characters`, file: file.path })
        deductions += 0.5
      }
    }
  }

  if (deductions === 0) suggestions.push('Code quality looks great!')
  if (issues.some(i => i.message.includes('any'))) suggestions.push('Replace `any` types with proper TypeScript interfaces')
  if (issues.some(i => i.message.includes('console'))) suggestions.push('Remove or replace console.log with a proper logger')
  if (issues.some(i => i.message.includes('splitting'))) suggestions.push('Break large files into smaller, focused modules')

  const score = Math.max(0, Math.min(100, 100 - deductions))
  return { score, grade: getGrade(score), issues: issues.slice(0, 10), suggestions }
}

function analyzeSecurity(files: any[]): HealthDimension {
  const issues: HealthDimension['issues'] = []
  const suggestions: string[] = []
  let deductions = 0

  for (const file of files) {
    if (!file.content || !file.path) continue
    const ext = file.path.split('.').pop()?.toLowerCase()
    if (!['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) continue

    // Check for hardcoded secrets
    if (/(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]/i.test(file.content)) {
      issues.push({ severity: 'high', message: 'Possible hardcoded secret/API key', file: file.path })
      deductions += 10
    }

    // Check for innerHTML usage (XSS risk)
    if (/dangerouslySetInnerHTML|\.innerHTML\s*=/.test(file.content)) {
      issues.push({ severity: 'high', message: 'dangerouslySetInnerHTML or innerHTML usage (XSS risk)', file: file.path })
      deductions += 5
    }

    // Check for eval usage
    if (/\beval\s*\(/.test(file.content) && !file.path.includes('node_modules')) {
      issues.push({ severity: 'high', message: 'eval() usage detected (code injection risk)', file: file.path })
      deductions += 8
    }

    // Check for SQL injection patterns
    if (/`.*\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/i.test(file.content)) {
      issues.push({ severity: 'high', message: 'Possible SQL injection via string interpolation', file: file.path })
      deductions += 8
    }

    // Check for missing input validation in API routes
    if (file.path.includes('/api/') && file.content.includes('request.json()')) {
      if (!/z\.\w+|zod|validate|schema/i.test(file.content)) {
        issues.push({ severity: 'medium', message: 'API route without input validation (consider Zod)', file: file.path })
        deductions += 3
      }
    }
  }

  if (deductions === 0) suggestions.push('No security issues detected!')
  if (issues.some(i => i.message.includes('secret'))) suggestions.push('Move secrets to environment variables')
  if (issues.some(i => i.message.includes('XSS'))) suggestions.push('Use safe rendering methods instead of dangerouslySetInnerHTML')
  if (issues.some(i => i.message.includes('validation'))) suggestions.push('Add Zod schema validation to API routes')

  const score = Math.max(0, Math.min(100, 100 - deductions))
  return { score, grade: getGrade(score), issues: issues.slice(0, 10), suggestions }
}

function analyzePerformance(files: any[]): HealthDimension {
  const issues: HealthDimension['issues'] = []
  const suggestions: string[] = []
  let deductions = 0

  let hasUseClient = false
  let totalComponents = 0
  let clientComponents = 0

  for (const file of files) {
    if (!file.content || !file.path) continue
    const ext = file.path.split('.').pop()?.toLowerCase()
    if (!['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) continue

    // Count component types
    if (ext === 'tsx' || ext === 'jsx') {
      totalComponents++
      if (file.content.includes('"use client"') || file.content.includes("'use client'")) {
        clientComponents++
        hasUseClient = true
      }
    }

    // Check for missing Image component
    if (/<img\s/i.test(file.content) && !file.content.includes('next/image')) {
      issues.push({ severity: 'medium', message: 'Using <img> instead of next/image', file: file.path })
      deductions += 2
    }

    // Check for large inline styles
    const inlineStyles = (file.content.match(/style=\{\{/g) || []).length
    if (inlineStyles > 5) {
      issues.push({ severity: 'low', message: `${inlineStyles} inline style objects (causes re-renders)`, file: file.path })
      deductions += 1
    }

    // Check for missing lazy loading
    if (file.content.includes('import(') && file.content.includes('React.lazy')) {
      // Good pattern
    }

    // Check for useEffect without cleanup
    const useEffectCount = (file.content.match(/useEffect\s*\(/g) || []).length
    if (useEffectCount > 5) {
      issues.push({ severity: 'low', message: `${useEffectCount} useEffect hooks (check for cleanup)`, file: file.path })
      deductions += 1
    }
  }

  // Client component ratio check
  if (totalComponents > 3 && clientComponents / totalComponents > 0.8) {
    issues.push({ severity: 'medium', message: `${Math.round(clientComponents / totalComponents * 100)}% components are client-side`, file: undefined })
    deductions += 3
    suggestions.push('Convert static components to server components for better performance')
  }

  if (issues.some(i => i.message.includes('next/image'))) suggestions.push('Use next/image for automatic optimization')
  if (deductions === 0) suggestions.push('Performance looks good!')

  const score = Math.max(0, Math.min(100, 100 - deductions))
  return { score, grade: getGrade(score), issues: issues.slice(0, 10), suggestions }
}

function analyzeAccessibility(files: any[]): HealthDimension {
  const issues: HealthDimension['issues'] = []
  const suggestions: string[] = []
  let deductions = 0

  for (const file of files) {
    if (!file.content || !file.path) continue
    const ext = file.path.split('.').pop()?.toLowerCase()
    if (!['tsx', 'jsx'].includes(ext || '')) continue

    // Check for images without alt text
    if (/<img[^>]*(?!alt=)[^>]*>/i.test(file.content)) {
      issues.push({ severity: 'medium', message: 'Image missing alt attribute', file: file.path })
      deductions += 3
    }

    // Check for click handlers on non-interactive elements
    if (/onClick=\{[^}]+\}/.test(file.content) && /<div[^>]*onClick/i.test(file.content)) {
      if (!/role=["']button["']/.test(file.content)) {
        issues.push({ severity: 'medium', message: 'Click handler on div without role="button"', file: file.path })
        deductions += 2
      }
    }

    // Check for missing form labels
    if (/<input[^>]*(?!aria-label)[^>]*>/i.test(file.content) && !/<label/i.test(file.content)) {
      if (!file.content.includes('aria-label')) {
        issues.push({ severity: 'low', message: 'Input without associated label or aria-label', file: file.path })
        deductions += 1
      }
    }

    // Check for color contrast (basic check for gray-on-gray patterns)
    if (/text-gray-[4-5]00.*bg-gray-[8-9]00|text-gray-[6-7]00.*bg-gray-[8-9]00/i.test(file.content)) {
      // Common but might need checking
    }
  }

  if (deductions === 0) suggestions.push('Good accessibility practices!')
  if (issues.some(i => i.message.includes('alt'))) suggestions.push('Add descriptive alt text to all images')
  if (issues.some(i => i.message.includes('role'))) suggestions.push('Add proper ARIA roles to interactive non-button elements')
  if (issues.some(i => i.message.includes('label'))) suggestions.push('Associate labels with form inputs')

  const score = Math.max(0, Math.min(100, 100 - deductions))
  return { score, grade: getGrade(score), issues: issues.slice(0, 10), suggestions }
}

function analyzeMaintainability(files: any[]): HealthDimension {
  const issues: HealthDimension['issues'] = []
  const suggestions: string[] = []
  let deductions = 0

  let hasReadme = false
  let hasEnvExample = false
  let hasTypeScript = false
  let totalFunctions = 0
  let longFunctions = 0

  for (const file of files) {
    if (!file.content || !file.path) continue

    if (file.path.toLowerCase().includes('readme')) hasReadme = true
    if (file.path.includes('.env.example') || file.path.includes('.env.local.example')) hasEnvExample = true
    if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) hasTypeScript = true

    const ext = file.path.split('.').pop()?.toLowerCase()
    if (!['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) continue

    // Check for function complexity (rough: count functions with many lines)
    const functionMatches = file.content.match(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>|(?:async\s+)?\w+\s*\([^)]*\)\s*\{)/g) || []
    totalFunctions += functionMatches.length

    // Check for deeply nested code (indentation depth)
    const lines = file.content.split('\n')
    const deepLines = lines.filter((l: string) => l.match(/^\s{16,}\S/)).length
    if (deepLines > 5) {
      issues.push({ severity: 'medium', message: `${deepLines} deeply nested lines (4+ levels)`, file: file.path })
      deductions += 2
    }

    // Check for duplicate code patterns (very rough heuristic)
    if (lines.length > 200) {
      // Large files are harder to maintain
      deductions += 1
    }
  }

  if (!hasReadme && files.length > 5) {
    issues.push({ severity: 'low', message: 'No README file found' })
    deductions += 2
    suggestions.push('Add a README with setup instructions')
  }

  if (!hasEnvExample && files.some((f: any) => f.path?.includes('.env'))) {
    issues.push({ severity: 'low', message: 'No .env.example file for documenting required env vars' })
    deductions += 1
    suggestions.push('Create a .env.example to document required environment variables')
  }

  if (hasTypeScript) {
    suggestions.push('TypeScript is enabled - good for maintainability')
  }

  if (deductions === 0) suggestions.push('Good code organization and maintainability!')

  const score = Math.max(0, Math.min(100, 100 - deductions))
  return { score, grade: getGrade(score), issues: issues.slice(0, 10), suggestions }
}
