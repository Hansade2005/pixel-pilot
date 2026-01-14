import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkAdminAccess } from "@/lib/admin-utils"

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

    // Get recent activities from various tables
    const [
      { data: recentUsers, error: usersError },
      { data: recentPayments, error: paymentsError }
    ] = await Promise.all([
      // Recent user registrations
      supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5),

      // Recent subscription changes (from user_settings)
      supabase
        .from('user_settings')
        .select('user_id, subscription_status, subscription_plan, updated_at')
        .neq('subscription_plan', 'free')
        .eq('subscription_status', 'active')
        .order('updated_at', { ascending: false })
        .limit(5)
    ])

    if (usersError || paymentsError) {
      console.error('Error fetching recent activities:', {
        usersError, paymentsError
      })
      return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
    }

    // Fetch profiles for subscription users
    const paymentUserIds = recentPayments?.map(p => p.user_id) || []
    let paymentProfiles: any[] = []
    
    if (paymentUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', paymentUserIds)
      
      if (!profilesError && profiles) {
        paymentProfiles = profiles
      }
    }

    const profilesMap = new Map(paymentProfiles.map(p => [p.id, p]))

    // Combine and format activities
    const activities: Array<{
      id: string
      type: 'user_registration' | 'subscription' | 'deployment' | 'notification'
      title: string
      description: string
      timestamp: string
      color: string
    }> = []

    // Add user registrations
    recentUsers?.forEach(user => {
      activities.push({
        id: `user-${user.id}`,
        type: 'user_registration',
        title: 'New user registration',
        description: `${user.full_name || user.email} joined the platform`,
        timestamp: user.created_at,
        color: 'green'
      })
    })

    // Add subscription upgrades
    recentPayments?.forEach(payment => {
      const profile = profilesMap.get(payment.user_id)
      activities.push({
        id: `sub-${payment.user_id}-${payment.updated_at}`,
        type: 'subscription',
        title: 'Subscription upgrade',
        description: `${profile?.full_name || profile?.email || 'User'} upgraded to ${payment.subscription_plan}`,
        timestamp: payment.updated_at,
        color: 'blue'
      })
    })

    // Sort by timestamp and take the most recent 6
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const recentActivities = activities.slice(0, 6)

    return NextResponse.json(recentActivities)
  } catch (error) {
    console.error('Error in recent activities API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent activities' },
      { status: 500 }
    )
  }
}