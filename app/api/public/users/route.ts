import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Public endpoint to fetch users for homepage display
// This shows a limited set of recent/active users for community showcase
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50) // Max 50 users
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch users from auth.users (public info only)
    // We'll get basic user info that's safe to display publicly
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
      page: Math.floor(offset / 100), // Supabase pagination
      perPage: Math.min(limit + offset, 100)
    })

    if (authError) {
      console.error('Error fetching auth users:', authError)
      return NextResponse.json({
        error: "Failed to fetch users",
        details: authError.message
      }, { status: 500 })
    }

    // Get user profiles/settings for additional info
    const userIds = authUsers.users.map(u => u.id)
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_settings')
      .select('user_id, full_name, avatar_url, subscription_plan, created_at, deployments_this_month, github_pushes_this_month')
      .in('user_id', userIds)

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError)
      // Continue without profiles - we'll use auth data only
    }

    // Combine auth users with profile data
    const users = authUsers.users.slice(offset, offset + limit).map(authUser => {
      const profile = userProfiles?.find(p => p.user_id === authUser.id)

      return {
        id: authUser.id,
        email: authUser.email,
        emailConfirmed: authUser.email_confirmed_at ? true : false,
        createdAt: authUser.created_at,
        lastSignIn: authUser.last_sign_in_at,
        fullName: profile?.full_name || null,
        avatarUrl: profile?.avatar_url || null,
        subscriptionPlan: profile?.subscription_plan || 'free',
        deploymentsThisMonth: profile?.deployments_this_month || 0,
        githubPushesThisMonth: profile?.github_pushes_this_month || 0,
        // Don't expose sensitive info like stripe IDs, admin status, etc.
      }
    })

    // Sort by most recent sign-in or creation, and filter out users without activity
    const activeUsers = users
      .filter(user => user.lastSignIn || user.deploymentsThisMonth > 0 || user.githubPushesThisMonth > 0)
      .sort((a, b) => {
        const aDate = new Date(a.lastSignIn || a.createdAt).getTime()
        const bDate = new Date(b.lastSignIn || b.createdAt).getTime()
        return bDate - aDate
      })
      .slice(0, limit)

    return NextResponse.json({
      users: activeUsers,
      total: activeUsers.length,
      hasMore: authUsers.users.length > offset + limit
    })

  } catch (error) {
    console.error('Error in public users API:', error)
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}