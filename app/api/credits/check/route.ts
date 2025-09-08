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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { requiredCredits } = body

    if (!requiredCredits || typeof requiredCredits !== 'number') {
      return NextResponse.json({ error: "Required credits must be a number" }, { status: 400 })
    }

    // Check if user is admin
    const userIsAdmin = isAdmin(user.email || '')
    if (userIsAdmin) {
      console.log(`[ADMIN] Admin user ${user.id} bypassing credit check`)
      return NextResponse.json({
        hasCredits: true,
        remainingCredits: 999999,
        creditStatus: {
          remaining: 999999,
          used: 0,
          limit: 999999,
          plan: 'admin',
          status: 'ok'
        }
      })
    }

    // Check if subscription system is enabled
    const subscriptionEnabled = await isSubscriptionSystemEnabled()
    if (!subscriptionEnabled) {
      console.log(`[FREE MODE] Subscription system disabled - granting unlimited credits to user ${user.id}`)
      return NextResponse.json({
        hasCredits: true,
        remainingCredits: 999999,
        creditStatus: {
          remaining: 999999,
          used: 0,
          limit: 999999,
          plan: 'free_mode',
          status: 'ok'
        }
      })
    }

    // Get user's current subscription and credits
    const { data: userSettings, error } = await supabase
      .from('user_settings')
      .select('subscription_plan, credits_remaining, credits_used_this_month')
      .eq('user_id', user.id)
      .single()

    if (error || !userSettings) {
      // Default to free tier if no settings found
      const freeLimits = { credits: 25 }
      return NextResponse.json({
        hasCredits: requiredCredits <= freeLimits.credits,
        remainingCredits: freeLimits.credits,
        creditStatus: {
          remaining: freeLimits.credits,
          used: 0,
          limit: freeLimits.credits,
          plan: 'free',
          status: requiredCredits <= freeLimits.credits ? 'ok' : 'exhausted'
        }
      })
    }

    // Import limits function
    const { getLimits } = await import('@/lib/stripe-config')
    const limits = getLimits(userSettings.subscription_plan)
    const remaining = userSettings.credits_remaining || limits.credits
    const used = userSettings.credits_used_this_month || 0

    return NextResponse.json({
      hasCredits: remaining >= requiredCredits,
      remainingCredits: remaining,
      creditStatus: {
        remaining,
        used,
        limit: limits.credits,
        plan: userSettings.subscription_plan,
        status: remaining > limits.credits * 0.2 ? 'ok' :
               remaining > 0 ? 'low' : 'exhausted'
      }
    })
  } catch (error) {
    console.error('Error in credit check API:', error)
    return NextResponse.json(
      { error: 'Failed to check credits' },
      { status: 500 }
    )
  }
}
