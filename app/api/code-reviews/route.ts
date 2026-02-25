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

function analyzeCode(files: Array<{ path: string; content: string }>, reviewType: string) {
  const issues: Array<{ severity: string; message: string; file: string; line?: number }> = []
  const suggestions: string[] = []
  let score = 100

  for (const file of files) {
    if (!file.content || !file.path) continue
    const lines = file.content.split('\n')
    const ext = file.path.split('.').pop()?.toLowerCase()
    if (!['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) continue

    if (reviewType === 'security' || reviewType === 'full') {
      if (/(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]/i.test(file.content)) {
        issues.push({ severity: 'critical', message: 'Hardcoded secret/API key detected', file: file.path })
        score -= 15
      }
      if (/dangerouslySetInnerHTML|\.innerHTML\s*=/.test(file.content)) {
        issues.push({ severity: 'high', message: 'XSS risk: dangerouslySetInnerHTML/innerHTML usage', file: file.path })
        score -= 10
      }
      if (/\beval\s*\(/.test(file.content)) {
        issues.push({ severity: 'critical', message: 'eval() usage - code injection risk', file: file.path })
        score -= 15
      }
      if (file.path.includes('/api/') && file.content.includes('request.json()') && !/z\.\w+|zod|validate/i.test(file.content)) {
        issues.push({ severity: 'medium', message: 'API route without input validation', file: file.path })
        score -= 5
      }
    }

    if (reviewType === 'performance' || reviewType === 'full') {
      if (/<img\s/i.test(file.content) && !file.content.includes('next/image')) {
        issues.push({ severity: 'medium', message: 'Using <img> instead of next/image (unoptimized)', file: file.path })
        score -= 3
      }
      const useEffects = (file.content.match(/useEffect\s*\(/g) || []).length
      if (useEffects > 5) {
        issues.push({ severity: 'low', message: `${useEffects} useEffect hooks - check for cleanup/consolidation`, file: file.path })
        score -= 2
      }
      if ((file.content.match(/style=\{\{/g) || []).length > 5) {
        issues.push({ severity: 'low', message: 'Many inline style objects (cause re-renders)', file: file.path })
        score -= 2
      }
    }

    if (reviewType === 'maintainability' || reviewType === 'full') {
      if (lines.length > 500) {
        issues.push({ severity: 'medium', message: `${lines.length} lines - consider splitting`, file: file.path })
        score -= 3
      }
      const anyCount = (file.content.match(/:\s*any\b/g) || []).length
      if (anyCount > 3) {
        issues.push({ severity: 'medium', message: `${anyCount} uses of 'any' type`, file: file.path })
        score -= 3
      }
      if (lines.filter((l: string) => l.match(/^\s{16,}\S/)).length > 5) {
        issues.push({ severity: 'low', message: 'Deeply nested code (4+ levels)', file: file.path })
        score -= 2
      }
    }
  }

  score = Math.max(0, Math.min(100, score))

  if (issues.some(i => i.severity === 'critical')) suggestions.push('Fix critical security issues immediately')
  if (issues.some(i => i.message.includes('any'))) suggestions.push('Replace `any` types with proper interfaces')
  if (issues.some(i => i.message.includes('validation'))) suggestions.push('Add Zod schema validation to API routes')
  if (issues.some(i => i.message.includes('next/image'))) suggestions.push('Use next/image for automatic optimization')
  if (issues.length === 0) suggestions.push('No issues found - code looks good!')

  return { score, issues: issues.slice(0, 20), suggestions }
}

function formatReviewMarkdown(reviewType: string, analysis: ReturnType<typeof analyzeCode>, fileCount: number): string {
  const severity_emoji: Record<string, string> = { critical: '[CRITICAL]', high: '[HIGH]', medium: '[MEDIUM]', low: '[LOW]' }
  const title = reviewType === 'full' ? 'Full Code Review' : `${reviewType.charAt(0).toUpperCase() + reviewType.slice(1)} Review`

  let md = `# ${title}\n\n`
  md += `**Score:** ${analysis.score}/100 | **Files analyzed:** ${fileCount} | **Issues found:** ${analysis.issues.length}\n\n`

  if (analysis.issues.length > 0) {
    md += `## Issues\n\n`
    for (const issue of analysis.issues) {
      md += `- ${severity_emoji[issue.severity] || ''} **${issue.message}** - \`${issue.file}\`\n`
    }
    md += '\n'
  }

  if (analysis.suggestions.length > 0) {
    md += `## Suggestions\n\n`
    for (const s of analysis.suggestions) {
      md += `- ${s}\n`
    }
  }

  return md
}

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
    const content = formatReviewMarkdown(type, analysis, files.length)

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
