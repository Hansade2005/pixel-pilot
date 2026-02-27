import { NextRequest, NextResponse } from 'next/server'
import { generateText, tool } from 'ai'
import { createMistral } from '@ai-sdk/mistral'
import { z } from 'zod'

// Supabase service client (no cookie-based auth needed for cron)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function getSupabase() {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Tavily config for web search/extract tools
const tavilyConfig = {
  apiKeys: [
    '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',
    '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',
    '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'
  ],
  currentKeyIndex: 0
}

function getNextTavilyKey(): string {
  const key = tavilyConfig.apiKeys[tavilyConfig.currentKeyIndex]
  tavilyConfig.currentKeyIndex = (tavilyConfig.currentKeyIndex + 1) % tavilyConfig.apiKeys.length
  return key
}

// AI model for task execution (fast, cheap, good for research)
const mistralProvider = createMistral({
  apiKey: process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr',
})

// ─── Web search via Tavily ───────────────────────────────────────────────────
async function searchWeb(query: string): Promise<string> {
  const apiKey = getNextTavilyKey()
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query,
      search_depth: 'basic',
      include_answer: false,
      include_raw_content: false,
      max_results: 5
    })
  })

  if (!response.ok) {
    throw new Error(`Web search failed: ${response.status}`)
  }

  const data = await response.json()
  const results = data.results || []

  if (results.length === 0) return `No results found for: "${query}"`

  let text = ''
  for (const r of results.slice(0, 5)) {
    const content = (r.content || '').replace(/\s+/g, ' ').trim().substring(0, 400)
    text += `**${r.title || 'Untitled'}**\n${r.url || ''}\n${content}\n\n`
  }
  return text.substring(0, 3000)
}

// ─── Web extract via Tavily ──────────────────────────────────────────────────
async function extractWebContent(url: string): Promise<string> {
  const apiKey = getNextTavilyKey()
  const response = await fetch('https://api.tavily.com/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      urls: [url],
      include_images: false,
      extract_depth: 'basic'
    })
  })

  if (!response.ok) {
    throw new Error(`Web extraction failed: ${response.status}`)
  }

  const data = await response.json()
  const results = data.results || []
  if (results.length === 0) return `No content extracted from: ${url}`

  const item = results[0]
  const content = (item.text || item.raw_content || '').replace(/\s+/g, ' ').trim()
  return content.substring(0, 4000)
}

// ─── Cron-safe next execution calculator ─────────────────────────────────────
function getNextExecution(cronExpr: string): string {
  const now = new Date()
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length !== 5) return new Date(now.getTime() + 86400000).toISOString()

  const [min, hour, dom, mon, dow] = parts

  // Every N minutes: */N * * * *
  if (min.startsWith('*/')) {
    const interval = parseInt(min.slice(2)) || 15
    const next = new Date(now)
    next.setSeconds(0, 0)
    next.setMinutes(Math.ceil((next.getMinutes() + 1) / interval) * interval)
    if (next <= now) next.setMinutes(next.getMinutes() + interval)
    return next.toISOString()
  }

  // Every N hours: 0 */N * * *
  if (hour.startsWith('*/')) {
    const interval = parseInt(hour.slice(2)) || 6
    const next = new Date(now)
    next.setMinutes(parseInt(min) || 0, 0, 0)
    next.setHours(Math.ceil((next.getHours() + 1) / interval) * interval)
    if (next <= now) next.setHours(next.getHours() + interval)
    return next.toISOString()
  }

  // Daily at specific time: M H * * *
  if (min !== '*' && hour !== '*' && dom === '*' && mon === '*' && dow === '*') {
    const next = new Date(now)
    next.setHours(parseInt(hour), parseInt(min), 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    return next.toISOString()
  }

  // Weekly: M H * * D
  if (dow !== '*' && dom === '*') {
    const targetDow = parseInt(dow)
    const next = new Date(now)
    next.setHours(parseInt(hour) || 0, parseInt(min) || 0, 0, 0)
    let daysUntil = (targetDow - next.getDay() + 7) % 7
    if (daysUntil === 0 && next <= now) daysUntil = 7
    next.setDate(next.getDate() + daysUntil)
    return next.toISOString()
  }

  // Default: 24 hours from now
  return new Date(now.getTime() + 86400000).toISOString()
}

