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

// GET - List showcase projects (public) or user's published projects
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    const myProjects = searchParams.get('mine') === 'true'
    const category = searchParams.get('category')
    const sort = searchParams.get('sort') || 'recent'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    if (myProjects) {
      const user = await getUser(request)
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      const { data, error } = await supabase
        .from('showcase_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
      return NextResponse.json({ projects: data || [] })
    }

    // Public listing
    let query = supabase
      .from('showcase_projects')
      .select('*')
      .in('status', ['published', 'featured'])

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    switch (sort) {
      case 'popular': query = query.order('likes', { ascending: false }); break
      case 'views': query = query.order('views', { ascending: false }); break
      case 'featured': query = query.eq('status', 'featured').order('created_at', { ascending: false }); break
      default: query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query.limit(limit)
    if (error) return NextResponse.json({ error: 'Failed to fetch showcase' }, { status: 500 })
    return NextResponse.json({ projects: data || [] })
  } catch (error) {
    console.error('[Showcase] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Publish a project to showcase
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { projectId, title, description, category, thumbnailUrl, liveUrl, githubUrl, techStack } = body

    if (!projectId || !title) {
      return NextResponse.json({ error: 'projectId and title are required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if already published
    const { data: existing } = await supabase
      .from('showcase_projects')
      .select('id')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single()

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('showcase_projects')
        .update({
          title: title.trim(),
          description: description?.trim() || null,
          category: category || 'general',
          thumbnail_url: thumbnailUrl || null,
          live_url: liveUrl || null,
          github_url: githubUrl || null,
          tech_stack: techStack || [],
          status: 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: 'Failed to update showcase project' }, { status: 500 })
      return NextResponse.json({ project: data, updated: true })
    }

    // Create new
    const { data, error } = await supabase
      .from('showcase_projects')
      .insert({
        user_id: user.id,
        project_id: projectId,
        title: title.trim(),
        description: description?.trim() || null,
        category: category || 'general',
        thumbnail_url: thumbnailUrl || null,
        live_url: liveUrl || null,
        github_url: githubUrl || null,
        tech_stack: techStack || [],
        status: 'published',
      })
      .select()
      .single()

    if (error) {
      console.error('[Showcase] Create error:', error)
      return NextResponse.json({ error: 'Failed to publish project' }, { status: 500 })
    }

    return NextResponse.json({ project: data })
  } catch (error) {
    console.error('[Showcase] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Like/view a showcase project
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action } = body

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action are required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (action === 'view') {
      // Increment views - fetch current value and update
      const { data: current } = await supabase
        .from('showcase_projects')
        .select('views')
        .eq('id', id)
        .single()

      if (current) {
        await supabase
          .from('showcase_projects')
          .update({ views: (current.views || 0) + 1 })
          .eq('id', id)
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'like') {
      const { data } = await supabase
        .from('showcase_projects')
        .select('likes')
        .eq('id', id)
        .single()

      if (data) {
        await supabase
          .from('showcase_projects')
          .update({ likes: (data.likes || 0) + 1 })
          .eq('id', id)
      }
      return NextResponse.json({ success: true, likes: (data?.likes || 0) + 1 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Showcase] PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Unpublish a project
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { error } = await supabase.from('showcase_projects').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: 'Failed to unpublish project' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Showcase] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
