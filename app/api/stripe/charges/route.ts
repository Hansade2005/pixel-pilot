import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient, getPaginationParams } from '@/lib/stripe/stripe-api-utils'

/**
 * POST /api/stripe/charges
 * Lists charges from Stripe account
 * 
 * Body: { 
 *   stripeKey: string (required),
 *   limit?: number (max 100, default 10),
 *   starting_after?: string (pagination cursor),
 *   customer?: string (filter by customer ID)
 * }
 * 
 * Returns: { success: true, charges: array, has_more: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stripeKey, limit, starting_after, customer } = body

    if (!stripeKey) {
      return NextResponse.json(
        { error: 'stripeKey is required', success: false },
        { status: 400 }
      )
    }

    console.log('[STRIPE API] Listing charges')

    // Initialize Stripe client
    const stripe = createStripeClient(stripeKey)

    // Build request parameters
    const params: any = {
      ...getPaginationParams(limit, starting_after),
      ...(customer && { customer })
    }

    // Fetch charges from Stripe
    const charges = await stripe.charges.list(params)

    console.log('[STRIPE API] Successfully listed charges, count:', charges.data.length)

    return NextResponse.json({
      success: true,
      charges: charges.data,
      has_more: charges.has_more,
      total_count: charges.data.length
    })
  } catch (error: any) {
    console.error('[STRIPE API] Failed to list charges:', error)
    
    let errorMessage = 'Failed to list charges'
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
