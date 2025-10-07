import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { getPriceId } from "@/lib/stripe-config"
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

    const { planType, isAnnual = false } = await request.json()

    if (!planType) {
      return NextResponse.json({ error: "Missing planType" }, { status: 400 })
    }

    // Get price ID from our configuration
    const priceId = getPriceId(planType, isAnnual)

    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan type or pricing configuration" }, { status: 400 })
    }

    // Get or create Stripe customer
    let customer: Stripe.Customer
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (userSettings?.stripe_customer_id) {
      const stripeInstance = getStripe()
      customer = await stripeInstance.customers.retrieve(userSettings.stripe_customer_id) as Stripe.Customer
    } else {
      const stripeInstance = getStripe()
      customer = await stripeInstance.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        metadata: {
          user_id: user.id,
        },
      })

      // Update user settings with Stripe customer ID
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customer.id,
        })
    }

    // Create checkout session
    const stripeInstance = getStripe()
    const session = await stripeInstance.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://pipilot.dev'}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://pipilot.dev'}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan_type: planType,
        app_name: 'pixel-pilot',
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
