import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string
  message: string
  file: string
  line?: number
  rule: string
}

interface CategorySummary {
  score: number
  grade: string
  issueCount: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  infoCount: number
}

interface FileMetrics {
  path: string
  lines: number
  complexity: number
  issueCount: number
  topIssues: string[]
}

interface ReviewAnalysis {
  score: number
  grade: string
  issues: Issue[]
  suggestions: Array<{ category: string; message: string; priority: 'high' | 'medium' | 'low' }>
  categories: Record<string, CategorySummary>
  fileMetrics: FileMetrics[]
  stats: {
    totalFiles: number
    totalLines: number
    totalFunctions: number
    avgComplexity: number
    rulesChecked: number
  }
}

// ---------------------------------------------------------------------------
// Severity weights for scoring
// ---------------------------------------------------------------------------

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 15,
  high: 8,
  medium: 4,
  low: 1.5,
  info: 0.5,
}

function getGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

// ---------------------------------------------------------------------------
// Helper: scan lines for pattern matches
// ---------------------------------------------------------------------------

function scanLines(lines: string[], pattern: RegExp): number[] {
  const matches: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) matches.push(i + 1)
  }
  return matches
}

// ---------------------------------------------------------------------------
// Helper: estimate cyclomatic complexity for a function body
// ---------------------------------------------------------------------------

function estimateComplexity(content: string): number {
  let c = 1
  const branches = /\b(if|else if|case|for|while|do|catch|\?\?|&&|\|\||\?)\b/g
  let m
  while ((m = branches.exec(content)) !== null) c++
  return c
}

// ---------------------------------------------------------------------------
// SECURITY rules (expanded)
// ---------------------------------------------------------------------------

