import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkAdminAccess } from "@/lib/admin-utils"
import { createClient as createAdminClient } from "@supabase/supabase-js"

// Helper function to create admin Supabase client with service role
function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase service role configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")
  }

  return createAdminClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!checkAdminAccess(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Fetch all users from auth.users using service role
    const adminSupabase = createAdminSupabaseClient()
    const { data: allUsers, error: usersError } = await adminSupabase.auth.admin.listUsers()

    if (usersError) {
      console.error('Error fetching all users:', usersError)
      return NextResponse.json({
        error: "Failed to fetch users",
        details: usersError.message
      }, { status: 500 })
    }

    // Get user settings for all users
    const userIds = allUsers.users.map(u => u.id)
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .in('user_id', userIds)

    if (settingsError) {
      console.error('Error fetching user settings:', settingsError)
    }

    // Get profiles for all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
    }

    // Combine all user data
    const usersWithData = allUsers.users.map(authUser => {
      const settings = userSettings?.find(s => s.user_id === authUser.id)
      const profile = profiles?.find(p => p.id === authUser.id)

      return {
        id: authUser.id,
        email: authUser.email,
        emailConfirmed: authUser.email_confirmed_at ? true : false,
        createdAt: authUser.created_at,
        lastSignIn: authUser.last_sign_in_at,
        // Profile data
        fullName: profile?.full_name || null,
        avatarUrl: profile?.avatar_url || null,
        // Settings data
        subscriptionPlan: settings?.subscription_plan || 'free',
        subscriptionStatus: settings?.subscription_status || 'inactive',
        creditsRemaining: settings?.credits_remaining || 25,
        creditsUsedThisMonth: settings?.credits_used_this_month || 0,
        stripeCustomerId: settings?.stripe_customer_id || null,
        stripeSubscriptionId: settings?.stripe_subscription_id || null,
        lastPaymentDate: settings?.last_payment_date || null,
        cancelAtPeriodEnd: settings?.cancel_at_period_end || false,
        // Computed fields
        isAdmin: checkAdminAccess({ email: authUser.email }),
        hasProfile: !!profile,
        hasSettings: !!settings
      }
    })

    // Sort by creation date (newest first)
    usersWithData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      users: usersWithData,
      total: usersWithData.length,
      stats: {
        totalUsers: usersWithData.length,
        activeUsers: usersWithData.filter(u => u.subscriptionStatus === 'active').length,
        adminUsers: usersWithData.filter(u => u.isAdmin).length,
        usersWithProfiles: usersWithData.filter(u => u.hasProfile).length,
        usersWithSettings: usersWithData.filter(u => u.hasSettings).length
      }
    })
  } catch (error) {
    console.error('Error in admin users API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!checkAdminAccess(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, action, data } = body

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing userId or action" }, { status: 400 })
    }

    let result

    switch (action) {
      case 'update_credits':
        if (typeof data.credits !== 'number') {
          return NextResponse.json({ error: "Invalid credits value" }, { status: 400 })
        }

        result = await supabase
          .from('user_settings')
          .upsert({
            user_id: userId,
            credits_remaining: data.credits,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
        break

      case 'update_plan':
        if (!data.plan) {
          return NextResponse.json({ error: "Missing plan" }, { status: 400 })
        }

        result = await supabase
          .from('user_settings')
          .upsert({
            user_id: userId,
            subscription_plan: data.plan,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
        break

      case 'suspend_user':
        // In a real implementation, you might want to disable the user
        // For now, we'll just update their status
        result = await supabase
          .from('user_settings')
          .upsert({
            user_id: userId,
            subscription_status: 'inactive',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
        break

      case 'create_profile':
        if (!data.fullName) {
          return NextResponse.json({ error: "Missing full name" }, { status: 400 })
        }

        result = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            full_name: data.fullName,
            avatar_url: data.avatarUrl || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          })
        break

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    if (result?.error) {
      console.error(`Error performing ${action}:`, result.error)
      return NextResponse.json({ error: `Failed to ${action}` }, { status: 500 })
    }

    // Log admin action
    console.log(`[ADMIN] ${user.email} performed ${action} on user ${userId}`)

    return NextResponse.json({
      success: true,
      message: `${action} completed successfully`,
      data: result?.data
    })
  } catch (error) {
    console.error('Error in admin users PATCH API:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!checkAdminAccess(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { userId } = body || {}

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    if (userId === user.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 })
    }

    // Fetch target user to prevent deleting other admins
    const adminSupabase = createAdminSupabaseClient()
    const { data: targetUserData, error: getUserError } = await adminSupabase.auth.admin.getUserById(userId)

    if (getUserError || !targetUserData?.user) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 })
    }

    const targetEmail = targetUserData.user.email || undefined
    if (checkAdminAccess({ email: targetEmail })) {
      return NextResponse.json({ error: "You cannot delete another admin" }, { status: 403 })
    }

    // Best-effort cleanup of related rows using service role (bypass RLS)
    const cleanupResults = await Promise.all([
      adminSupabase.from('profiles').delete().eq('id', userId),
      adminSupabase.from('user_settings').delete().eq('user_id', userId)
    ])

    const cleanupError = cleanupResults.find(r => (r as any)?.error)
    if (cleanupError && (cleanupError as any).error) {
      console.warn('Warning: cleanup error before user deletion:', (cleanupError as any).error)
    }

    // Delete from auth.users using service role
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError)
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }

    console.log(`[ADMIN] ${user.email} deleted user ${userId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in admin users DELETE API:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}