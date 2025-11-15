import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient } from '@/lib/stripe/stripe-api-utils'

/**
 * POST /api/stripe/account
 * Retrieves the Stripe account information
 * 
 * Body: { stripeKey: string }
 * Returns: { success: true, account: object }
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

    console.log('[STRIPE API] Fetching account information')

    // Initialize Stripe client
    const stripe = createStripeClient(stripeKey)

    // Fetch account info from Stripe
    const account = await stripe.accounts.retrieve()

    console.log('[STRIPE API] Successfully fetched account information')

    return NextResponse.json({
      success: true,
      account
    })
  } catch (error: any) {
    console.error('[STRIPE API] Failed to fetch account:', error)
    
    let errorMessage = 'Failed to fetch account information'
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
