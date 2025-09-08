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
    const { creditsToDeduct, operation, metadata } = body

    if (!creditsToDeduct || typeof creditsToDeduct !== 'number') {
      return NextResponse.json({ error: "Credits to deduct must be a number" }, { status: 400 })
    }

    // Check if user is admin
    const userIsAdmin = isAdmin(user.email || '')
    if (userIsAdmin) {
      console.log(`[ADMIN] Admin user ${user.id} skipping credit deduction for ${operation}`)
      return NextResponse.json({
        success: true,
        newBalance: 999999
      })
    }

    // Check if subscription system is enabled
    const subscriptionEnabled = await isSubscriptionSystemEnabled()
    if (!subscriptionEnabled) {
      console.log(`[FREE MODE] Subscription system disabled - skipping credit deduction for user ${user.id}`)
      return NextResponse.json({
        success: true,
        newBalance: 999999
      })
    }

    // Check if user has sufficient credits
    const { data: userSettings, error: checkError } = await supabase
      .from('user_settings')
      .select('subscription_plan, credits_remaining, credits_used_this_month')
      .eq('user_id', user.id)
      .single()

    if (checkError || !userSettings) {
      return NextResponse.json({
        success: false,
        error: 'User settings not found'
      }, { status: 404 })
    }

    const { getLimits } = await import('@/lib/stripe-config')
    const limits = getLimits(userSettings.subscription_plan)
    const remaining = userSettings.credits_remaining || limits.credits

    if (remaining < creditsToDeduct) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient credits'
      }, { status: 402 })
    }

    // Deduct credits
    const newBalance = remaining - creditsToDeduct
    const newUsed = (userSettings.credits_used_this_month || 0) + creditsToDeduct

    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        credits_remaining: newBalance,
        credits_used_this_month: newUsed,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error deducting credits:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to update credit balance'
      }, { status: 500 })
    }

    // Log credit usage
    console.log(`Credits deducted: ${creditsToDeduct} for ${operation}`, {
      userId: user.id,
      newBalance,
      metadata
    })

    return NextResponse.json({
      success: true,
      newBalance
    })
  } catch (error) {
    console.error('Error in credit deduction API:', error)
    return NextResponse.json(
      { error: 'Credit deduction failed' },
      { status: 500 }
    )
  }
}
