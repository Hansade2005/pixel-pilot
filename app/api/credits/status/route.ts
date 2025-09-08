import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/admin-utils"

async function isSubscriptionSystemEnabled(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: setting, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'subscription_system_enabled')
      .single()

    if (error || !setting) {
      return true // Default to enabled if no setting exists
    }

    return setting.value?.enabled === true
  } catch (error) {
    console.error('Error checking subscription system status:', error)
    return true // Default to enabled on error
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const userIsAdmin = isAdmin(user.email || '')
    if (userIsAdmin) {
      console.log(`[ADMIN] Admin user ${user.id} getting unlimited credit status`)
      return NextResponse.json({
        remaining: 999999,
        used: 0,
        limit: 999999,
        plan: 'admin',
        status: 'ok'
      })
    }

    // Check if subscription system is enabled
    const subscriptionEnabled = await isSubscriptionSystemEnabled()
    if (!subscriptionEnabled) {
      console.log(`[FREE MODE] Subscription system disabled - user ${user.id} getting unlimited credit status`)
      return NextResponse.json({
        remaining: 999999,
        used: 0,
        limit: 999999,
        plan: 'free_mode',
        status: 'ok'
      })
    }

    const { data: userSettings, error } = await supabase
      .from('user_settings')
      .select('subscription_plan, credits_remaining, credits_used_this_month')
      .eq('user_id', user.id)
      .single()

    if (error || !userSettings) {
      // Return free tier defaults
      const freeLimits = { credits: 25 }
      return NextResponse.json({
        remaining: freeLimits.credits,
        used: 0,
        limit: freeLimits.credits,
        plan: 'free',
        status: 'ok'
      })
    }

    const { getLimits } = await import('@/lib/stripe-config')
    const limits = getLimits(userSettings.subscription_plan)
    const remaining = userSettings.credits_remaining || limits.credits
    const used = userSettings.credits_used_this_month || 0

    return NextResponse.json({
      remaining,
      used,
      limit: limits.credits,
      plan: userSettings.subscription_plan,
      status: remaining > limits.credits * 0.2 ? 'ok' :
             remaining > 0 ? 'low' : 'exhausted'
    })
  } catch (error) {
    console.error('Error in credit status API:', error)
    return NextResponse.json(
      { error: 'Failed to get credit status' },
      { status: 500 }
    )
  }
}
