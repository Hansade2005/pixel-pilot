import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Admin user search endpoint
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with service role key for admin access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify admin access
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      // Get user from session
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check if user is admin
      const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || []
      if (!adminUserIds.includes(user.id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Get search query
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''

    if (query.length < 2) {
      return NextResponse.json({ 
        users: [],
        message: 'Query must be at least 2 characters' 
      })
    }

    // Search for users by email or metadata (full_name)
    // Using auth.users table via admin API
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 20,
    })

    if (error) {
      console.error('Error listing users:', error)
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
    }

    // Filter users based on search query
    const searchLower = query.toLowerCase()
    const filteredUsers = users
      .filter(user => {
        const email = user.email?.toLowerCase() || ''
        const fullName = user.user_metadata?.full_name?.toLowerCase() || ''
        return email.includes(searchLower) || fullName.includes(searchLower)
      })
      .slice(0, 10) // Limit to 10 results
      .map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        created_at: user.created_at,
      }))

    return NextResponse.json({ 
      users: filteredUsers,
      total: filteredUsers.length 
    })

  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
