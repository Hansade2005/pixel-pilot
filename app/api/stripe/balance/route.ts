import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient } from '@/lib/stripe/stripe-api-utils'

/**
 * POST /api/stripe/balance
 * Retrieves the current account balance from Stripe
 * 
 * Body: { stripeKey: string }
 * Returns: { success: true, balance: object }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stripeKey } = body

    if (!stripeKey) {
      return NextResponse.json(
        { error: 'stripeKey is required', success: false },
        { status: 400 }
      )
    }

    console.log('[STRIPE API] Fetching balance')

    // Initialize Stripe client
    const stripe = createStripeClient(stripeKey)

    // Fetch balance from Stripe
    const balance = await stripe.balance.retrieve()

    console.log('[STRIPE API] Successfully fetched balance')

    return NextResponse.json({
      success: true,
      balance
    })
  } catch (error: any) {
    console.error('[STRIPE API] Failed to fetch balance:', error)
    
    let errorMessage = 'Failed to fetch balance'
    if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Invalid Stripe API key'
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: error.statusCode || 500 }
    )
  }
}
