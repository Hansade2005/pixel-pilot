import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileInput {
  path: string
  content: string
}

interface HealthIssue {
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  file?: string
  line?: number
  rule: string
}

interface HealthDimension {
  score: number
  grade: string
  issues: HealthIssue[]
  suggestions: string[]
}

interface FileHotspot {
  path: string
  lines: number
  issueCount: number
  worstSeverity: string
  dimensions: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function scanLines(lines: string[], pattern: RegExp): number[] {
  const matches: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) matches.push(i + 1)
  }
  return matches
}

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 12,
  high: 6,
  medium: 3,
  low: 1,
}

function calcScore(issues: HealthIssue[]): number {
  const d = issues.reduce((s, i) => s + (SEVERITY_WEIGHT[i.severity] || 1), 0)
  return Math.max(0, Math.min(100, 100 - d))
}

function isCodeFile(ext: string) {
  return ['ts', 'tsx', 'js', 'jsx'].includes(ext)
}

// ---------------------------------------------------------------------------
// 1. CODE QUALITY
// ---------------------------------------------------------------------------

function analyzeCodeQuality(files: FileInput[]): HealthDimension {
  const issues: HealthIssue[] = []
  const suggestions: string[] = []

  for (const file of files) {
    if (!file.content || !file.path) continue
    const lines = file.content.split('\n')
    const ext = file.path.split('.').pop()?.toLowerCase() || ''

    // Long files
    if (lines.length > 500) {
      issues.push({ severity: 'medium', message: `File has ${lines.length} lines - consider splitting`, file: file.path, rule: 'file-too-long' })
    } else if (lines.length > 300) {
      issues.push({ severity: 'low', message: `File has ${lines.length} lines - approaching split threshold`, file: file.path, rule: 'file-getting-long' })
    }

    if (!isCodeFile(ext)) continue

    // Console.log statements
    const consoleLogs = scanLines(lines, /console\.(log|debug|info)\(/).filter(ln => !lines[ln - 1].trim().startsWith('//'))
    if (consoleLogs.length > 5) {
      issues.push({ severity: 'medium', message: `${consoleLogs.length} console.log statements`, file: file.path, rule: 'no-console' })
    } else if (consoleLogs.length > 0) {
      issues.push({ severity: 'low', message: `${consoleLogs.length} console.log statement(s)`, file: file.path, rule: 'no-console' })
    }

    // 'any' type usage
    const anyCount = (file.content.match(/:\s*any\b/g) || []).length
    if (anyCount > 5) {
      issues.push({ severity: 'high', message: `${anyCount} uses of 'any' type - significantly weakens type safety`, file: file.path, rule: 'no-any' })
    } else if (anyCount > 2) {
      issues.push({ severity: 'medium', message: `${anyCount} uses of 'any' type`, file: file.path, rule: 'no-any' })
    }

    // TODO/FIXME/HACK
    const todoCount = (file.content.match(/\/\/\s*(TODO|FIXME|HACK|XXX|TEMP)\b/gi) || []).length
    if (todoCount > 3) {
      issues.push({ severity: 'medium', message: `${todoCount} TODO/FIXME/HACK comments - address technical debt`, file: file.path, rule: 'too-many-todos' })
    } else if (todoCount > 0) {
      issues.push({ severity: 'low', message: `${todoCount} TODO/FIXME comment(s)`, file: file.path, rule: 'has-todos' })
    }

    // Long lines
    const longLines = lines.filter((l: string) => l.length > 200).length
    if (longLines > 5) {
      issues.push({ severity: 'low', message: `${longLines} lines exceed 200 characters`, file: file.path, rule: 'max-line-length' })
    }

    // Deep nesting
    const deepLines = lines.filter((l: string) => /^\s{20,}\S/.test(l)).length
    if (deepLines > 5) {
      issues.push({ severity: 'medium', message: `${deepLines} deeply nested lines (5+ levels)`, file: file.path, rule: 'max-nesting' })
    }

    // Empty catch blocks
    for (const ln of scanLines(lines, /catch\s*\([^)]*\)\s*\{\s*\}/)) {
      issues.push({ severity: 'medium', message: 'Empty catch block swallows errors', file: file.path, line: ln, rule: 'no-empty-catch' })
    }

    // Duplicate code heuristic: repeated long lines
    const lineFreq: Record<string, number> = {}
    for (const l of lines) {
      const trimmed = l.trim()
      if (trimmed.length > 40) {
        lineFreq[trimmed] = (lineFreq[trimmed] || 0) + 1
      }
    }
    const dupeCount = Object.values(lineFreq).filter(c => c >= 3).length
    if (dupeCount > 3) {
      issues.push({ severity: 'low', message: `${dupeCount} code patterns repeated 3+ times - consider extraction`, file: file.path, rule: 'no-duplicate-code' })
    }

    // Commented-out code
    const commentedCode = scanLines(lines, /^\s*\/\/\s*(const|let|var|function|import|export|return|if|for|while)\s/)
    if (commentedCode.length > 5) {
      issues.push({ severity: 'low', message: `${commentedCode.length} lines of commented-out code`, file: file.path, rule: 'no-commented-code' })
    }

    // Nested ternary
    for (const ln of scanLines(lines, /\?[^:]*\?/)) {
      issues.push({ severity: 'low', message: 'Nested ternary - extract to helper', file: file.path, line: ln, rule: 'no-nested-ternary' })
    }
  }

  if (issues.length === 0) suggestions.push('Code quality looks excellent!')
  if (issues.some(i => i.rule === 'no-any')) suggestions.push('Replace `any` types with proper TypeScript interfaces')
  if (issues.some(i => i.rule === 'no-console')) suggestions.push('Remove or replace console.log with a proper logger')
  if (issues.some(i => i.rule === 'file-too-long')) suggestions.push('Break large files into smaller, focused modules')
  if (issues.some(i => i.rule === 'no-empty-catch')) suggestions.push('Add error handling in catch blocks instead of silencing errors')
  if (issues.some(i => i.rule === 'max-nesting')) suggestions.push('Reduce nesting by extracting helper functions or using early returns')

  const score = calcScore(issues)
  return { score, grade: getGrade(score), issues: issues.slice(0, 15), suggestions }
}