// ─── Execute a single task ───────────────────────────────────────────────────
async function executeTask(task: any): Promise<{ output: string; error: string | null }> {
  const prompt = task.config?.prompt
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return { output: '', error: 'Task has no prompt configured. Add a prompt in the task settings.' }
  }

  const model = mistralProvider('mistral-small-latest')

  // Capture the result from the save_result tool call
  let savedResult: string | null = null

  try {
    const result = await generateText({
      model,
      maxTokens: 2048,
      temperature: 0.4,
      system: `You are a research assistant for PiPilot, an AI-powered app builder. You execute scheduled tasks that involve research, information gathering, monitoring, and analysis.

Your capabilities:
- Search the web for current information
- Extract content from web pages
- Analyze and summarize findings
- Provide structured reports

Rules:
- Be concise and factual
- Always cite sources with URLs when using web search
- If the task asks for monitoring/checking something, clearly state current status
- Format output in clean markdown
- Do NOT generate code or modify any files - you are research-only
- Complete the task in as few tool calls as possible (max 3)
- IMPORTANT: When you have finished your research, you MUST call the save_result tool with your complete findings formatted in markdown. This is required to save the task output. Never skip calling save_result.
- Current time: ${new Date().toISOString()}`,
      messages: [
        { role: 'user', content: prompt }
      ],
      tools: {
        web_search: tool({
          description: 'Search the web for current information. Use this for research, news, documentation lookup, status checks, etc.',
          parameters: z.object({
            query: z.string().describe('Search query')
          }),
          execute: async ({ query }) => {
            return await searchWeb(query)
          }
        }),
        web_extract: tool({
          description: 'Extract and read content from a specific web page URL.',
          parameters: z.object({
            url: z.string().url().describe('URL to extract content from')
          }),
          execute: async ({ url }) => {
            return await extractWebContent(url)
          }
        }),
        save_result: tool({
          description: 'Save the final task result. You MUST call this tool at the end of every task with your complete findings formatted in markdown. This is how the results get stored and displayed to the user.',
          parameters: z.object({
            result: z.string().describe('The complete task result in markdown format. Include headings, bullet points, links, and any relevant data you gathered.')
          }),
          execute: async ({ result: markdown }) => {
            savedResult = markdown
            return 'Result saved successfully.'
          }
        }),
      },
      maxSteps: 30,
    })

    // Prefer the explicitly saved result from save_result tool, fall back to result.text
    const output = savedResult || result.text || 'Task completed with no output.'
    return { output, error: null }
  } catch (err: any) {
    console.error(`[ScheduledTasks] AI execution error for task ${task.id}:`, err)
    // Still return savedResult if the tool was called before the error
    if (savedResult) {
      return { output: savedResult, error: null }
    }
    return { output: '', error: err.message || 'AI execution failed' }
  }
}

// ─── Main cron handler ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || process.env.NOTIFICATION_API_KEY
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await getSupabase()
    const now = new Date().toISOString()

    console.log('[ScheduledTasks] Cron triggered, checking for due tasks...')

    // Find all enabled tasks whose next_execution_at is in the past
    const { data: dueTasks, error: fetchError } = await supabase
      .from('scheduled_tasks')
      .select('*')
      .eq('enabled', true)
      .lte('next_execution_at', now)
      .order('next_execution_at', { ascending: true })
      .limit(5) // Process max 5 tasks per cron run to stay within Vercel timeout

    if (fetchError) {
      console.error('[ScheduledTasks] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch due tasks' }, { status: 500 })
    }

    if (!dueTasks || dueTasks.length === 0) {
      console.log('[ScheduledTasks] No due tasks found')
      return NextResponse.json({
        success: true,
        message: 'No due tasks',
        processed: 0,
        durationMs: Date.now() - startTime
      })
    }

    console.log(`[ScheduledTasks] Found ${dueTasks.length} due task(s)`)

    const results = []

    for (const task of dueTasks) {
      const taskStartTime = Date.now()

      // 1. Create execution record with status "running"
      const { data: execution, error: insertError } = await supabase
        .from('task_executions')
        .insert({
          task_id: task.id,
          user_id: task.user_id,
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        console.error(`[ScheduledTasks] Failed to create execution record for task ${task.id}:`, insertError)
        results.push({ taskId: task.id, name: task.name, status: 'error', error: 'Failed to create execution record' })
        continue
      }

      // 2. Execute the task
      const { output, error: execError } = await executeTask(task)
      const completedAt = new Date().toISOString()
      const durationMs = Date.now() - taskStartTime
      const status = execError ? 'failed' : 'success'

      // 3. Update execution record
      const { error: updateExecError } = await supabase
        .from('task_executions')
        .update({
          status,
          completed_at: completedAt,
          output: output.substring(0, 10000), // Cap output size
          error_message: execError,
          duration_ms: durationMs,
        })
        .eq('id', execution.id)

      if (updateExecError) {
        console.error(`[ScheduledTasks] Failed to update execution ${execution.id}:`, updateExecError)
      }

      // 4. Update the task: increment count, set last_executed, recalculate next
      const nextExecution = getNextExecution(task.cron_expression)
      const { error: updateTaskError } = await supabase
        .from('scheduled_tasks')
        .update({
          execution_count: (task.execution_count || 0) + 1,
          last_executed_at: completedAt,
          next_execution_at: nextExecution,
          updated_at: completedAt,
        })
        .eq('id', task.id)

      if (updateTaskError) {
        console.error(`[ScheduledTasks] Failed to update task ${task.id}:`, updateTaskError)
      }

      results.push({
        taskId: task.id,
        name: task.name,
        status,
        executionId: execution.id,
        durationMs: Date.now() - taskStartTime,
        nextExecution,
      })

      console.log(`[ScheduledTasks] Task "${task.name}" ${status} in ${Date.now() - taskStartTime}ms`)
    }

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      processed: results.length,
      results,
      durationMs: Date.now() - startTime,
    }

    console.log('[ScheduledTasks] Cron completed:', JSON.stringify(summary))
    return NextResponse.json(summary)

  } catch (error: any) {
    console.error('[ScheduledTasks] Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      durationMs: Date.now() - startTime,
    }, { status: 500 })
  }
}

// POST alias for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}
