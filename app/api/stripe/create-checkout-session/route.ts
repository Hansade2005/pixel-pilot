import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { getPriceId } from "@/lib/stripe-config"
import Stripe from "stripe"

// Fallback Stripe API key
const FALLBACK_STRIPE_SECRET_KEY = "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"

// Helper function to get Stripe instance safely
function getStripe() {
  if (!stripe) {
    throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.")
  }
  return stripe
}

// Helper function to create Stripe instance with fallback
function createStripeInstance(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil",
    typescript: true,
  })
}

// Helper function to handle Stripe authentication errors and try fallback
function getStripeWithFallback(): Stripe {
  const primaryKey = process.env.STRIPE_SECRET_KEY
  const fallbackKey = FALLBACK_STRIPE_SECRET_KEY

  // Try primary key first
  if (primaryKey) {
    try {
      const stripeInstance = createStripeInstance(primaryKey)
      console.log("Using primary Stripe key")
      return stripeInstance
    } catch (error: any) {
      console.warn("Primary Stripe key initialization failed:", error.message)
    }
  }

  // Try fallback key
  if (fallbackKey) {
    try {
      const stripeInstance = createStripeInstance(fallbackKey)
      console.log("Using fallback Stripe key")
      return stripeInstance
    } catch (error: any) {
      console.error("Fallback Stripe key also failed:", error.message)
      throw new Error("Both Stripe API keys are invalid or expired")
    }
  }

  throw new Error("No valid Stripe API keys available")
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
    let customer
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    // Get Stripe instance with fallback handling
    const stripeInstance = getStripeWithFallback()

    if (userSettings?.stripe_customer_id) {
      customer = await stripeInstance.customers.retrieve(userSettings.stripe_customer_id)
    } else {
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
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?canceled=true`,
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
  } catch (error: any) {
    console.error('Error creating checkout session:', error)

    // Handle specific Stripe errors
    if (error.type === 'StripeAuthenticationError') {
      console.error('Stripe authentication failed:', error.message)
      return NextResponse.json(
        {
          error: 'Payment service authentication failed',
          details: 'Please contact support if this issue persists'
        },
        { status: 500 }
      )
    }

    if (error.type === 'StripeInvalidRequestError') {
      console.error('Invalid Stripe request:', error.message)
      return NextResponse.json(
        {
          error: 'Invalid payment request',
          details: 'Please check your plan selection and try again'
        },
        { status: 400 }
      )
    }

    if (error.type === 'StripeConnectionError') {
      console.error('Stripe connection error:', error.message)
      return NextResponse.json(
        {
          error: 'Payment service temporarily unavailable',
          details: 'Please try again in a few moments'
        },
        { status: 503 }
      )
    }

    // Generic error handling
    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        details: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
