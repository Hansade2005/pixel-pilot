import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getPriceId } from "@/lib/stripe-config"
import Stripe from "stripe"

// Fallback Stripe API key (same as test script)
const fallbackKey = "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"

// Initialize Stripe with fallback (same as test script)
let stripeInstance: Stripe | null = null

function initializeStripe() {
  const primaryKey = process.env.STRIPE_SECRET_KEY

  console.log("🧪 Testing Stripe Fallback API Key")
  console.log("=================================")

  // Try primary key first (same as test script)
  if (primaryKey) {
    try {
      console.log("🔄 Trying primary key...")
      stripeInstance = new Stripe(primaryKey, {
        apiVersion: "2025-08-27.basil"
      })
      console.log("✅ Primary key initialized successfully")
      return
    } catch (error: any) {
      console.warn("❌ Primary key failed:", error.message)
    }
  }

  // Try fallback key (same as test script)
  if (fallbackKey) {
    try {
      console.log("🔄 Trying fallback key...")
      stripeInstance = new Stripe(fallbackKey, {
        apiVersion: "2025-08-27.basil"
      })
      console.log("✅ Fallback key initialized successfully")
      return
    } catch (error: any) {
      console.error("❌ Fallback key also failed:", error.message)
    }
  }

  console.error("❌ Both keys failed to initialize")
  stripeInstance = null
}

// Initialize on module load (same as test script)
initializeStripe()

// Get Stripe instance (same as test script)
function getStripe(): Stripe {
  if (!stripeInstance) {
    throw new Error("Stripe is not configured. Please check STRIPE_SECRET_KEY or fallback key.")
  }
  return stripeInstance
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

    // Get Stripe instance (same as test script)
    const stripeInstance = getStripe()

    // Get or create Stripe customer
    let customer
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    try {
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
    } catch (error: any) {
      // If customer operations fail, try with fallback key
      console.warn("Customer operation failed, trying with fallback key:", error.message)

      const fallbackStripe = new Stripe(fallbackKey, {
        apiVersion: "2025-08-27.basil"
      })

      if (userSettings?.stripe_customer_id) {
        customer = await fallbackStripe.customers.retrieve(userSettings.stripe_customer_id)
      } else {
        customer = await fallbackStripe.customers.create({
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
    }

    // Create checkout session
    try {
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
      // If checkout creation fails, try with fallback key
      console.warn("Checkout session creation failed, trying with fallback key:", error.message)

      const fallbackStripe = new Stripe(fallbackKey, {
        apiVersion: "2025-08-27.basil"
      })

      const session = await fallbackStripe.checkout.sessions.create({
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
    }

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