function checkSecurity(file: { path: string; content: string }, lines: string[]): Issue[] {
  const issues: Issue[] = []
  const fp = file.path

  // 1. Hardcoded secrets (API keys, passwords, tokens)
  const secretPattern = /(?:api[_-]?key|secret|password|passwd|token|auth[_-]?key|private[_-]?key|access[_-]?key)\s*[:=]\s*['"`][^'"`\n]{8,}['"`]/i
  for (const ln of scanLines(lines, secretPattern)) {
    issues.push({ severity: 'critical', category: 'Security', message: 'Hardcoded secret or API key detected', file: fp, line: ln, rule: 'no-hardcoded-secrets' })
  }

  // 2. eval() usage
  for (const ln of scanLines(lines, /\beval\s*\(/)) {
    if (!lines[ln - 1].trim().startsWith('//')) {
      issues.push({ severity: 'critical', category: 'Security', message: 'eval() usage - code injection risk', file: fp, line: ln, rule: 'no-eval' })
    }
  }

  // 3. Function constructor (equivalent to eval)
  for (const ln of scanLines(lines, /new\s+Function\s*\(/)) {
    issues.push({ severity: 'critical', category: 'Security', message: 'new Function() - equivalent to eval()', file: fp, line: ln, rule: 'no-new-function' })
  }

  // 4. dangerouslySetInnerHTML / innerHTML
  for (const ln of scanLines(lines, /dangerouslySetInnerHTML|\.innerHTML\s*=/)) {
    issues.push({ severity: 'high', category: 'Security', message: 'XSS risk: dangerouslySetInnerHTML or innerHTML assignment', file: fp, line: ln, rule: 'no-inner-html' })
  }

  // 5. document.write
  for (const ln of scanLines(lines, /document\.write\s*\(/)) {
    issues.push({ severity: 'high', category: 'Security', message: 'document.write() is a security and performance risk', file: fp, line: ln, rule: 'no-document-write' })
  }

  // 6. Unescaped user input in URL
  for (const ln of scanLines(lines, /window\.location\s*=\s*[^'"`]|location\.href\s*=\s*[^'"`]/)) {
    issues.push({ severity: 'high', category: 'Security', message: 'Dynamic URL assignment - potential open redirect', file: fp, line: ln, rule: 'no-open-redirect' })
  }

  // 7. SQL injection via template literals
  for (const ln of scanLines(lines, /`[^`]*\$\{[^}]+\}[^`]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC)\b/i)) {
    issues.push({ severity: 'critical', category: 'Security', message: 'Possible SQL injection via string interpolation', file: fp, line: ln, rule: 'no-sql-injection' })
  }
  // Also check reverse order
  for (const ln of scanLines(lines, /(?:SELECT|INSERT|UPDATE|DELETE|DROP)\b[^`]*\$\{/i)) {
    if (!issues.some(i => i.line === ln && i.rule === 'no-sql-injection')) {
      issues.push({ severity: 'critical', category: 'Security', message: 'Possible SQL injection via string interpolation', file: fp, line: ln, rule: 'no-sql-injection' })
    }
  }

  // 8. API route without input validation
  if (fp.includes('/api/') && file.content.includes('request.json()')) {
    if (!/z\.\w+|zod|validate|schema|\.parse\(|\.safeParse\(/i.test(file.content)) {
      issues.push({ severity: 'medium', category: 'Security', message: 'API route without input validation (use Zod)', file: fp, rule: 'api-input-validation' })
    }
  }

  // 9. Missing auth check in API route
  if (fp.includes('/api/') && /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)/i.test(file.content)) {
    if (!/getUser|getSession|auth|authorization|bearer|verifyToken/i.test(file.content)) {
      issues.push({ severity: 'high', category: 'Security', message: 'Mutation API route without authentication check', file: fp, rule: 'api-auth-required' })
    }
  }

  // 10. Prototype pollution
  for (const ln of scanLines(lines, /\[(\w+)\]\s*=\s*|\bObject\.assign\s*\(\s*\{\}/)) {
    if (/\[.*request|body|params|query|input/.test(lines[ln - 1])) {
      issues.push({ severity: 'high', category: 'Security', message: 'Potential prototype pollution via dynamic property assignment', file: fp, line: ln, rule: 'no-prototype-pollution' })
    }
  }

  // 11. Regex DoS (exponential backtracking patterns)
  for (const ln of scanLines(lines, /new RegExp\(.*\+|\/\([^)]*\+\)[^/]*\*/)) {
    issues.push({ severity: 'medium', category: 'Security', message: 'Potential regex DoS (ReDoS) - complex regex pattern', file: fp, line: ln, rule: 'no-redos' })
  }

  // 12. Insecure randomness for security purposes
  for (const ln of scanLines(lines, /Math\.random\(\)/)) {
    if (/token|secret|key|password|hash|id|session|nonce/i.test(lines[ln - 1])) {
      issues.push({ severity: 'high', category: 'Security', message: 'Math.random() used for security-sensitive value - use crypto.randomUUID()', file: fp, line: ln, rule: 'no-insecure-random' })
    }
  }

  // 13. CORS wildcard
  for (const ln of scanLines(lines, /['"]Access-Control-Allow-Origin['"]\s*[:,]\s*['"]?\*/)) {
    issues.push({ severity: 'medium', category: 'Security', message: 'CORS wildcard (*) allows any origin', file: fp, line: ln, rule: 'no-cors-wildcard' })
  }

  // 14. Disabled HTTPS / mixed content
  for (const ln of scanLines(lines, /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/)) {
    if (!lines[ln - 1].trim().startsWith('//') && !lines[ln - 1].trim().startsWith('*')) {
      issues.push({ severity: 'low', category: 'Security', message: 'HTTP URL found - prefer HTTPS', file: fp, line: ln, rule: 'prefer-https' })
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// PERFORMANCE rules (expanded)
// ---------------------------------------------------------------------------

function checkPerformance(file: { path: string; content: string }, lines: string[]): Issue[] {
  const issues: Issue[] = []
  const fp = file.path

  // 1. <img> instead of next/image
  for (const ln of scanLines(lines, /<img\s/i)) {
    if (!file.content.includes('next/image') && !file.content.includes('@next/image')) {
      issues.push({ severity: 'medium', category: 'Performance', message: 'Using <img> instead of next/image (unoptimized images)', file: fp, line: ln, rule: 'use-next-image' })
    }
  }

  // 2. Excessive useEffect hooks
  const useEffectCount = (file.content.match(/useEffect\s*\(/g) || []).length
  if (useEffectCount > 5) {
    issues.push({ severity: 'medium', category: 'Performance', message: `${useEffectCount} useEffect hooks - consolidate or refactor`, file: fp, rule: 'too-many-effects' })
  }

  // 3. Inline style objects causing re-renders
  const inlineStyles = (file.content.match(/style=\{\{/g) || []).length
  if (inlineStyles > 5) {
    issues.push({ severity: 'low', category: 'Performance', message: `${inlineStyles} inline style objects (cause re-renders on every render)`, file: fp, rule: 'no-inline-styles' })
  }

  // 4. Large component without React.memo / useMemo
  if (lines.length > 200 && /export\s+(default\s+)?function/.test(file.content)) {
    if (!/React\.memo|useMemo|useCallback/.test(file.content)) {
      issues.push({ severity: 'low', category: 'Performance', message: 'Large component without memoization (React.memo/useMemo)', file: fp, rule: 'consider-memo' })
    }
  }

  // 5. Missing key prop in map
  for (const ln of scanLines(lines, /\.map\s*\(/)) {
    // Look ahead a few lines for key prop
    const slice = lines.slice(ln - 1, Math.min(ln + 4, lines.length)).join(' ')
    if (/<\w/.test(slice) && !/key=/.test(slice) && !slice.includes('Fragment')) {
      issues.push({ severity: 'medium', category: 'Performance', message: 'JSX elements in .map() may be missing key prop', file: fp, line: ln, rule: 'missing-key-prop' })
    }
  }

  // 6. Synchronous heavy operations
  for (const ln of scanLines(lines, /JSON\.parse\(|JSON\.stringify\(/)) {
    if (/large|big|all|entire|whole/i.test(lines[ln - 1])) {
      issues.push({ severity: 'low', category: 'Performance', message: 'JSON parse/stringify on potentially large data', file: fp, line: ln, rule: 'json-perf' })
    }
  }

  // 7. Missing loading/Suspense for dynamic imports
  if (/import\s*\(/.test(file.content) && !/Suspense|loading|fallback/i.test(file.content)) {
    issues.push({ severity: 'low', category: 'Performance', message: 'Dynamic import without Suspense/loading boundary', file: fp, rule: 'dynamic-import-suspense' })
  }

  // 8. useState for derived state
  const stateCount = (file.content.match(/useState\s*[<(]/g) || []).length
  if (stateCount > 8) {
    issues.push({ severity: 'low', category: 'Performance', message: `${stateCount} useState hooks - some may be derivable with useMemo`, file: fp, rule: 'too-many-states' })
  }

  // 9. Creating objects/arrays inside render
  for (const ln of scanLines(lines, /return\s*\(/)) {
    const renderBody = lines.slice(ln - 1, Math.min(ln + 30, lines.length)).join('\n')
    if (/\[\s*\{/.test(renderBody) && !/useMemo/.test(file.content.slice(0, file.content.indexOf('return')))) {
      // Heuristic: arrays of objects created in render
    }
  }

  // 10. Bundle-heavy imports
  const heavyPackages = ['moment', 'lodash', 'underscore', 'jquery', 'rxjs']
  for (const pkg of heavyPackages) {
    const importPattern = new RegExp(`from\\s+['"]${pkg}['"]|require\\s*\\(\\s*['"]${pkg}['"]`)
    for (const ln of scanLines(lines, importPattern)) {
      const alt = pkg === 'moment' ? 'date-fns or dayjs' : pkg === 'lodash' ? 'lodash-es or native methods' : 'modern alternatives'
      issues.push({ severity: 'medium', category: 'Performance', message: `Heavy package '${pkg}' imported - consider ${alt}`, file: fp, line: ln, rule: 'no-heavy-packages' })
    }
  }

  // 11. N+1 queries pattern (fetch inside loop)
  for (const ln of scanLines(lines, /for\s*\(|\.forEach\s*\(|\.map\s*\(/)) {
    const body = lines.slice(ln - 1, Math.min(ln + 10, lines.length)).join(' ')
    if (/await\s+fetch|await\s+supabase|\.query\s*\(/.test(body)) {
      issues.push({ severity: 'high', category: 'Performance', message: 'Async operation inside loop - potential N+1 query problem', file: fp, line: ln, rule: 'no-n-plus-1' })
    }
  }

  // 12. Missing next/font for Google Fonts
  if (file.content.includes('fonts.googleapis.com')) {
    issues.push({ severity: 'medium', category: 'Performance', message: 'External Google Fonts link - use next/font for zero layout shift', file: fp, rule: 'use-next-font' })
  }

  return issues
}

// ---------------------------------------------------------------------------
// MAINTAINABILITY rules (expanded)
// ---------------------------------------------------------------------------

function checkMaintainability(file: { path: string; content: string }, lines: string[]): Issue[] {
  const issues: Issue[] = []
  const fp = file.path

  // 1. Very long file
  if (lines.length > 500) {
    issues.push({ severity: 'medium', category: 'Maintainability', message: `File has ${lines.length} lines - consider splitting into modules`, file: fp, rule: 'file-too-long' })
  } else if (lines.length > 300) {
    issues.push({ severity: 'low', category: 'Maintainability', message: `File has ${lines.length} lines - approaching threshold for splitting`, file: fp, rule: 'file-getting-long' })
  }

  // 2. Excessive 'any' type usage
  const anyCount = (file.content.match(/:\s*any\b/g) || []).length
  if (anyCount > 5) {
    issues.push({ severity: 'high', category: 'Maintainability', message: `${anyCount} uses of 'any' type - significantly weakens type safety`, file: fp, rule: 'no-any-type' })
  } else if (anyCount > 2) {
    issues.push({ severity: 'medium', category: 'Maintainability', message: `${anyCount} uses of 'any' type - replace with proper interfaces`, file: fp, rule: 'no-any-type' })
  }

  // 3. Deep nesting (4+ levels)
  const deepLines = lines.filter((l: string) => l.match(/^\s{16,}\S/)).length
  if (deepLines > 5) {
    issues.push({ severity: 'medium', category: 'Maintainability', message: `${deepLines} deeply nested lines (4+ levels) - extract helper functions`, file: fp, rule: 'max-nesting-depth' })
  }

  // 4. TODO/FIXME/HACK/XXX comments
  const todoLines = scanLines(lines, /\/\/\s*(TODO|FIXME|HACK|XXX|TEMP|TEMPORARY)\b/i)
  if (todoLines.length > 3) {
    issues.push({ severity: 'medium', category: 'Maintainability', message: `${todoLines.length} TODO/FIXME/HACK comments - address technical debt`, file: fp, line: todoLines[0], rule: 'too-many-todos' })
  } else if (todoLines.length > 0) {
    issues.push({ severity: 'info', category: 'Maintainability', message: `${todoLines.length} TODO/FIXME comment(s)`, file: fp, line: todoLines[0], rule: 'has-todos' })
  }

  // 5. Console.log statements
  const consoleLogs = scanLines(lines, /console\.(log|debug|info|warn)\(/)
    .filter(ln => !lines[ln - 1].trim().startsWith('//'))
  if (consoleLogs.length > 5) {
    issues.push({ severity: 'medium', category: 'Maintainability', message: `${consoleLogs.length} console.log/debug statements - use a proper logger`, file: fp, rule: 'no-console' })
  } else if (consoleLogs.length > 0) {
    issues.push({ severity: 'low', category: 'Maintainability', message: `${consoleLogs.length} console.log statement(s)`, file: fp, rule: 'no-console' })
  }

  // 6. Very long lines
  const longLines = lines.filter((l: string) => l.length > 200).length
  if (longLines > 5) {
    issues.push({ severity: 'low', category: 'Maintainability', message: `${longLines} lines exceed 200 characters - consider line wrapping`, file: fp, rule: 'max-line-length' })
  }

  // 7. Magic numbers
  const magicNumberLines = scanLines(lines, /(?:===?|!==?|[<>]=?|return|=)\s*(?!0\b|1\b|-1\b|2\b|100\b)\d{3,}/)
  if (magicNumberLines.length > 3) {
    issues.push({ severity: 'low', category: 'Maintainability', message: `${magicNumberLines.length} magic numbers - extract into named constants`, file: fp, rule: 'no-magic-numbers' })
  }

  // 8. Commented out code blocks
  const commentedCodeLines = scanLines(lines, /^\s*\/\/\s*(const|let|var|function|import|export|return|if|for|while)\s/)
  if (commentedCodeLines.length > 5) {
    issues.push({ severity: 'low', category: 'Maintainability', message: `${commentedCodeLines.length} lines of commented-out code - remove dead code`, file: fp, rule: 'no-commented-code' })
  }

  // 9. Excessive function parameters
  const manyParamFns = scanLines(lines, /function\s+\w+\s*\([^)]*,[^)]*,[^)]*,[^)]*,[^)]*\)|=>\s*\{/)
  for (const ln of scanLines(lines, /\(\s*\w+\s*(?::\s*\w+)?\s*,\s*\w+\s*(?::\s*\w+)?\s*,\s*\w+\s*(?::\s*\w+)?\s*,\s*\w+\s*(?::\s*\w+)?\s*,\s*\w+/)) {
    issues.push({ severity: 'low', category: 'Maintainability', message: 'Function has 5+ parameters - consider using an options object', file: fp, line: ln, rule: 'max-params' })
  }

  // 10. Duplicate string literals
  const stringLiterals: Record<string, number> = {}
  for (const line of lines) {
    const matches = line.match(/['"]([^'"]{10,})['"]|`([^`]{10,})`/g) || []
    for (const m of matches) {
      const key = m.slice(1, -1)
      stringLiterals[key] = (stringLiterals[key] || 0) + 1
    }
  }
  const duplicateStrings = Object.entries(stringLiterals).filter(([, c]) => c >= 3)
  if (duplicateStrings.length > 2) {
    issues.push({ severity: 'low', category: 'Maintainability', message: `${duplicateStrings.length} string literals repeated 3+ times - extract to constants`, file: fp, rule: 'no-duplicate-strings' })
  }

  // 11. Inconsistent error handling (some try/catch, some not)
  const tryCatchCount = (file.content.match(/try\s*\{/g) || []).length
  const awaitCount = (file.content.match(/await\s/g) || []).length
  if (awaitCount > 5 && tryCatchCount === 0) {
    issues.push({ severity: 'medium', category: 'Maintainability', message: 'Multiple async operations without try/catch error handling', file: fp, rule: 'async-error-handling' })
  }

  // 12. Nested ternary operators
  for (const ln of scanLines(lines, /\?[^:]*\?/)) {
    issues.push({ severity: 'low', category: 'Maintainability', message: 'Nested ternary operator - extract to helper or use if/else', file: fp, line: ln, rule: 'no-nested-ternary' })
  }

  return issues
}

// ---------------------------------------------------------------------------
// ACCESSIBILITY rules (expanded)
// ---------------------------------------------------------------------------

function checkAccessibility(file: { path: string; content: string }, lines: string[]): Issue[] {
  const issues: Issue[] = []
  const fp = file.path
  const ext = file.path.split('.').pop()?.toLowerCase()
  if (!['tsx', 'jsx'].includes(ext || '')) return issues

  // 1. Images without alt text
  for (const ln of scanLines(lines, /<img\b[^>]*(?!.*\balt\s*=)[^>]*>/i)) {
    issues.push({ severity: 'high', category: 'Accessibility', message: 'Image missing alt attribute', file: fp, line: ln, rule: 'img-alt' })
  }
  // Also check for empty alt that should be descriptive
  for (const ln of scanLines(lines, /alt=["']\s*["']/)) {
    issues.push({ severity: 'low', category: 'Accessibility', message: 'Empty alt attribute - use descriptive text or alt="" for decorative images', file: fp, line: ln, rule: 'img-alt-meaningful' })
  }

  // 2. Click handler on non-interactive element without role
  for (const ln of scanLines(lines, /<div[^>]*onClick/i)) {
    const lineText = lines[ln - 1]
    if (!/role=["']button["']|role=["']link["']|tabIndex/i.test(lineText)) {
      issues.push({ severity: 'medium', category: 'Accessibility', message: 'onClick on <div> without role="button" and tabIndex', file: fp, line: ln, rule: 'click-events-have-key-events' })
    }
  }
  for (const ln of scanLines(lines, /<span[^>]*onClick/i)) {
    const lineText = lines[ln - 1]
    if (!/role=["']button["']|tabIndex/i.test(lineText)) {
      issues.push({ severity: 'medium', category: 'Accessibility', message: 'onClick on <span> without role="button" and tabIndex', file: fp, line: ln, rule: 'click-events-have-key-events' })
    }
  }

  // 3. Missing form labels
  for (const ln of scanLines(lines, /<input\b/i)) {
    const context = lines.slice(Math.max(0, ln - 3), Math.min(ln + 2, lines.length)).join(' ')
    if (!/aria-label|aria-labelledby|<label|htmlFor|id=.*<label/i.test(context) && !/type=["']hidden["']/i.test(lines[ln - 1])) {
      issues.push({ severity: 'medium', category: 'Accessibility', message: 'Input without associated label or aria-label', file: fp, line: ln, rule: 'form-label' })
    }
  }

  // 4. Missing heading hierarchy
  const headingLevels = []
  for (const ln of scanLines(lines, /<h([1-6])\b/i)) {
    const match = lines[ln - 1].match(/<h([1-6])\b/i)
    if (match) headingLevels.push(parseInt(match[1]))
  }
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] - headingLevels[i - 1] > 1) {
      issues.push({ severity: 'low', category: 'Accessibility', message: `Heading level skip: h${headingLevels[i - 1]} to h${headingLevels[i]}`, file: fp, rule: 'heading-order' })
      break
    }
  }

  // 5. Missing lang attribute on html
  if (fp.includes('layout') || fp.includes('_document')) {
    if (/<html\b/i.test(file.content) && !/lang=/.test(file.content)) {
      issues.push({ severity: 'medium', category: 'Accessibility', message: 'HTML element missing lang attribute', file: fp, rule: 'html-has-lang' })
    }
  }

  // 6. Autoplay media
  for (const ln of scanLines(lines, /<(?:video|audio)[^>]*autoplay/i)) {
    issues.push({ severity: 'medium', category: 'Accessibility', message: 'Media with autoplay - can be disorienting for screen reader users', file: fp, line: ln, rule: 'no-autoplay' })
  }

  // 7. Missing skip link
  if (fp.includes('layout') && /<main\b/i.test(file.content)) {
    if (!/skip.*nav|skip.*content|skiplink/i.test(file.content)) {
      issues.push({ severity: 'low', category: 'Accessibility', message: 'No skip navigation link found in layout', file: fp, rule: 'skip-nav' })
    }
  }

  // 8. Positive tabIndex
  for (const ln of scanLines(lines, /tabIndex=\{?["']?[1-9]/)) {
    issues.push({ severity: 'medium', category: 'Accessibility', message: 'Positive tabIndex value disrupts natural tab order', file: fp, line: ln, rule: 'no-positive-tabindex' })
  }

  // 9. onClick without onKeyDown/onKeyUp
  for (const ln of scanLines(lines, /onClick=/)) {
    const context = lines.slice(Math.max(0, ln - 2), Math.min(ln + 2, lines.length)).join(' ')
    if (/<(?:div|span|li|td)\b/.test(context) && !/onKeyDown|onKeyUp|onKeyPress/i.test(context)) {
      // Only flag if not already flagged by click-events rule
      if (!issues.some(i => i.line === ln && i.rule === 'click-events-have-key-events')) {
        issues.push({ severity: 'low', category: 'Accessibility', message: 'Interactive element missing keyboard event handler', file: fp, line: ln, rule: 'keyboard-events' })
      }
    }
  }

  // 10. Color-only indicators
  for (const ln of scanLines(lines, /(?:text|bg)-(?:red|green|yellow)-\d+/)) {
    if (/error|success|warning|status/i.test(lines[ln - 1]) && !/aria-label|role=["']alert|sr-only|screen-reader/i.test(lines[ln - 1])) {
      // Soft check - only info level
      issues.push({ severity: 'info', category: 'Accessibility', message: 'Color-only status indicator without text alternative', file: fp, line: ln, rule: 'color-not-sole-indicator' })
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// BEST PRACTICES rules (new category)
// ---------------------------------------------------------------------------

function checkBestPractices(file: { path: string; content: string }, lines: string[]): Issue[] {
  const issues: Issue[] = []
  const fp = file.path
  const ext = file.path.split('.').pop()?.toLowerCase()

  // 1. Missing Error Boundary in layout/page
  if ((fp.includes('layout') || fp.includes('page')) && (ext === 'tsx' || ext === 'jsx')) {
    if (file.content.includes('Suspense') && !/ErrorBoundary|error\.tsx|error\.jsx/.test(file.content)) {
      issues.push({ severity: 'low', category: 'Best Practices', message: 'Suspense without ErrorBoundary - errors will crash the component tree', file: fp, rule: 'error-boundary' })
    }
  }

  // 2. Direct state mutation
  for (const ln of scanLines(lines, /\.push\(|\.splice\(|\.sort\(|\.reverse\(\)/)) {
    const context = lines.slice(Math.max(0, ln - 5), ln).join(' ')
    if (/useState|state/i.test(context) && !lines[ln - 1].includes('[...')) {
      issues.push({ severity: 'medium', category: 'Best Practices', message: 'Possible direct state mutation (.push/.splice/.sort on state)', file: fp, line: ln, rule: 'no-state-mutation' })
    }
  }

  // 3. useEffect missing dependencies (basic heuristic)
  for (const ln of scanLines(lines, /useEffect\s*\(\s*\(\)\s*=>\s*\{/)) {
    const endSearch = Math.min(ln + 20, lines.length)
    const effectBody = lines.slice(ln - 1, endSearch).join('\n')
    const closingMatch = effectBody.match(/\},\s*\[\s*\]\s*\)/)
    if (closingMatch) {
      // Empty dependency array - check if body references state/props
      const bodyBeforeClose = effectBody.slice(0, effectBody.indexOf(closingMatch[0]))
      if (/\bset\w+\(.*\bprops\b|\bstate\b/i.test(bodyBeforeClose)) {
        issues.push({ severity: 'low', category: 'Best Practices', message: 'useEffect with [] deps might be missing dependencies', file: fp, line: ln, rule: 'exhaustive-deps' })
      }
    }
  }

  // 4. Prop drilling (passing 4+ props through)
  for (const ln of scanLines(lines, /<\w+\s/)) {
    const componentCall = lines.slice(ln - 1, Math.min(ln + 5, lines.length)).join(' ')
    const propMatches = componentCall.match(/\w+=\{/g)
    if (propMatches && propMatches.length > 6) {
      issues.push({ severity: 'info', category: 'Best Practices', message: 'Component receives many props - consider using context or composition', file: fp, line: ln, rule: 'prop-drilling' })
    }
  }

  // 5. Missing SEO meta tags in pages
  if (fp.includes('page.') && (ext === 'tsx' || ext === 'jsx')) {
    if (!/metadata|generateMetadata|Head|<title|useHead/i.test(file.content) && !fp.includes('api/')) {
      issues.push({ severity: 'low', category: 'Best Practices', message: 'Page component without metadata/SEO configuration', file: fp, rule: 'page-metadata' })
    }
  }

  // 6. Unhandled promise rejection
  for (const ln of scanLines(lines, /\.then\s*\(/)) {
    const context = lines.slice(ln - 1, Math.min(ln + 5, lines.length)).join(' ')
    if (!context.includes('.catch')) {
      issues.push({ severity: 'low', category: 'Best Practices', message: '.then() without .catch() - unhandled promise rejection', file: fp, line: ln, rule: 'no-unhandled-rejection' })
    }
  }

  // 7. Deprecated React patterns
  for (const ln of scanLines(lines, /componentWillMount|componentWillReceiveProps|componentWillUpdate/)) {
    issues.push({ severity: 'medium', category: 'Best Practices', message: 'Deprecated React lifecycle method used', file: fp, line: ln, rule: 'no-deprecated-react' })
  }

  // 8. Index used as key
  for (const ln of scanLines(lines, /key=\{(?:i|index|idx)\}/)) {
    issues.push({ severity: 'low', category: 'Best Practices', message: 'Array index used as key - prefer stable unique identifiers', file: fp, line: ln, rule: 'no-array-index-key' })
  }

  // 9. Missing loading states
  if (/fetch\(|useSWR|useQuery/i.test(file.content) && (ext === 'tsx' || ext === 'jsx')) {
    if (!/loading|isLoading|isPending|Skeleton|Loader|Spinner/i.test(file.content)) {
      issues.push({ severity: 'low', category: 'Best Practices', message: 'Data fetching without loading state indicator', file: fp, rule: 'loading-states' })
    }
  }

  // 10. Missing error states
  if (/fetch\(|useSWR|useQuery/i.test(file.content) && (ext === 'tsx' || ext === 'jsx')) {
    if (!/error|isError|Error|ErrorMessage/i.test(file.content)) {
      issues.push({ severity: 'low', category: 'Best Practices', message: 'Data fetching without error state handling', file: fp, rule: 'error-states' })
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// CODE STYLE rules (new category)
// ---------------------------------------------------------------------------

function checkCodeStyle(file: { path: string; content: string }, lines: string[]): Issue[] {
  const issues: Issue[] = []
  const fp = file.path
  const ext = file.path.split('.').pop()?.toLowerCase()
  if (!['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) return issues

  // 1. Inconsistent quotes (mix of ' and " for imports)
  const singleQuoteImports = scanLines(lines, /import\s+.*from\s+'/).length
  const doubleQuoteImports = scanLines(lines, /import\s+.*from\s+"/).length
  if (singleQuoteImports > 2 && doubleQuoteImports > 2) {
    issues.push({ severity: 'info', category: 'Code Style', message: 'Mixed quote styles in imports', file: fp, rule: 'consistent-quotes' })
  }

  // 2. var usage (prefer const/let)
  for (const ln of scanLines(lines, /\bvar\s+\w/)) {
    if (!lines[ln - 1].trim().startsWith('//')) {
      issues.push({ severity: 'low', category: 'Code Style', message: 'var declaration - prefer const or let', file: fp, line: ln, rule: 'no-var' })
    }
  }

  // 3. == instead of ===
  for (const ln of scanLines(lines, /[^!=]==[^=]/)) {
    if (!/==\s*null|==\s*undefined/.test(lines[ln - 1])) {
      issues.push({ severity: 'low', category: 'Code Style', message: 'Loose equality (==) - prefer strict equality (===)', file: fp, line: ln, rule: 'eqeqeq' })
    }
  }

  // 4. Unused imports (basic heuristic)
  const importNames: Array<{ name: string; line: number }> = []
  for (const ln of scanLines(lines, /^import\s/)) {
    const match = lines[ln - 1].match(/import\s+(?:\{([^}]+)\}|(\w+))/)
    if (match) {
      const names = (match[1] || match[2] || '').split(',').map(n => n.trim().split(' as ').pop()?.trim()).filter(Boolean)
      for (const name of names) {
        if (name) importNames.push({ name, line: ln })
      }
    }
  }
  const contentAfterImports = lines.slice(importNames.length > 0 ? importNames[importNames.length - 1].line : 0).join('\n')
  const unusedImports = importNames.filter(({ name }) => {
    const regex = new RegExp(`\\b${name}\\b`)
    return !regex.test(contentAfterImports)
  })
  if (unusedImports.length > 0) {
    issues.push({
      severity: 'info',
      category: 'Code Style',
      message: `Potentially unused import(s): ${unusedImports.slice(0, 5).map(i => i.name).join(', ')}`,
      file: fp,
      line: unusedImports[0].line,
      rule: 'no-unused-imports'
    })
  }

  // 5. Empty catch blocks
  for (const ln of scanLines(lines, /catch\s*\([^)]*\)\s*\{\s*\}/)) {
    issues.push({ severity: 'medium', category: 'Code Style', message: 'Empty catch block - at least log the error', file: fp, line: ln, rule: 'no-empty-catch' })
  }

  // 6. Non-descriptive variable names
  for (const ln of scanLines(lines, /(?:const|let)\s+(?:x|y|z|a|b|c|d|e|f|g|h|aa|bb|cc|dd|data|temp|tmp|foo|bar|baz)\s*[=:]/)) {
    if (!/for\s*\(|\.map|\.filter|\.reduce|\.forEach/i.test(lines[ln - 1]) && !/coordinates|position|axis/i.test(lines[ln - 1])) {
      issues.push({ severity: 'info', category: 'Code Style', message: 'Non-descriptive variable name', file: fp, line: ln, rule: 'descriptive-names' })
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// Main analysis orchestrator
// ---------------------------------------------------------------------------

function analyzeCode(files: Array<{ path: string; content: string }>, reviewType: string): ReviewAnalysis {
  const allIssues: Issue[] = []
  const fileMetrics: FileMetrics[] = []
  let totalFunctions = 0
  let totalComplexity = 0
  let rulesChecked = 0

  const isCode = (ext: string) => ['ts', 'tsx', 'js', 'jsx'].includes(ext)

  for (const file of files) {
    if (!file.content || !file.path) continue
    const lines = file.content.split('\n')
    const ext = file.path.split('.').pop()?.toLowerCase() || ''

    if (!isCode(ext)) continue

    // Estimate functions and complexity
    const fnMatches = file.content.match(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>|(?:export\s+)?(?:async\s+)?function)/g) || []
    totalFunctions += fnMatches.length
    const fileComplexity = estimateComplexity(file.content)
    totalComplexity += fileComplexity

    const fileIssues: Issue[] = []

    // Run applicable checkers based on review type
    if (reviewType === 'full' || reviewType === 'security') {
      fileIssues.push(...checkSecurity(file, lines))
      rulesChecked += 14
    }
    if (reviewType === 'full' || reviewType === 'performance') {
      fileIssues.push(...checkPerformance(file, lines))
      rulesChecked += 12
    }
    if (reviewType === 'full' || reviewType === 'maintainability') {
      fileIssues.push(...checkMaintainability(file, lines))
      rulesChecked += 12
    }
    if (reviewType === 'full' || reviewType === 'accessibility') {
      fileIssues.push(...checkAccessibility(file, lines))
      rulesChecked += 10
    }
    if (reviewType === 'full' || reviewType === 'best-practices') {
      fileIssues.push(...checkBestPractices(file, lines))
      rulesChecked += 10
    }
    if (reviewType === 'full' || reviewType === 'code-style') {
      fileIssues.push(...checkCodeStyle(file, lines))
      rulesChecked += 6
    }

    allIssues.push(...fileIssues)

    fileMetrics.push({
      path: file.path,
      lines: lines.length,
      complexity: fileComplexity,
      issueCount: fileIssues.length,
      topIssues: fileIssues.slice(0, 3).map(i => i.message),
    })
  }

  // Sort issues by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
  allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  // Calculate score with weighted deductions
  let deductions = 0
  for (const issue of allIssues) {
    deductions += SEVERITY_WEIGHT[issue.severity] || 1
  }
  // Cap deductions relative to file count to avoid tiny projects getting unfairly low scores
  const maxDeduction = Math.min(100, deductions)
  const score = Math.max(0, Math.min(100, 100 - maxDeduction))

  // Build category summaries
  const categories: Record<string, CategorySummary> = {}
  const categoryNames = ['Security', 'Performance', 'Maintainability', 'Accessibility', 'Best Practices', 'Code Style']
  for (const cat of categoryNames) {
    const catIssues = allIssues.filter(i => i.category === cat)
    const catDeductions = catIssues.reduce((s, i) => s + SEVERITY_WEIGHT[i.severity], 0)
    const catScore = Math.max(0, Math.min(100, 100 - catDeductions))
    categories[cat] = {
      score: catScore,
      grade: getGrade(catScore),
      issueCount: catIssues.length,
      criticalCount: catIssues.filter(i => i.severity === 'critical').length,
      highCount: catIssues.filter(i => i.severity === 'high').length,
      mediumCount: catIssues.filter(i => i.severity === 'medium').length,
      lowCount: catIssues.filter(i => i.severity === 'low').length,
      infoCount: catIssues.filter(i => i.severity === 'info').length,
    }
  }

  // Generate smart, prioritized suggestions
  const suggestions = generateSuggestions(allIssues, categories)

  // Sort file metrics by issue count descending (hotspots)
  fileMetrics.sort((a, b) => b.issueCount - a.issueCount)

  const codeFiles = files.filter(f => f.content && f.path && isCode(f.path.split('.').pop()?.toLowerCase() || ''))
  const totalLines = codeFiles.reduce((s, f) => s + (f.content?.split('\n').length || 0), 0)
  const avgComplexity = codeFiles.length > 0 ? Math.round(totalComplexity / codeFiles.length) : 0

  return {
    score,
    grade: getGrade(score),
    issues: allIssues.slice(0, 50),
    suggestions,
    categories,
    fileMetrics: fileMetrics.slice(0, 20),
    stats: {
      totalFiles: codeFiles.length,
      totalLines,
      totalFunctions,
      avgComplexity,
      rulesChecked: Math.min(rulesChecked, 64),
    },
  }
}

// ---------------------------------------------------------------------------
// Smart suggestion generator
// ---------------------------------------------------------------------------

function generateSuggestions(issues: Issue[], categories: Record<string, CategorySummary>): ReviewAnalysis['suggestions'] {
  const suggestions: ReviewAnalysis['suggestions'] = []

  // Critical security issues first
  if (categories['Security']?.criticalCount > 0) {
    suggestions.push({ category: 'Security', message: 'Fix critical security vulnerabilities immediately - hardcoded secrets or code injection risks detected', priority: 'high' })
  }
  if (categories['Security']?.highCount > 0) {
    suggestions.push({ category: 'Security', message: 'Address high-severity security issues: XSS risks, missing authentication, or open redirect vulnerabilities', priority: 'high' })
  }

  // Performance high-impact
  if (issues.some(i => i.rule === 'no-n-plus-1')) {
    suggestions.push({ category: 'Performance', message: 'Refactor N+1 query patterns - batch API calls or use Promise.all()', priority: 'high' })
  }
  if (issues.some(i => i.rule === 'no-heavy-packages')) {
    suggestions.push({ category: 'Performance', message: 'Replace heavy packages (moment, lodash) with lightweight modern alternatives', priority: 'medium' })
  }
  if (issues.some(i => i.rule === 'use-next-image')) {
    suggestions.push({ category: 'Performance', message: 'Use next/image component for automatic image optimization and lazy loading', priority: 'medium' })
  }

  // Maintainability
  if (issues.some(i => i.rule === 'no-any-type')) {
    suggestions.push({ category: 'Maintainability', message: 'Replace `any` types with proper TypeScript interfaces for better type safety', priority: 'medium' })
  }
  if (issues.some(i => i.rule === 'file-too-long')) {
    suggestions.push({ category: 'Maintainability', message: 'Break large files into smaller, focused modules (Single Responsibility Principle)', priority: 'medium' })
  }
  if (issues.some(i => i.rule === 'async-error-handling')) {
    suggestions.push({ category: 'Maintainability', message: 'Add try/catch blocks around async operations for graceful error handling', priority: 'medium' })
  }
  if (issues.some(i => i.rule === 'too-many-todos')) {
    suggestions.push({ category: 'Maintainability', message: 'Schedule time to address TODO/FIXME comments and reduce technical debt', priority: 'low' })
  }

  // Accessibility
  if (categories['Accessibility']?.highCount > 0) {
    suggestions.push({ category: 'Accessibility', message: 'Add alt text to all images and ensure interactive elements have proper ARIA attributes', priority: 'high' })
  }
  if (issues.some(i => i.rule === 'click-events-have-key-events' || i.rule === 'keyboard-events')) {
    suggestions.push({ category: 'Accessibility', message: 'Add keyboard event handlers alongside click handlers for full keyboard accessibility', priority: 'medium' })
  }

  // Best Practices
  if (issues.some(i => i.rule === 'api-input-validation')) {
    suggestions.push({ category: 'Best Practices', message: 'Add Zod schema validation to API routes for type-safe input handling', priority: 'medium' })
  }
  if (issues.some(i => i.rule === 'page-metadata')) {
    suggestions.push({ category: 'Best Practices', message: 'Add metadata exports to page components for better SEO', priority: 'low' })
  }
  if (issues.some(i => i.rule === 'loading-states' || i.rule === 'error-states')) {
    suggestions.push({ category: 'Best Practices', message: 'Add loading and error states for all data-fetching components', priority: 'low' })
  }

  // Code Style
  if (issues.some(i => i.rule === 'no-var')) {
    suggestions.push({ category: 'Code Style', message: 'Migrate var declarations to const/let for better scoping', priority: 'low' })
  }

  // If no issues
  if (suggestions.length === 0) {
    suggestions.push({ category: 'General', message: 'No major issues found - your code follows good practices!', priority: 'low' })
  }

  return suggestions.slice(0, 15)
}

// ---------------------------------------------------------------------------
// Markdown formatter
// ---------------------------------------------------------------------------

function formatReviewMarkdown(reviewType: string, analysis: ReviewAnalysis): string {
  const title = reviewType === 'full' ? 'Full Code Review' : `${reviewType.charAt(0).toUpperCase() + reviewType.slice(1)} Review`

  let md = `# ${title}\n\n`
  md += `**Score:** ${analysis.score}/100 (Grade: ${analysis.grade}) | **Files:** ${analysis.stats.totalFiles} | **Lines:** ${analysis.stats.totalLines.toLocaleString()} | **Rules checked:** ${analysis.stats.rulesChecked}\n\n`

  // Category breakdown
  md += `## Category Scores\n\n`
  md += `| Category | Score | Grade | Issues |\n|----------|-------|-------|--------|\n`
  for (const [cat, summary] of Object.entries(analysis.categories)) {
    if (summary.issueCount > 0 || reviewType === 'full') {
      md += `| ${cat} | ${summary.score}/100 | ${summary.grade} | ${summary.issueCount} |\n`
    }
  }
  md += '\n'

  // Issues by severity
  if (analysis.issues.length > 0) {
    md += `## Issues Found (${analysis.issues.length})\n\n`
    const severityLabels: Record<string, string> = { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW', info: 'INFO' }
    for (const issue of analysis.issues) {
      md += `- [${severityLabels[issue.severity]}] **${issue.message}** - \`${issue.file}\`${issue.line ? `:${issue.line}` : ''}\n`
    }
    md += '\n'
  }

  // Suggestions
  if (analysis.suggestions.length > 0) {
    md += `## Recommendations\n\n`
    for (const s of analysis.suggestions) {
      const priority = s.priority === 'high' ? '!!!' : s.priority === 'medium' ? '!!' : '!'
      md += `- [${priority}] **${s.category}:** ${s.message}\n`
    }
    md += '\n'
  }

  // File hotspots
  const hotspots = analysis.fileMetrics.filter(f => f.issueCount > 0).slice(0, 10)
  if (hotspots.length > 0) {
    md += `## File Hotspots\n\n`
    md += `| File | Lines | Complexity | Issues |\n|------|-------|------------|--------|\n`
    for (const fm of hotspots) {
      md += `| \`${fm.path}\` | ${fm.lines} | ${fm.complexity} | ${fm.issueCount} |\n`
    }
  }

  return md
}

// ---------------------------------------------------------------------------
// API Handlers
// ---------------------------------------------------------------------------

// GET - List code reviews for a project
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('code_reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    return NextResponse.json({ reviews: data || [] })
  } catch (error) {
    console.error('[CodeReviews] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Generate a new code review
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { projectId, reviewType, files } = body

    if (!projectId || !files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'projectId and files array are required' }, { status: 400 })
    }

    const type = reviewType || 'full'
    const analysis = analyzeCode(files, type)
    const content = formatReviewMarkdown(type, analysis)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await supabase
      .from('code_reviews')
      .insert({
        user_id: user.id,
        project_id: projectId,
        review_type: type,
        content,
        score: analysis.score,
        issues_found: analysis.issues.length,
      })
      .select()
      .single()

    if (error) {
      console.error('[CodeReviews] Create error:', error)
      return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
    }

    return NextResponse.json({ review: data, analysis })
  } catch (error) {
    console.error('[CodeReviews] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a code review
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Review ID is required' }, { status: 400 })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { error } = await supabase.from('code_reviews').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[CodeReviews] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