// ---------------------------------------------------------------------------
// 2. SECURITY
// ---------------------------------------------------------------------------

function analyzeSecurity(files: FileInput[]): HealthDimension {
  const issues: HealthIssue[] = []
  const suggestions: string[] = []

  for (const file of files) {
    if (!file.content || !file.path) continue
    const lines = file.content.split('\n')
    const ext = file.path.split('.').pop()?.toLowerCase() || ''
    if (!isCodeFile(ext)) continue

    // Hardcoded secrets
    for (const ln of scanLines(lines, /(?:api[_-]?key|secret|password|passwd|token|auth[_-]?key|private[_-]?key)\s*[:=]\s*['"`][^'"`\n]{8,}['"`]/i)) {
      issues.push({ severity: 'critical', message: 'Hardcoded secret or API key detected', file: file.path, line: ln, rule: 'no-hardcoded-secrets' })
    }

    // innerHTML / dangerouslySetInnerHTML
    for (const ln of scanLines(lines, /dangerouslySetInnerHTML|\.innerHTML\s*=/)) {
      issues.push({ severity: 'high', message: 'XSS risk: dangerouslySetInnerHTML or innerHTML', file: file.path, line: ln, rule: 'no-inner-html' })
    }

    // eval()
    for (const ln of scanLines(lines, /\beval\s*\(/)) {
      if (!lines[ln - 1].trim().startsWith('//')) {
        issues.push({ severity: 'critical', message: 'eval() usage - code injection risk', file: file.path, line: ln, rule: 'no-eval' })
      }
    }

    // new Function()
    for (const ln of scanLines(lines, /new\s+Function\s*\(/)) {
      issues.push({ severity: 'critical', message: 'new Function() - equivalent to eval()', file: file.path, line: ln, rule: 'no-new-function' })
    }

    // SQL injection
    for (const ln of scanLines(lines, /(?:SELECT|INSERT|UPDATE|DELETE|DROP)\b[^`]*\$\{/i)) {
      issues.push({ severity: 'critical', message: 'Possible SQL injection via string interpolation', file: file.path, line: ln, rule: 'no-sql-injection' })
    }

    // Missing input validation in API routes
    if (file.path.includes('/api/') && file.content.includes('request.json()')) {
      if (!/z\.\w+|zod|validate|schema|\.parse\(|\.safeParse\(/i.test(file.content)) {
        issues.push({ severity: 'medium', message: 'API route without input validation', file: file.path, rule: 'api-input-validation' })
      }
    }

    // Missing auth in mutation API routes
    if (file.path.includes('/api/') && /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)/i.test(file.content)) {
      if (!/getUser|getSession|auth|authorization|bearer|verifyToken/i.test(file.content)) {
        issues.push({ severity: 'high', message: 'Mutation API route without auth check', file: file.path, rule: 'api-auth-required' })
      }
    }

    // document.write
    for (const ln of scanLines(lines, /document\.write\s*\(/)) {
      issues.push({ severity: 'high', message: 'document.write() - security and performance risk', file: file.path, line: ln, rule: 'no-document-write' })
    }

    // Open redirect
    for (const ln of scanLines(lines, /window\.location\s*=\s*[^'"`]|location\.href\s*=\s*[^'"`]/)) {
      issues.push({ severity: 'high', message: 'Dynamic URL assignment - open redirect risk', file: file.path, line: ln, rule: 'no-open-redirect' })
    }

    // CORS wildcard
    for (const ln of scanLines(lines, /['"]Access-Control-Allow-Origin['"]\s*[:,]\s*['"]?\*/)) {
      issues.push({ severity: 'medium', message: 'CORS wildcard allows any origin', file: file.path, line: ln, rule: 'no-cors-wildcard' })
    }

    // Insecure randomness
    for (const ln of scanLines(lines, /Math\.random\(\)/)) {
      if (/token|secret|key|password|hash|id|session/i.test(lines[ln - 1])) {
        issues.push({ severity: 'high', message: 'Math.random() used for security-sensitive value', file: file.path, line: ln, rule: 'no-insecure-random' })
      }
    }

    // HTTP URLs (non-localhost)
    for (const ln of scanLines(lines, /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/)) {
      if (!lines[ln - 1].trim().startsWith('//') && !lines[ln - 1].trim().startsWith('*')) {
        issues.push({ severity: 'low', message: 'HTTP URL - prefer HTTPS', file: file.path, line: ln, rule: 'prefer-https' })
      }
    }
  }

  if (issues.length === 0) suggestions.push('No security issues detected!')
  if (issues.some(i => i.rule === 'no-hardcoded-secrets')) suggestions.push('Move secrets to environment variables')
  if (issues.some(i => i.rule === 'no-inner-html')) suggestions.push('Use safe rendering methods instead of dangerouslySetInnerHTML')
  if (issues.some(i => i.rule === 'api-input-validation')) suggestions.push('Add Zod schema validation to API routes')
  if (issues.some(i => i.rule === 'api-auth-required')) suggestions.push('Add authentication checks to mutation API routes')
  if (issues.some(i => i.rule === 'no-sql-injection')) suggestions.push('Use parameterized queries instead of string interpolation')

  const score = calcScore(issues)
  return { score, grade: getGrade(score), issues: issues.slice(0, 15), suggestions }
}

// ---------------------------------------------------------------------------
// 3. PERFORMANCE
// ---------------------------------------------------------------------------

function analyzePerformance(files: FileInput[]): HealthDimension {
  const issues: HealthIssue[] = []
  const suggestions: string[] = []

  let totalComponents = 0
  let clientComponents = 0

  for (const file of files) {
    if (!file.content || !file.path) continue
    const lines = file.content.split('\n')
    const ext = file.path.split('.').pop()?.toLowerCase() || ''
    if (!isCodeFile(ext)) continue

    // Track component types
    if (ext === 'tsx' || ext === 'jsx') {
      totalComponents++
      if (file.content.includes('"use client"') || file.content.includes("'use client'")) {
        clientComponents++
      }
    }

    // Missing next/image
    for (const ln of scanLines(lines, /<img\s/i)) {
      if (!file.content.includes('next/image')) {
        issues.push({ severity: 'medium', message: 'Using <img> instead of next/image', file: file.path, line: ln, rule: 'use-next-image' })
      }
    }

    // Inline style objects
    const inlineStyles = (file.content.match(/style=\{\{/g) || []).length
    if (inlineStyles > 5) {
      issues.push({ severity: 'low', message: `${inlineStyles} inline style objects (trigger re-renders)`, file: file.path, rule: 'no-inline-styles' })
    }

    // Too many useEffect
    const useEffectCount = (file.content.match(/useEffect\s*\(/g) || []).length
    if (useEffectCount > 5) {
      issues.push({ severity: 'medium', message: `${useEffectCount} useEffect hooks - consolidate or refactor`, file: file.path, rule: 'too-many-effects' })
    }

    // Excessive useState
    const stateCount = (file.content.match(/useState\s*[<(]/g) || []).length
    if (stateCount > 8) {
      issues.push({ severity: 'low', message: `${stateCount} useState hooks - some may be derivable`, file: file.path, rule: 'too-many-states' })
    }

    // Large component without memoization
    if (lines.length > 200 && /export\s+(default\s+)?function/.test(file.content)) {
      if (!/React\.memo|useMemo|useCallback/.test(file.content)) {
        issues.push({ severity: 'low', message: 'Large component without memoization', file: file.path, rule: 'consider-memo' })
      }
    }

    // Heavy packages
    const heavyPkgs = [
      { name: 'moment', alt: 'date-fns or dayjs' },
      { name: 'lodash', alt: 'lodash-es or native methods' },
      { name: 'jquery', alt: 'native DOM APIs' },
    ]
    for (const pkg of heavyPkgs) {
      const re = new RegExp(`from\\s+['"]${pkg.name}['"]`)
      for (const ln of scanLines(lines, re)) {
        issues.push({ severity: 'medium', message: `Heavy package '${pkg.name}' - consider ${pkg.alt}`, file: file.path, line: ln, rule: 'no-heavy-packages' })
      }
    }

    // N+1 queries
    for (const ln of scanLines(lines, /for\s*\(|\.forEach\s*\(|\.map\s*\(/)) {
      const body = lines.slice(ln - 1, Math.min(ln + 10, lines.length)).join(' ')
      if (/await\s+fetch|await\s+supabase|\.query\s*\(/.test(body)) {
        issues.push({ severity: 'high', message: 'Async operation inside loop - N+1 query risk', file: file.path, line: ln, rule: 'no-n-plus-1' })
      }
    }

    // External fonts
    if (file.content.includes('fonts.googleapis.com')) {
      issues.push({ severity: 'medium', message: 'External Google Fonts - use next/font for zero layout shift', file: file.path, rule: 'use-next-font' })
    }

    // Dynamic import without Suspense
    if (/import\s*\(/.test(file.content) && !/Suspense|loading|fallback/i.test(file.content)) {
      issues.push({ severity: 'low', message: 'Dynamic import without Suspense boundary', file: file.path, rule: 'dynamic-import-suspense' })
    }
  }

  // Client component ratio
  if (totalComponents > 3 && clientComponents / totalComponents > 0.8) {
    const pct = Math.round(clientComponents / totalComponents * 100)
    issues.push({ severity: 'medium', message: `${pct}% components are client-side - convert static ones to server components`, rule: 'client-component-ratio' })
    suggestions.push('Convert static components to server components for better performance')
  }

  if (issues.length === 0) suggestions.push('Performance looks good!')
  if (issues.some(i => i.rule === 'use-next-image')) suggestions.push('Use next/image for automatic optimization and lazy loading')
  if (issues.some(i => i.rule === 'no-n-plus-1')) suggestions.push('Batch API calls using Promise.all() instead of sequential loops')
  if (issues.some(i => i.rule === 'no-heavy-packages')) suggestions.push('Replace heavy packages with lightweight alternatives')

  const score = calcScore(issues)
  return { score, grade: getGrade(score), issues: issues.slice(0, 15), suggestions }
}

// ---------------------------------------------------------------------------
// 4. ACCESSIBILITY
// ---------------------------------------------------------------------------

function analyzeAccessibility(files: FileInput[]): HealthDimension {
  const issues: HealthIssue[] = []
  const suggestions: string[] = []

  for (const file of files) {
    if (!file.content || !file.path) continue
    const ext = file.path.split('.').pop()?.toLowerCase() || ''
    if (!['tsx', 'jsx'].includes(ext)) continue
    const lines = file.content.split('\n')

    // Images without alt
    for (const ln of scanLines(lines, /<img\b[^>]*(?!.*\balt\s*=)[^>]*>/i)) {
      issues.push({ severity: 'high', message: 'Image missing alt attribute', file: file.path, line: ln, rule: 'img-alt' })
    }

    // Empty alt on non-decorative images
    for (const ln of scanLines(lines, /alt=["']\s*["']/)) {
      issues.push({ severity: 'low', message: 'Empty alt - use descriptive text or confirm decorative', file: file.path, line: ln, rule: 'img-alt-meaningful' })
    }

    // Click on div/span without role
    for (const ln of scanLines(lines, /<(?:div|span)[^>]*onClick/i)) {
      if (!/role=["']button["']|tabIndex/i.test(lines[ln - 1])) {
        issues.push({ severity: 'medium', message: 'onClick on non-interactive element without role/tabIndex', file: file.path, line: ln, rule: 'click-events' })
      }
    }

    // Missing form labels
    for (const ln of scanLines(lines, /<input\b/i)) {
      const ctx = lines.slice(Math.max(0, ln - 3), Math.min(ln + 2, lines.length)).join(' ')
      if (!/aria-label|aria-labelledby|<label|htmlFor/i.test(ctx) && !/type=["']hidden["']/i.test(lines[ln - 1])) {
        issues.push({ severity: 'medium', message: 'Input without label or aria-label', file: file.path, line: ln, rule: 'form-label' })
      }
    }

    // Heading hierarchy
    const headingLevels: number[] = []
    for (const ln of scanLines(lines, /<h([1-6])\b/i)) {
      const m = lines[ln - 1].match(/<h([1-6])\b/i)
      if (m) headingLevels.push(parseInt(m[1]))
    }
    for (let i = 1; i < headingLevels.length; i++) {
      if (headingLevels[i] - headingLevels[i - 1] > 1) {
        issues.push({ severity: 'low', message: `Heading skip: h${headingLevels[i - 1]} to h${headingLevels[i]}`, file: file.path, rule: 'heading-order' })
        break
      }
    }

    // Missing lang on <html>
    if ((file.path.includes('layout') || file.path.includes('_document')) && /<html\b/i.test(file.content) && !/lang=/.test(file.content)) {
      issues.push({ severity: 'medium', message: 'HTML element missing lang attribute', file: file.path, rule: 'html-has-lang' })
    }

    // Autoplay media
    for (const ln of scanLines(lines, /<(?:video|audio)[^>]*autoplay/i)) {
      issues.push({ severity: 'medium', message: 'Media with autoplay can disorient users', file: file.path, line: ln, rule: 'no-autoplay' })
    }

    // Positive tabIndex
    for (const ln of scanLines(lines, /tabIndex=\{?["']?[1-9]/)) {
      issues.push({ severity: 'medium', message: 'Positive tabIndex disrupts natural tab order', file: file.path, line: ln, rule: 'no-positive-tabindex' })
    }

    // Color-only indicators
    for (const ln of scanLines(lines, /(?:text|bg)-(?:red|green|yellow)-\d+/)) {
      if (/error|success|warning|status/i.test(lines[ln - 1]) && !/aria-label|role=["']alert|sr-only/i.test(lines[ln - 1])) {
        issues.push({ severity: 'low', message: 'Color-only status indicator without text alternative', file: file.path, line: ln, rule: 'color-only' })
      }
    }

    // Missing focus styles
    if (/onClick=/.test(file.content) && !/focus:|focus-visible:|:focus/i.test(file.content)) {
      issues.push({ severity: 'low', message: 'Interactive elements may lack visible focus styles', file: file.path, rule: 'focus-visible' })
    }
  }

  if (issues.length === 0) suggestions.push('Good accessibility practices!')
  if (issues.some(i => i.rule === 'img-alt')) suggestions.push('Add descriptive alt text to all images')
  if (issues.some(i => i.rule === 'click-events')) suggestions.push('Add role="button" and tabIndex={0} to interactive non-button elements')
  if (issues.some(i => i.rule === 'form-label')) suggestions.push('Associate labels with form inputs using htmlFor or aria-label')
  if (issues.some(i => i.rule === 'focus-visible')) suggestions.push('Add focus-visible styles to all interactive elements')

  const score = calcScore(issues)
  return { score, grade: getGrade(score), issues: issues.slice(0, 15), suggestions }
}

// ---------------------------------------------------------------------------
// 5. MAINTAINABILITY
// ---------------------------------------------------------------------------

function analyzeMaintainability(files: FileInput[]): HealthDimension {
  const issues: HealthIssue[] = []
  const suggestions: string[] = []

  let hasReadme = false
  let hasEnvExample = false
  let hasTypeScript = false
  let hasEslint = false
  let hasPrettier = false
  let totalFunctions = 0

  for (const file of files) {
    if (!file.content || !file.path) continue

    const lowerPath = file.path.toLowerCase()
    if (lowerPath.includes('readme')) hasReadme = true
    if (lowerPath.includes('.env.example') || lowerPath.includes('.env.local.example')) hasEnvExample = true
    if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) hasTypeScript = true
    if (lowerPath.includes('eslint')) hasEslint = true
    if (lowerPath.includes('prettier')) hasPrettier = true

    const ext = file.path.split('.').pop()?.toLowerCase() || ''
    if (!isCodeFile(ext)) continue

    const lines = file.content.split('\n')

    // Function count
    const fnMatches = file.content.match(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>)/g) || []
    totalFunctions += fnMatches.length

    // Deep nesting
    const deepLines = lines.filter((l: string) => /^\s{16,}\S/.test(l)).length
    if (deepLines > 5) {
      issues.push({ severity: 'medium', message: `${deepLines} deeply nested lines (4+ levels)`, file: file.path, rule: 'max-nesting' })
    }

    // Many parameters
    for (const ln of scanLines(lines, /\(\s*\w+\s*(?::\s*\w+)?\s*,\s*\w+\s*(?::\s*\w+)?\s*,\s*\w+\s*(?::\s*\w+)?\s*,\s*\w+\s*(?::\s*\w+)?\s*,\s*\w+/)) {
      issues.push({ severity: 'low', message: 'Function with 5+ params - use options object', file: file.path, line: ln, rule: 'max-params' })
    }

    // Inconsistent error handling
    const tryCatch = (file.content.match(/try\s*\{/g) || []).length
    const awaitCount = (file.content.match(/await\s/g) || []).length
    if (awaitCount > 5 && tryCatch === 0) {
      issues.push({ severity: 'medium', message: 'Multiple async ops without try/catch', file: file.path, rule: 'async-error-handling' })
    }

    // Large files without structure
    if (lines.length > 200) {
      issues.push({ severity: 'low', message: `Large file (${lines.length} lines) may be hard to maintain`, file: file.path, rule: 'large-file' })
    }

    // Duplicate string literals
    const strFreq: Record<string, number> = {}
    for (const l of lines) {
      const matches = l.match(/['"]([^'"]{10,})['"]|`([^`]{10,})`/g) || []
      for (const m of matches) {
        const key = m.slice(1, -1)
        strFreq[key] = (strFreq[key] || 0) + 1
      }
    }
    const dupes = Object.values(strFreq).filter(c => c >= 3).length
    if (dupes > 2) {
      issues.push({ severity: 'low', message: `${dupes} string literals repeated 3+ times`, file: file.path, rule: 'no-duplicate-strings' })
    }

    // Magic numbers
    const magicLines = scanLines(lines, /(?:===?|!==?|[<>]=?|return|=)\s*(?!0\b|1\b|-1\b|2\b|100\b)\d{3,}/)
    if (magicLines.length > 3) {
      issues.push({ severity: 'low', message: `${magicLines.length} magic numbers - use named constants`, file: file.path, rule: 'no-magic-numbers' })
    }
  }

  // Project-level checks
  if (!hasReadme && files.length > 5) {
    issues.push({ severity: 'medium', message: 'No README file found', rule: 'has-readme' })
    suggestions.push('Add a README with setup instructions')
  }
  if (!hasEnvExample && files.some(f => f.path?.includes('.env'))) {
    issues.push({ severity: 'low', message: 'No .env.example file', rule: 'has-env-example' })
    suggestions.push('Create .env.example to document required variables')
  }
  if (!hasEslint && files.length > 5) {
    issues.push({ severity: 'low', message: 'No ESLint configuration found', rule: 'has-eslint' })
    suggestions.push('Add ESLint for automated code quality checks')
  }
  if (hasTypeScript) suggestions.push('TypeScript enabled - great for maintainability')
  if (issues.length === 0) suggestions.push('Good code organization!')
  if (issues.some(i => i.rule === 'max-nesting')) suggestions.push('Reduce nesting with early returns and extracted functions')
  if (issues.some(i => i.rule === 'async-error-handling')) suggestions.push('Add try/catch to async operations')

  const score = calcScore(issues)
  return { score, grade: getGrade(score), issues: issues.slice(0, 15), suggestions }
}

// ---------------------------------------------------------------------------
// 6. SEO (NEW)
// ---------------------------------------------------------------------------

function analyzeSEO(files: FileInput[]): HealthDimension {
  const issues: HealthIssue[] = []
  const suggestions: string[] = []

  let hasMetadata = false
  let hasSitemap = false
  let hasRobots = false
  let hasManifest = false

  for (const file of files) {
    if (!file.content || !file.path) continue
    const lowerPath = file.path.toLowerCase()

    if (lowerPath.includes('sitemap')) hasSitemap = true
    if (lowerPath.includes('robots')) hasRobots = true
    if (lowerPath.includes('manifest')) hasManifest = true

    const ext = file.path.split('.').pop()?.toLowerCase() || ''

    // Check page files for metadata
    if (file.path.includes('page.') && isCodeFile(ext)) {
      if (/metadata|generateMetadata/i.test(file.content)) {
        hasMetadata = true
      } else if (!file.path.includes('api/')) {
        issues.push({ severity: 'medium', message: 'Page without metadata export for SEO', file: file.path, rule: 'page-metadata' })
      }
    }

    // Check layout for OG/Twitter meta
    if (file.path.includes('layout.') && isCodeFile(ext)) {
      if (!/openGraph|og:|twitter:card|TwitterCard/i.test(file.content)) {
        issues.push({ severity: 'low', message: 'Layout missing Open Graph / Twitter card metadata', file: file.path, rule: 'og-meta' })
      }
    }

    // Check for semantic HTML
    if (['tsx', 'jsx'].includes(ext)) {
      const lines = file.content.split('\n')
      // Check for div-soup (pages with no semantic elements)
      if (file.path.includes('page.') && file.content.length > 500) {
        if (!/<(?:main|article|section|nav|header|footer|aside)\b/i.test(file.content)) {
          issues.push({ severity: 'low', message: 'Page without semantic HTML elements (main, article, section)', file: file.path, rule: 'semantic-html' })
        }
      }

      // Missing title / H1
      if (file.path.includes('page.') && !/<h1\b/i.test(file.content) && !file.path.includes('api/')) {
        issues.push({ severity: 'low', message: 'Page without H1 heading', file: file.path, rule: 'page-h1' })
      }
    }
  }

  // Project-level SEO checks
  if (!hasSitemap && files.length > 10) {
    issues.push({ severity: 'medium', message: 'No sitemap.xml found', rule: 'has-sitemap' })
    suggestions.push('Add a sitemap.xml or sitemap.ts for search engine indexing')
  }
  if (!hasRobots) {
    issues.push({ severity: 'low', message: 'No robots.txt found', rule: 'has-robots' })
    suggestions.push('Add robots.txt to control search engine crawling')
  }
  if (!hasManifest) {
    issues.push({ severity: 'low', message: 'No web manifest found', rule: 'has-manifest' })
    suggestions.push('Add manifest.json for PWA support and better mobile experience')
  }

  if (issues.length === 0) suggestions.push('SEO configuration looks good!')
  if (issues.some(i => i.rule === 'page-metadata')) suggestions.push('Export metadata from page components for better SEO')
  if (issues.some(i => i.rule === 'semantic-html')) suggestions.push('Use semantic HTML elements for better content structure')

  const score = calcScore(issues)
  return { score, grade: getGrade(score), issues: issues.slice(0, 15), suggestions }
}

// ---------------------------------------------------------------------------
// 7. ERROR HANDLING (NEW)
// ---------------------------------------------------------------------------

function analyzeErrorHandling(files: FileInput[]): HealthDimension {
  const issues: HealthIssue[] = []
  const suggestions: string[] = []

  let hasErrorBoundary = false
  let hasGlobalErrorPage = false
  let hasNotFoundPage = false

  for (const file of files) {
    if (!file.content || !file.path) continue
    const ext = file.path.split('.').pop()?.toLowerCase() || ''

    if (file.path.includes('error.') && isCodeFile(ext)) hasGlobalErrorPage = true
    if (file.path.includes('not-found.') && isCodeFile(ext)) hasNotFoundPage = true
    if (/ErrorBoundary|componentDidCatch/.test(file.content)) hasErrorBoundary = true

    if (!isCodeFile(ext)) continue
    const lines = file.content.split('\n')

    // Empty catch blocks
    for (const ln of scanLines(lines, /catch\s*\([^)]*\)\s*\{\s*\}/)) {
      issues.push({ severity: 'high', message: 'Empty catch block silently swallows errors', file: file.path, line: ln, rule: 'no-empty-catch' })
    }

    // catch with only console.error (should at least show user feedback)
    for (const ln of scanLines(lines, /catch\s*\([^)]*\)\s*\{[\s]*console\.error/)) {
      const catchBody = lines.slice(ln - 1, Math.min(ln + 5, lines.length)).join(' ')
      if (!/setError|toast|alert|throw|return.*error|setState/i.test(catchBody)) {
        issues.push({ severity: 'low', message: 'Catch block only logs error without user feedback', file: file.path, line: ln, rule: 'catch-user-feedback' })
      }
    }

    // Unhandled promise (.then without .catch)
    for (const ln of scanLines(lines, /\.then\s*\(/)) {
      const ctx = lines.slice(ln - 1, Math.min(ln + 5, lines.length)).join(' ')
      if (!ctx.includes('.catch')) {
        issues.push({ severity: 'medium', message: '.then() without .catch() - unhandled rejection', file: file.path, line: ln, rule: 'unhandled-rejection' })
      }
    }

    // Async without try/catch in API routes
    if (file.path.includes('/api/') && /export\s+async\s+function/.test(file.content)) {
      if (!/try\s*\{/.test(file.content)) {
        issues.push({ severity: 'high', message: 'API handler without try/catch wrapping', file: file.path, rule: 'api-try-catch' })
      }
    }

    // Fetch without error check
    for (const ln of scanLines(lines, /await\s+fetch\s*\(/)) {
      const ctx = lines.slice(ln - 1, Math.min(ln + 5, lines.length)).join(' ')
      if (!/\.ok|\.status|res\.ok|response\.ok|if\s*\(!|throw/i.test(ctx)) {
        issues.push({ severity: 'medium', message: 'fetch() without response status check', file: file.path, line: ln, rule: 'fetch-error-check' })
      }
    }

    // Missing loading/error states in components
    if (['tsx', 'jsx'].includes(ext) && /fetch\(|useSWR|useQuery/i.test(file.content)) {
      if (!/loading|isLoading|isPending|Skeleton|Loader/i.test(file.content)) {
        issues.push({ severity: 'low', message: 'Data fetching without loading state', file: file.path, rule: 'loading-state' })
      }
      if (!/error|isError|Error|setError/i.test(file.content)) {
        issues.push({ severity: 'medium', message: 'Data fetching without error state', file: file.path, rule: 'error-state' })
      }
    }
  }

  // Project-level checks
  if (!hasGlobalErrorPage && files.length > 5) {
    issues.push({ severity: 'medium', message: 'No error.tsx page for global error handling', rule: 'global-error-page' })
    suggestions.push('Create error.tsx for user-friendly error pages')
  }
  if (!hasNotFoundPage && files.length > 5) {
    issues.push({ severity: 'low', message: 'No not-found.tsx for 404 page', rule: 'not-found-page' })
    suggestions.push('Create not-found.tsx for custom 404 pages')
  }

  if (issues.length === 0) suggestions.push('Error handling looks solid!')
  if (issues.some(i => i.rule === 'no-empty-catch')) suggestions.push('Handle errors in catch blocks - log, show user feedback, or rethrow')
  if (issues.some(i => i.rule === 'unhandled-rejection')) suggestions.push('Add .catch() to all promise chains')
  if (issues.some(i => i.rule === 'fetch-error-check')) suggestions.push('Always check response.ok after fetch calls')

  const score = calcScore(issues)
  return { score, grade: getGrade(score), issues: issues.slice(0, 15), suggestions }
}

// ---------------------------------------------------------------------------
// 8. BEST PRACTICES (NEW)
// ---------------------------------------------------------------------------

function analyzeBestPractices(files: FileInput[]): HealthDimension {
  const issues: HealthIssue[] = []
  const suggestions: string[] = []

  for (const file of files) {
    if (!file.content || !file.path) continue
    const ext = file.path.split('.').pop()?.toLowerCase() || ''
    if (!isCodeFile(ext)) continue
    const lines = file.content.split('\n')

    // var instead of const/let
    for (const ln of scanLines(lines, /\bvar\s+\w/)) {
      if (!lines[ln - 1].trim().startsWith('//')) {
        issues.push({ severity: 'low', message: 'var declaration - prefer const or let', file: file.path, line: ln, rule: 'no-var' })
      }
    }

    // Loose equality
    for (const ln of scanLines(lines, /[^!=]==[^=]/)) {
      if (!/==\s*null|==\s*undefined/.test(lines[ln - 1])) {
        issues.push({ severity: 'low', message: 'Loose equality (==) - prefer strict (===)', file: file.path, line: ln, rule: 'eqeqeq' })
      }
    }

    // Direct state mutation
    for (const ln of scanLines(lines, /\.push\(|\.splice\(|\.sort\(|\.reverse\(\)/)) {
      const ctx = lines.slice(Math.max(0, ln - 5), ln).join(' ')
      if (/useState|state/i.test(ctx) && !lines[ln - 1].includes('[...')) {
        issues.push({ severity: 'medium', message: 'Possible direct state mutation', file: file.path, line: ln, rule: 'no-state-mutation' })
      }
    }

    // Index as key
    for (const ln of scanLines(lines, /key=\{(?:i|index|idx)\}/)) {
      issues.push({ severity: 'low', message: 'Array index used as key - prefer stable IDs', file: file.path, line: ln, rule: 'no-index-key' })
    }

    // Deprecated React patterns
    for (const ln of scanLines(lines, /componentWillMount|componentWillReceiveProps|componentWillUpdate/)) {
      issues.push({ severity: 'medium', message: 'Deprecated React lifecycle method', file: file.path, line: ln, rule: 'no-deprecated-react' })
    }

    // Suspense without ErrorBoundary
    if (file.content.includes('Suspense') && !/ErrorBoundary|error\.tsx/.test(file.content)) {
      issues.push({ severity: 'low', message: 'Suspense without ErrorBoundary fallback', file: file.path, rule: 'suspense-error-boundary' })
    }

    // useEffect with empty deps that uses state/props
    for (const ln of scanLines(lines, /useEffect\s*\(\s*\(\)\s*=>\s*\{/)) {
      const effectSlice = lines.slice(ln - 1, Math.min(ln + 15, lines.length)).join('\n')
      if (/\},\s*\[\s*\]\s*\)/.test(effectSlice)) {
        const body = effectSlice.slice(0, effectSlice.indexOf('}, ['))
        if (/\bprops\b|\.length\b|setInterval|addEventListener/i.test(body)) {
          issues.push({ severity: 'low', message: 'useEffect with [] deps may be missing dependencies', file: file.path, line: ln, rule: 'exhaustive-deps' })
        }
      }
    }

    // Non-descriptive variable names
    const badNameLines = scanLines(lines, /(?:const|let)\s+(?:temp|tmp|foo|bar|baz|data2|result2)\s*[=:]/)
    if (badNameLines.length > 0) {
      issues.push({ severity: 'low', message: 'Non-descriptive variable name(s)', file: file.path, line: badNameLines[0], rule: 'descriptive-names' })
    }
  }

  if (issues.length === 0) suggestions.push('Great adherence to best practices!')
  if (issues.some(i => i.rule === 'no-var')) suggestions.push('Migrate var to const/let for proper scoping')
  if (issues.some(i => i.rule === 'no-state-mutation')) suggestions.push('Use immutable patterns for state updates (spread, map, filter)')
  if (issues.some(i => i.rule === 'eqeqeq')) suggestions.push('Use === for strict equality comparisons')

  const score = calcScore(issues)
  return { score, grade: getGrade(score), issues: issues.slice(0, 15), suggestions }
}

// ---------------------------------------------------------------------------
// File Hotspot Detection
// ---------------------------------------------------------------------------

function computeFileHotspots(files: FileInput[], dimensions: Record<string, HealthDimension>): FileHotspot[] {
  const hotspotMap: Record<string, FileHotspot> = {}

  for (const [dimName, dim] of Object.entries(dimensions)) {
    for (const issue of dim.issues) {
      const fp = issue.file || 'project'
      if (!hotspotMap[fp]) {
        const f = files.find(f => f.path === fp)
        hotspotMap[fp] = {
          path: fp,
          lines: f ? f.content.split('\n').length : 0,
          issueCount: 0,
          worstSeverity: 'low',
          dimensions: [],
        }
      }
      hotspotMap[fp].issueCount++
      if (!hotspotMap[fp].dimensions.includes(dimName)) {
        hotspotMap[fp].dimensions.push(dimName)
      }
      // Track worst severity
      const order = { critical: 4, high: 3, medium: 2, low: 1 }
      if ((order[issue.severity as keyof typeof order] || 0) > (order[hotspotMap[fp].worstSeverity as keyof typeof order] || 0)) {
        hotspotMap[fp].worstSeverity = issue.severity
      }
    }
  }

  return Object.values(hotspotMap)
    .filter(h => h.issueCount > 0)
    .sort((a, b) => b.issueCount - a.issueCount)
    .slice(0, 15)
}

// ---------------------------------------------------------------------------
// Priority Recommendations
// ---------------------------------------------------------------------------

function generateRecommendations(dimensions: Record<string, HealthDimension>): Array<{ priority: 'critical' | 'high' | 'medium' | 'low'; dimension: string; message: string }> {
  const recs: Array<{ priority: 'critical' | 'high' | 'medium' | 'low'; dimension: string; message: string }> = []

  for (const [name, dim] of Object.entries(dimensions)) {
    if (dim.score < 50) {
      recs.push({ priority: 'critical', dimension: name, message: `${name} score is critically low (${dim.score}/100) - immediate attention needed` })
    } else if (dim.score < 70) {
      recs.push({ priority: 'high', dimension: name, message: `${name} score is below average (${dim.score}/100) - prioritize improvements` })
    }

    // Dimension-specific critical recommendations
    const criticalIssues = dim.issues.filter(i => i.severity === 'critical')
    if (criticalIssues.length > 0) {
      recs.push({ priority: 'critical', dimension: name, message: `${criticalIssues.length} critical ${name.toLowerCase()} issue(s) require immediate fix` })
    }
  }

  return recs.sort((a, b) => {
    const o = { critical: 0, high: 1, medium: 2, low: 3 }
    return o[a.priority] - o[b.priority]
  }).slice(0, 10)
}

// ---------------------------------------------------------------------------
// API Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { files } = body

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'Files array is required' }, { status: 400 })
    }

    // Run all 8 dimension analyzers
    const codeQuality = analyzeCodeQuality(files)
    const security = analyzeSecurity(files)
    const performance = analyzePerformance(files)
    const accessibility = analyzeAccessibility(files)
    const maintainability = analyzeMaintainability(files)
    const seo = analyzeSEO(files)
    const errorHandling = analyzeErrorHandling(files)
    const bestPractices = analyzeBestPractices(files)

    const dimensions = {
      codeQuality,
      security,
      performance,
      accessibility,
      maintainability,
      seo,
      errorHandling,
      bestPractices,
    }

    // Weighted overall score (security and error handling weigh more)
    const weights = {
      codeQuality: 1.0,
      security: 1.5,
      performance: 1.0,
      accessibility: 0.8,
      maintainability: 1.0,
      seo: 0.7,
      errorHandling: 1.2,
      bestPractices: 0.8,
    }

    let weightedSum = 0
    let totalWeight = 0
    for (const [key, dim] of Object.entries(dimensions)) {
      const w = weights[key as keyof typeof weights] || 1.0
      weightedSum += dim.score * w
      totalWeight += w
    }
    const overallScore = Math.round(weightedSum / totalWeight)

    // Total issue count and stats
    const totalIssues = Object.values(dimensions).reduce((s, d) => s + d.issues.length, 0)
    const codeFiles = files.filter(f => f.content && f.path && isCodeFile(f.path.split('.').pop()?.toLowerCase() || ''))
    const totalLines = files.reduce((sum: number, f: FileInput) => sum + (f.content?.split('\n').length || 0), 0)

    // Compute hotspots and recommendations
    const fileHotspots = computeFileHotspots(files, dimensions)
    const recommendations = generateRecommendations(dimensions)

    return NextResponse.json({
      overall: {
        score: overallScore,
        grade: getGrade(overallScore),
        totalFiles: files.length,
        codeFiles: codeFiles.length,
        totalLines,
        totalIssues,
        dimensionCount: Object.keys(dimensions).length,
      },
      dimensions,
      fileHotspots,
      recommendations,
    })
  } catch (error) {
    console.error('[HealthScore] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
