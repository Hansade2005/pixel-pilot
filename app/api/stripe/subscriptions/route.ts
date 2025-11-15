import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient, getPaginationParams } from '@/lib/stripe/stripe-api-utils'

/**
 * POST /api/stripe/subscriptions
 * Manages subscriptions in Stripe account
 * 
 * Body for list: { 
 *   stripeKey: string (required),
 *   action?: 'list',
 *   limit?: number,
 *   starting_after?: string,
 *   customer?: string,
 *   price?: string,
 *   status?: string
 * }
 * 
 * Body for create: {
 *   stripeKey: string (required),
 *   action: 'create',
 *   customer: string (required),
 *   items: array (required) - [{ price: string, quantity?: number }],
 *   payment_behavior?: string,
 *   metadata?: object
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stripeKey, action, limit, starting_after, customer, price, status } = body

    if (!stripeKey) {
      return NextResponse.json(
        { error: 'stripeKey is required', success: false },
        { status: 400 }
      )
    }

    const stripe = createStripeClient(stripeKey)

    if (action === 'create') {
      const { customer: customerId, items, payment_behavior, metadata } = body

      if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { error: 'Customer and items are required', success: false },
          { status: 400 }
        )
      }

      console.log('[STRIPE API] Creating subscription for customer:', customerId)

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items,
        ...(payment_behavior && { payment_behavior }),
        ...(metadata && { metadata })
      })

      console.log('[STRIPE API] Successfully created subscription:', subscription.id)

      return NextResponse.json({
        success: true,
        subscription
      }, { status: 201 })
    }

    // List subscriptions
    console.log('[STRIPE API] Listing subscriptions')

    const params: any = {
      ...getPaginationParams(limit, starting_after),
      ...(customer && { customer }),
      ...(price && { price }),
      ...(status && { status })
    }

    const subscriptions = await stripe.subscriptions.list(params)

    console.log('[STRIPE API] Successfully listed subscriptions, count:', subscriptions.data.length)

    return NextResponse.json({
      success: true,
      subscriptions: subscriptions.data,
      has_more: subscriptions.has_more,
      total_count: subscriptions.data.length
    })
  } catch (error: any) {
    console.error('[STRIPE API] Subscriptions operation failed:', error)
    
    let errorMessage = 'Failed to process subscriptions request'
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

