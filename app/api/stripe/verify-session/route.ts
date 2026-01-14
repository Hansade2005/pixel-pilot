import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import Stripe from "stripe"
import { updateUserPlan } from "@/lib/billing/credit-manager"

// Map Stripe price IDs to wallet plan names
const PRICE_TO_PLAN_MAP: Record<string, 'free' | 'creator' | 'collaborate' | 'scale'> = {
  'price_1SZ9843G7U0M1bp1WcX6j6b1': 'free',
  'price_1SZ98W3G7U0M1bp1u30VJE2V': 'creator',
  'price_1SZTlN3G7U0M1bp1Us7dGSSg': 'creator', // yearly
  'price_1SZ98n3G7U0M1bp1DipaxRvq': 'collaborate',
  'price_1SZTmV3G7U0M1bp1GrNHBxUg': 'collaborate', // yearly
  'price_1SZ98v3G7U0M1bp1YAD89Tx4': 'scale',
  'price_1SZToP3G7U0M1bp1v0AWlXZ6': 'scale', // yearly
}

// Helper function to get Stripe instance safely
function getStripe() {
  if (!stripe) {
    throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.")
  }
  return stripe as Stripe
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    // Retrieve the checkout session from Stripe
    const stripeInstance = getStripe()
    const session = await stripeInstance.checkout.sessions.retrieve(sessionId) as Stripe.Checkout.Session

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Verify the session belongs to the user
    if (session.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: "Session does not belong to user" }, { status: 403 })
    }

    // Get or create customer in our database
    let userSettings = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!userSettings.data) {
      // Create new user settings if doesn't exist
      const { data: newSettings, error: insertError } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          stripe_customer_id: session.customer as string,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating user settings:', insertError)
        return NextResponse.json({ error: "Failed to create user settings" }, { status: 500 })
      }

      userSettings = { 
        data: newSettings, 
        error: null, 
        count: 1, 
        status: 200, 
        statusText: 'OK' 
      }
    }

    // Determine plan from the session (use actual price ID mapping)
    const lineItems = await stripeInstance.checkout.sessions.listLineItems(sessionId)
    const priceId = lineItems.data[0]?.price?.id

    // Get wallet plan name from price ID
    let walletPlanType: 'free' | 'creator' | 'collaborate' | 'scale' = 'creator'
    if (priceId && PRICE_TO_PLAN_MAP[priceId]) {
      walletPlanType = PRICE_TO_PLAN_MAP[priceId]
    } else if (session.metadata?.plan_type) {
      // Fallback to metadata
      const metaPlan = session.metadata.plan_type.toLowerCase()
      if (['free', 'creator', 'collaborate', 'scale'].includes(metaPlan)) {
        walletPlanType = metaPlan as 'free' | 'creator' | 'collaborate' | 'scale'
      }
    }

    // Get subscription ID - either from session or by looking up customer's subscriptions
    let subscriptionId: string | null = session.subscription as string || null
    
    if (!subscriptionId) {
      // Look up subscription by customer ID
      console.log('No subscription in session, looking up by customer ID:', session.customer)
      try {
        const subscriptions = await stripeInstance.subscriptions.list({
          customer: session.customer as string,
          status: 'active',
          limit: 1
        })
        if (subscriptions.data.length > 0) {
          subscriptionId = subscriptions.data[0].id
          console.log('Found subscription by customer lookup:', subscriptionId)
        }
      } catch (lookupError) {
        console.error('Error looking up subscription:', lookupError)
      }
    }

    // Map wallet plan to user_settings plan (legacy naming)
    const userSettingsPlan = walletPlanType === 'creator' ? 'pro' : 
                              walletPlanType === 'collaborate' ? 'teams' : 
                              walletPlanType === 'scale' ? 'enterprise' : 'free'

    // Update user_settings table (for legacy compatibility)
    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscriptionId || null, // Use null instead of empty string
        subscription_status: 'active',
        subscription_plan: userSettingsPlan,
        deployments_this_month: 0,
        github_pushes_this_month: 0,
        last_payment_date: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating user_settings:', updateError)
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
    }

    // CRITICAL: Update the wallet table with credits replenishment
    // This is what the credit system actually uses!
    try {
      const success = await updateUserPlan(
        user.id,
        walletPlanType,
        'active',
        supabase,
        session.customer as string,
        subscriptionId || undefined // Pass the resolved subscription ID
      )

      if (success) {
        console.log(`✅ Wallet updated for user ${user.id}: plan=${walletPlanType}, subscriptionId=${subscriptionId}, credits replenished`)
      } else {
        console.error(`⚠️ Failed to update wallet for user ${user.id}`)
      }
    } catch (walletError) {
      console.error('Error updating wallet:', walletError)
      // Don't fail the request - user_settings was updated
    }

    return NextResponse.json({
      success: true,
      plan: walletPlanType, // Return the actual wallet plan name
    })
  } catch (error) {
    console.error('Error verifying session:', error)
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    )
  }
}
