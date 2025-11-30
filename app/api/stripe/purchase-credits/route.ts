import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { EXTRA_CREDITS_PRODUCT, canPurchaseCredits } from "@/lib/stripe-config"
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

    const { credits } = await request.json()

    if (!credits || typeof credits !== 'number' || credits <= 0) {
      return NextResponse.json({ error: "Valid credits amount is required" }, { status: 400 })
    }

    // Check if user can purchase credits (not free plan)
    const { data: wallet } = await supabase
      .from('wallet')
      .select('current_plan')
      .eq('user_id', user.id)
      .single()

    if (!wallet || !canPurchaseCredits(wallet.current_plan)) {
      return NextResponse.json({
        error: "Credit purchases are only available for paid plans"
      }, { status: 403 })
    }

    // Get or create Stripe customer
    let customer: Stripe.Customer
    const { data: walletData } = await supabase
      .from('wallet')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (walletData?.stripe_customer_id) {
      const stripeInstance = getStripe()
      customer = await stripeInstance.customers.retrieve(walletData.stripe_customer_id) as Stripe.Customer
    } else {
      const stripeInstance = getStripe()
      customer = await stripeInstance.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        metadata: {
          user_id: user.id,
        },
      })

      // Update wallet with Stripe customer ID
      await supabase
        .from('wallet')
        .update({
          stripe_customer_id: customer.id,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
    }

    // Create checkout session for one-time payment
    const stripeInstance = getStripe()
    const session = await stripeInstance.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: EXTRA_CREDITS_PRODUCT.stripePriceId,
          quantity: credits,
        },
      ],
      mode: 'payment', // One-time payment, not subscription
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}&credits=${credits}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        credits: credits.toString(),
        purchase_type: 'extra_credits',
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Error creating credit purchase session:', error)
    return NextResponse.json(
      { error: 'Failed to create credit purchase session' },
      { status: 500 }
    )
  }
}