import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAccess } from '@/lib/admin-utils'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's teams
    const { data: teams, error } = await supabase
      .from('ai_platform_teams')
      .select('id, name, description, is_default, created_at')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching teams:', error)
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
    }

    return NextResponse.json({
      teams: teams || [],
      total: teams?.length || 0
    })

  } catch (error) {
    console.error('Error in teams API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}