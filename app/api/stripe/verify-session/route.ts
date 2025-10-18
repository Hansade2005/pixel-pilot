import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import Stripe from "stripe"

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

    // Determine plan from the session
    const lineItems = await stripeInstance.checkout.sessions.listLineItems(sessionId)
    const priceId = lineItems.data[0]?.price?.id

    let planType = 'free'

    if (priceId?.includes('pro')) {
      planType = 'pro'
    } else if (priceId?.includes('teams')) {
      planType = 'teams'
    } else if (priceId?.includes('enterprise')) {
      planType = 'enterprise'
    }

    // Update subscription status
    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        subscription_status: 'active',
        subscription_plan: planType,
        deployments_this_month: 0,
        github_pushes_this_month: 0,
        last_payment_date: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      plan: planType,
    })
  } catch (error) {
    console.error('Error verifying session:', error)
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    )
  }
}
