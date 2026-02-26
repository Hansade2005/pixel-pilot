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

function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return expr
  const [min, hour, dom, mon, dow] = parts

  if (min.startsWith('*/')) return `Every ${min.slice(2)} minutes`
  if (dow === '*' && dom === '*' && hour !== '*') return `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')} UTC`
  if (dow !== '*') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return `Every ${days[parseInt(dow)] || dow} at ${(hour || '0').padStart(2, '0')}:${(min || '0').padStart(2, '0')} UTC`
  }
  return expr
}

// GET - List scheduled tasks
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('id')

    if (taskId) {
      // Get single task with recent executions
      const [taskResult, execResult] = await Promise.all([
        supabase.from('scheduled_tasks').select('*').eq('id', taskId).eq('user_id', user.id).single(),
        supabase.from('task_executions').select('*').eq('task_id', taskId).eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(20),
      ])

      if (taskResult.error) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      return NextResponse.json({
        task: { ...taskResult.data, cron_description: describeCron(taskResult.data.cron_expression) },
        executions: execResult.data || [],
      })
    }

    const { data, error } = await supabase
      .from('scheduled_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })

    return NextResponse.json({
      tasks: (data || []).map(t => ({ ...t, cron_description: describeCron(t.cron_expression) })),
    })
  } catch (error) {
    console.error('[ScheduledTasks] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new scheduled task
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, description, cron_expression, config } = body

    if (!name || !cron_expression) {
      return NextResponse.json({ error: 'name and cron_expression are required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const nextExecution = getNextExecution(cron_expression)

    const { data, error } = await supabase
      .from('scheduled_tasks')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        cron_expression: cron_expression.trim(),
        config: config || {},
        next_execution_at: nextExecution,
        enabled: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[ScheduledTasks] Create error:', error)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    return NextResponse.json({ task: { ...data, cron_description: describeCron(data.cron_expression) } })
  } catch (error) {
    console.error('[ScheduledTasks] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a scheduled task
export async function PUT(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, name, description, cron_expression, config, enabled } = body

    if (!id) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (config !== undefined) updates.config = config
    if (enabled !== undefined) updates.enabled = enabled
    if (cron_expression !== undefined) {
      updates.cron_expression = cron_expression.trim()
      updates.next_execution_at = getNextExecution(cron_expression.trim())
    }

    const { data, error } = await supabase
      .from('scheduled_tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    return NextResponse.json({ task: { ...data, cron_description: describeCron(data.cron_expression) } })
  } catch (error) {
    console.error('[ScheduledTasks] PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a scheduled task
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { error } = await supabase.from('scheduled_tasks').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ScheduledTasks] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
