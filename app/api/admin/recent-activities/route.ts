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
      { data: recentPayments, error: paymentsError },
      { data: recentDeployments, error: deploymentsError },
      { data: recentNotifications, error: notificationsError }
    ] = await Promise.all([
      // Recent user registrations
      supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(3),

      // Recent subscription changes (from user_settings)
      supabase
        .from('user_settings')
        .select('user_id, subscription_status, subscription_plan, updated_at, profiles(email, full_name)')
        .eq('subscription_status', 'active')
        .order('updated_at', { ascending: false })
        .limit(2),

      // Recent deployments (from usage_records)
      supabase
        .from('usage_records')
        .select('user_id, operation, created_at, profiles(email, full_name)')
        .eq('operation', 'deployment')
        .order('created_at', { ascending: false })
        .limit(2),

      // Recent admin notifications
      supabase
        .from('admin_notifications')
        .select('id, title, type, created_at, profiles!admin_notifications_sent_by_fkey(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(2)
    ])

    if (usersError || paymentsError || deploymentsError || notificationsError) {
      console.error('Error fetching recent activities:', {
        usersError, paymentsError, deploymentsError, notificationsError
      })
      return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
    }

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
      const profile = Array.isArray(payment.profiles) ? payment.profiles[0] : payment.profiles;
      activities.push({
        id: `sub-${payment.user_id}-${payment.updated_at}`,
        type: 'subscription',
        title: 'Subscription upgrade',
        description: `${profile?.full_name || profile?.email || 'User'} upgraded to ${payment.subscription_plan}`,
        timestamp: payment.updated_at,
        color: 'blue'
      })
    })

    // Add deployments
    recentDeployments?.forEach(deployment => {
      const profile = Array.isArray(deployment.profiles) ? deployment.profiles[0] : deployment.profiles;
      activities.push({
        id: `deploy-${deployment.user_id}-${deployment.created_at}`,
        type: 'deployment',
        title: 'Site deployment',
        description: `${profile?.full_name || profile?.email || 'User'} deployed a site`,
        timestamp: deployment.created_at,
        color: 'purple'
      })
    })

    // Add notifications
    recentNotifications?.forEach(notification => {
      activities.push({
        id: `notif-${notification.id}`,
        type: 'notification',
        title: notification.title,
        description: `Admin notification: ${notification.type}`,
        timestamp: notification.created_at,
        color: 'yellow'
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