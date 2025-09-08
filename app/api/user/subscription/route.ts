import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userSettings, error } = await supabase
      .from('user_settings')
      .select(`
        subscription_plan,
        subscription_status,
        credits_remaining,
        credits_used_this_month,
        subscription_start_date,
        subscription_end_date,
        last_payment_date,
        cancel_at_period_end
      `)
      .eq('user_id', user.id)
      .single()

    if (error) {
      // If no settings exist, return free plan defaults
      return NextResponse.json({
        plan: 'free',
        status: 'active',
        creditsRemaining: 25,
        creditsUsedThisMonth: 0,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        lastPaymentDate: null,
        cancelAtPeriodEnd: false,
      })
    }

    return NextResponse.json({
      plan: userSettings.subscription_plan,
      status: userSettings.subscription_status,
      creditsRemaining: userSettings.credits_remaining,
      creditsUsedThisMonth: userSettings.credits_used_this_month,
      subscriptionStartDate: userSettings.subscription_start_date,
      subscriptionEndDate: userSettings.subscription_end_date,
      lastPaymentDate: userSettings.last_payment_date,
      cancelAtPeriodEnd: userSettings.cancel_at_period_end,
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

