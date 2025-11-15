import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient, getPaginationParams } from '@/lib/stripe/stripe-api-utils'

/**
 * POST /api/stripe/refunds
 * Manages refunds in Stripe account
 * 
 * Body for list: { 
 *   stripeKey: string (required),
 *   action?: 'list',
 *   limit?: number (max 100, default 10),
 *   starting_after?: string (pagination cursor),
 *   charge?: string (filter by charge ID)
 * }
 * 
 * Body for create: {
 *   stripeKey: string (required),
 *   action: 'create',
 *   charge?: string (charge ID to refund),
 *   payment_intent?: string (payment intent ID to refund),
 *   amount?: number (amount to refund in cents, optional - defaults to full refund),
 *   reason?: string ('duplicate' | 'fraudulent' | 'requested_by_customer'),
 *   metadata?: object
 * }
 * 
 * Returns: { success: true, refunds: array } or { success: true, refund: object }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stripeKey, action, limit, starting_after, charge: chargeFilter } = body

    if (!stripeKey) {
      return NextResponse.json(
        { error: 'stripeKey is required', success: false },
        { status: 400 }
      )
    }

    // Initialize Stripe client
    const stripe = createStripeClient(stripeKey)

    // Handle create action
    if (action === 'create') {
      const { charge, payment_intent, amount, reason, metadata } = body

      if (!charge && !payment_intent) {
        return NextResponse.json(
          { error: 'Either charge or payment_intent is required', success: false },
          { status: 400 }
        )
      }

      console.log('[STRIPE API] Creating refund')

      // Create refund
      const refund = await stripe.refunds.create({
        ...(charge && { charge }),
        ...(payment_intent && { payment_intent }),
        ...(amount && { amount }),
        ...(reason && { reason }),
        ...(metadata && { metadata })
      })

      console.log('[STRIPE API] Successfully created refund:', refund.id)

      return NextResponse.json({
        success: true,
        refund
      }, { status: 201 })
    }

    // Default action: list refunds
    console.log('[STRIPE API] Listing refunds')

    const params: any = {
      ...getPaginationParams(limit, starting_after),
      ...(chargeFilter && { charge: chargeFilter })
    }

    const refunds = await stripe.refunds.list(params)

    console.log('[STRIPE API] Successfully listed refunds, count:', refunds.data.length)

    return NextResponse.json({
      success: true,
      refunds: refunds.data,
      has_more: refunds.has_more,
      total_count: refunds.data.length
    })
  } catch (error: any) {
    console.error('[STRIPE API] Refunds operation failed:', error)
    
    let errorMessage = 'Failed to process refunds request'
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
