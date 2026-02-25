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

// GET - List snapshots for a project
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const snapshotId = searchParams.get('id')

    // Get a single snapshot with full file data
    if (snapshotId) {
      const { data, error } = await supabase
        .from('project_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
      }
      return NextResponse.json({ snapshot: data })
    }

    // List snapshots for project (without full file content for performance)
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_snapshots')
      .select('id, user_id, project_id, name, description, file_count, total_size, created_at')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[Snapshots] Error fetching:', error)
      return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 })
    }

    return NextResponse.json({ snapshots: data || [] })
  } catch (error) {
    console.error('[Snapshots] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new snapshot
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { projectId, name, description, files } = body

    if (!projectId || !name || !files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'projectId, name, and files are required' }, { status: 400 })
    }

    // Calculate total size
    const totalSize = files.reduce((sum: number, f: any) => sum + (f.content?.length || 0), 0)

    // Limit: 50MB per snapshot
    if (totalSize > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Snapshot too large (max 50MB)' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from('project_snapshots')
      .insert({
        user_id: user.id,
        project_id: projectId,
        name: name.trim(),
        description: description?.trim() || null,
        file_count: files.length,
        total_size: totalSize,
        files: files.map((f: any) => ({
          path: f.path,
          content: f.content,
          size: f.content?.length || 0,
        })),
      })
      .select('id, project_id, name, description, file_count, total_size, created_at')
      .single()

    if (error) {
      console.error('[Snapshots] Error creating:', error)
      return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 })
    }

    return NextResponse.json({ snapshot: data })
  } catch (error) {
    console.error('[Snapshots] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a snapshot
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Snapshot ID is required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { error } = await supabase
      .from('project_snapshots')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[Snapshots] Error deleting:', error)
      return NextResponse.json({ error: 'Failed to delete snapshot' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Snapshots] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
