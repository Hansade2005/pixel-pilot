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

function buildCodeContext(
  files: Array<{ path: string; content: string }>,
  healthData: any
): string {
  const MAX_CHARS = 24000
  let totalChars = 0

  // Prioritize hotspot files
  const hotspotPaths = new Set((healthData.fileHotspots || []).map((h: any) => h.path))
  const prioritized = [
    ...files.filter(f => hotspotPaths.has(f.path)),
    ...files.filter(f => !hotspotPaths.has(f.path)),
  ]

  const fileSummaries: string[] = []

  for (const file of prioritized) {
    if (!file.content || !file.path) continue
    const ext = file.path.split('.').pop()?.toLowerCase() || ''
    if (!['ts', 'tsx', 'js', 'jsx', 'json'].includes(ext)) continue

    const lines = file.content.split('\n')
    let snippet: string

    if (lines.length > 150) {
      const headerLines = lines.slice(0, 80).join('\n')
      snippet = `${headerLines}\n\n// ... (${lines.length} lines total)`
    } else {
      snippet = file.content
    }

    const entry = `\n### ${file.path} (${lines.length} lines)\n\`\`\`${ext}\n${snippet}\n\`\`\`\n`

    if (totalChars + entry.length > MAX_CHARS) {
      fileSummaries.push(`\n### ${file.path} (${lines.length} lines) [truncated]\n`)
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
    const { files, healthData } = body

    if (!files || !Array.isArray(files) || !healthData) {
      return new Response(JSON.stringify({ error: 'files and healthData are required' }), { status: 400 })
    }

    const codeContext = buildCodeContext(files, healthData)

    // Build dimension summary
    const dimensionSummary = Object.entries(healthData.dimensions || {})
      .map(([name, dim]: [string, any]) => `- **${name}**: ${dim.score}/100 (${dim.grade}) - ${dim.issues?.length || 0} issues`)
      .join('\n')

    // Build hotspot summary
    const hotspotSummary = (healthData.fileHotspots || [])
      .slice(0, 10)
      .map((h: any) => `- \`${h.path}\`: ${h.issueCount} issues across [${h.dimensions.join(', ')}] (worst: ${h.worstSeverity})`)
      .join('\n')

    // Build recommendations summary
    const recSummary = (healthData.recommendations || [])
      .map((r: any) => `- [${r.priority.toUpperCase()}] ${r.dimension}: ${r.message}`)
      .join('\n')

    // Collect all issues across dimensions
    const allIssues = Object.entries(healthData.dimensions || {})
      .flatMap(([dimName, dim]: [string, any]) =>
        (dim.issues || []).slice(0, 5).map((i: any) => `- [${i.severity.toUpperCase()}] ${dimName}: ${i.message}${i.file ? ` (${i.file})` : ''} [${i.rule}]`)
      )
      .slice(0, 40)
      .join('\n')

    const systemPrompt = `You are an expert senior software architect performing a comprehensive health assessment of a web application. You specialize in React, Next.js, TypeScript, DevOps, testing, security, and modern web development.

Your role is to provide deep, strategic AI-powered insights that go beyond the static analysis. Focus on architectural health, scalability concerns, technical debt patterns, and actionable improvement roadmaps.

IMPORTANT GUIDELINES:
1. Focus on HIGH-IMPACT architectural and strategic improvements
2. Provide specific, actionable code examples and configurations
3. Create a prioritized improvement roadmap with effort estimates
4. Identify patterns and systemic issues, not individual code lines
5. Suggest modern tooling and workflow improvements
6. Be constructive - celebrate strengths alongside improvements
7. Do NOT repeat issues already found by static analysis
8. Focus on what the static analyzer CANNOT detect

FORMAT YOUR RESPONSE AS:

## AI Health Assessment

### Project Strengths
(What's working well - architecture, patterns, technology choices)

### Architecture Analysis
(Component structure, data flow, separation of concerns, scalability)

### Technical Debt Assessment
(Systemic patterns that need addressing, with estimated effort)

### Testing Strategy
(Test coverage gaps, recommended testing approach, critical paths to test)

### DevOps & Deployment
(CI/CD improvements, monitoring, deployment strategy, environment management)

### Dependency Optimization
(Bundle size opportunities, upgrade recommendations, security considerations)

### Performance Deep Dive
(Rendering patterns, data fetching strategy, caching opportunities, Core Web Vitals)

### Security Hardening
(Authentication flows, data protection, API security, environment management)

### Quick Wins (< 1 hour each)
(Immediate improvements with high impact)

### Improvement Roadmap
(Prioritized list: Week 1, Week 2-4, Month 2-3)

### Summary
(Overall assessment with top 5 strategic priorities)

Use \`\`\`tsx or \`\`\`typescript code blocks for all code examples.`

    const userPrompt = `Perform a comprehensive health assessment of this project.

## Static Analysis Results
- **Overall Score:** ${healthData.overall?.score || 'N/A'}/100 (${healthData.overall?.grade || 'N/A'})
- **Files:** ${healthData.overall?.totalFiles || 0} total (${healthData.overall?.codeFiles || 0} code)
- **Lines:** ${healthData.overall?.totalLines || 0}
- **Total Issues:** ${healthData.overall?.totalIssues || 0}
- **Dimensions Analyzed:** ${healthData.overall?.dimensionCount || 0}

### Dimension Scores
${dimensionSummary || 'No dimension data'}

### File Hotspots
${hotspotSummary || 'No hotspots'}

### Current Recommendations
${recSummary || 'None'}

### Static Issues (already reported - DO NOT repeat)
${allIssues || 'None'}

## Source Code
${codeContext}

Provide your deep AI-powered health assessment. Focus on strategic, architectural insights the static analyzer cannot detect.`

    const model = vercelGateway('mistral/devstral-small-2')

    const result = await streamText({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 4000,
      temperature: 0.3,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[HealthScore AI] Error:', error)
    return new Response(
      JSON.stringify({ error: 'AI analysis failed. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
