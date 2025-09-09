import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Stripe from "stripe"

// Use only publishable key configuration
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
const SECRET_KEY = process.env.STRIPE_SECRET_KEY || ""

// Minimal Stripe initialization for subscription intents
let stripeInstance: Stripe | null = null

function initializeStripe() {
  if (!SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is required for subscription creation")
    return
  }

  try {
    stripeInstance = new Stripe(SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    })
    console.log("Stripe initialized for subscription intents")
  } catch (error) {
    console.error("Failed to initialize Stripe:", error)
  }
}

initializeStripe()

function getStripe(): Stripe {
  if (!stripeInstance) {
    throw new Error("Stripe is not configured. Please check STRIPE_SECRET_KEY.")
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

    const { planType, isAnnual, priceId } = await request.json()

    if (!planType || !priceId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const stripe = getStripe()

    // Get or create minimal customer record
    let customer
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (userSettings?.stripe_customer_id) {
      customer = await stripe.customers.retrieve(userSettings.stripe_customer_id)
    } else {
      // Create minimal customer with just essential info
      customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        metadata: {
          user_id: user.id,
          plan_type: planType,
        },
      })

      // Store customer ID
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customer.id,
        })
    }

    // Create subscription with automatic payment method collection
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: priceId,
      }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    })

    // Get the client secret from the payment intent
    const paymentIntent = subscription.latest_invoice as any
    const clientSecret = paymentIntent?.payment_intent?.client_secret

    if (!clientSecret) {
      return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 })
    }

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
      customerId: customer.id,
    })

  } catch (error: any) {
    console.error('Error creating subscription intent:', error)

    if (error.type === 'StripeAuthenticationError') {
      return NextResponse.json(
        { error: 'Payment service authentication failed' },
        { status: 500 }
      )
    }

    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Invalid payment request' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create subscription intent' },
      { status: 500 }
    )
  }
}
