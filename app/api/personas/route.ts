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

// GET - List all personas for user (optionally filtered by project)
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    let query = supabase
      .from('ai_personas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // If projectId specified, get both project-specific AND global personas
    if (projectId) {
      query = supabase
        .from('ai_personas')
        .select('*')
        .eq('user_id', user.id)
        .or(`project_id.eq.${projectId},project_id.is.null`)
        .order('created_at', { ascending: false })
    }

    const { data, error } = await query
    if (error) {
      console.error('[Personas] Error fetching:', error)
      return NextResponse.json({ error: 'Failed to fetch personas' }, { status: 500 })
    }

    return NextResponse.json({ personas: data || [] })
  } catch (error) {
    console.error('[Personas] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new persona
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, instructions, projectId, icon } = body

    if (!name || !instructions) {
      return NextResponse.json({ error: 'Name and instructions are required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from('ai_personas')
      .insert({
        user_id: user.id,
        name: name.trim(),
        instructions: instructions.trim(),
        project_id: projectId || null,
        icon: icon || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[Personas] Error creating:', error)
      return NextResponse.json({ error: 'Failed to create persona' }, { status: 500 })
    }

    return NextResponse.json({ persona: data })
  } catch (error) {
    console.error('[Personas] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a persona
export async function PUT(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, name, instructions, icon } = body

    if (!id) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name.trim()
    if (instructions !== undefined) updates.instructions = instructions.trim()
    if (icon !== undefined) updates.icon = icon

    const { data, error } = await supabase
      .from('ai_personas')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('[Personas] Error updating:', error)
      return NextResponse.json({ error: 'Failed to update persona' }, { status: 500 })
    }

    return NextResponse.json({ persona: data })
  } catch (error) {
    console.error('[Personas] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a persona
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { error } = await supabase
      .from('ai_personas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[Personas] Error deleting:', error)
      return NextResponse.json({ error: 'Failed to delete persona' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Personas] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
