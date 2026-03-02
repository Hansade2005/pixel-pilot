import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

const vercelGateway = createOpenAICompatible({
  name: 'vercel-gateway',
  baseURL: 'https://ai-gateway.vercel.sh/v1',
  apiKey: process.env.VERCEL_AI_GATEWAY_API_KEY || '',
})

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

// Build a compact code summary for AI context (limit token usage)
function buildCodeContext(
  files: Array<{ path: string; content: string }>,
  staticIssues: Array<{ severity: string; category: string; message: string; file: string; line?: number; rule: string }>,
  reviewType: string
): string {
  // Prioritize files with issues and limit total size
  const MAX_CHARS = 24000
  let totalChars = 0

  // Files that had static issues first
  const issueFiles = new Set(staticIssues.map(i => i.file))
  const prioritized = [
    ...files.filter(f => issueFiles.has(f.path)),
    ...files.filter(f => !issueFiles.has(f.path)),
  ]

  const fileSummaries: string[] = []

  for (const file of prioritized) {
    if (!file.content || !file.path) continue
    const ext = file.path.split('.').pop()?.toLowerCase() || ''
    if (!['ts', 'tsx', 'js', 'jsx'].includes(ext)) continue

    // For large files, include first 150 lines + relevant snippets around issues
    const lines = file.content.split('\n')
    let snippet: string

    if (lines.length > 150) {
      // Include header + imports + first component/function + areas around issues
      const headerLines = lines.slice(0, 80).join('\n')
      const issueLineNums = staticIssues
        .filter(i => i.file === file.path && i.line)
        .map(i => i.line!)
        .slice(0, 5)

      const issueSnippets = issueLineNums.map(ln => {
        const start = Math.max(0, ln - 3)
        const end = Math.min(lines.length, ln + 3)
        return `// ... (line ${ln})\n${lines.slice(start, end).join('\n')}`
      }).join('\n\n')

      snippet = `${headerLines}\n\n// ... (${lines.length} lines total)\n\n${issueSnippets}`
    } else {
      snippet = file.content
    }

    const entry = `\n### ${file.path} (${lines.length} lines)\n\`\`\`${ext}\n${snippet}\n\`\`\`\n`

    if (totalChars + entry.length > MAX_CHARS) {
      // Add a truncated note
      fileSummaries.push(`\n### ${file.path} (${lines.length} lines) [truncated - too large]\n`)
      break
    }

    fileSummaries.push(entry)
    totalChars += entry.length
  }

  return fileSummaries.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const body = await request.json()
    const { files, staticAnalysis, reviewType } = body

    if (!files || !Array.isArray(files) || !staticAnalysis) {
      return new Response(JSON.stringify({ error: 'files and staticAnalysis are required' }), { status: 400 })
    }

    const codeContext = buildCodeContext(files, staticAnalysis.issues || [], reviewType || 'full')

    // Build static findings summary for AI context
    const issuesSummary = (staticAnalysis.issues || [])
      .slice(0, 30)
      .map((i: any) => `- [${i.severity.toUpperCase()}] ${i.category}: ${i.message} (${i.file}${i.line ? `:${i.line}` : ''}) [${i.rule}]`)
      .join('\n')

    const categorySummary = Object.entries(staticAnalysis.categories || {})
      .map(([cat, s]: [string, any]) => `- ${cat}: ${s.score}/100 (${s.grade}) - ${s.issueCount} issues`)
      .join('\n')

    const reviewTypeLabel = reviewType === 'full' ? 'Full Review' :
      reviewType === 'security' ? 'Security Review' :
      reviewType === 'performance' ? 'Performance Review' :
      reviewType === 'maintainability' ? 'Maintainability Review' :
      reviewType === 'accessibility' ? 'Accessibility Review' :
      reviewType === 'best-practices' ? 'Best Practices Review' :
      reviewType === 'code-style' ? 'Code Style Review' : 'Code Review'

    const systemPrompt = `You are an expert senior software engineer performing a professional code review. You specialize in React, Next.js, TypeScript, and modern web development best practices.

Your role is to provide deep, actionable AI-powered insights that go beyond static analysis. You should act as a mentor - explaining WHY something is a problem, WHAT the impact is, and HOW to fix it with specific code examples.

REVIEW TYPE: ${reviewTypeLabel}

IMPORTANT GUIDELINES:
1. Focus on the most impactful improvements - prioritize by real-world impact
2. Provide specific, copy-paste-ready code fixes when suggesting improvements
3. Explain the reasoning behind each suggestion (performance impact, security risk, UX effect)
4. Identify architectural patterns and anti-patterns
5. Suggest modern React/Next.js patterns where applicable
6. Be constructive - acknowledge what's done well alongside issues
7. Group insights by theme (Architecture, Patterns, Quick Wins, etc.)
8. Keep code examples concise but complete enough to be actionable
9. Use markdown formatting with code blocks for readability
10. Do NOT repeat issues already found by static analysis - add NEW insights

FORMAT YOUR RESPONSE AS:

## AI Code Review Insights

### What's Done Well
(Brief acknowledgment of good patterns found)

### Architecture & Design
(Structural improvements, component organization, separation of concerns)

### Code Improvements
(Specific code-level suggestions with before/after examples)

### Performance Optimizations
(React rendering, data fetching, bundle optimization)

### Security Hardening
(Authentication, input handling, data exposure risks)

### Quick Wins
(Small changes with high impact that can be done immediately)

### Summary
(2-3 sentence overall assessment with top 3 priorities)

Use \`\`\`tsx or \`\`\`typescript code blocks for all code examples.
Use **bold** for emphasis, and organize each section with numbered items.`

    const userPrompt = `Review this codebase. The static analyzer already found the following - provide ADDITIONAL deep insights.

## Static Analysis Results
- Overall Score: ${staticAnalysis.score}/100 (${staticAnalysis.grade})
- Total Issues: ${staticAnalysis.issues?.length || 0}
- Files Analyzed: ${staticAnalysis.stats?.totalFiles || files.length}
- Lines of Code: ${staticAnalysis.stats?.totalLines || 'unknown'}

### Category Scores
${categorySummary || 'No category data'}

### Static Issues Found (already reported - DO NOT repeat these)
${issuesSummary || 'No static issues found'}

## Source Code
${codeContext}

Provide your deep AI-powered insights. Focus on things the static analyzer CANNOT detect: architectural issues, design patterns, React anti-patterns, data flow problems, UX concerns, and specific refactoring opportunities with code examples.`

    const model = vercelGateway('mistral/devstral-small-2')

    const result = await streamText({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 3000,
      temperature: 0.3,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[CodeReviews AI] Error:', error)
    return new Response(
      JSON.stringify({ error: 'AI analysis failed. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
