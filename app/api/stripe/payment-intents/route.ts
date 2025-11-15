import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient, getPaginationParams } from '@/lib/stripe/stripe-api-utils'

/**
 * POST /api/stripe/payment-intents
 * Manages payment intents in Stripe account
 * 
 * Body for list: { 
 *   stripeKey: string (required),
 *   action?: 'list',
 *   limit?: number (max 100, default 10),
 *   starting_after?: string (pagination cursor),
 *   customer?: string (filter by customer ID)
 * }
 * 
 * Body for create: {
 *   stripeKey: string (required),
 *   action: 'create',
 *   amount: number (required, in cents),
 *   currency: string (required),
 *   customer?: string,
 *   payment_method?: string,
 *   confirm?: boolean,
 *   description?: string,
 *   metadata?: object
 * }
 * 
 * Returns: { success: true, payment_intents: array } or { success: true, payment_intent: object }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stripeKey, action, limit, starting_after, customer } = body

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
      const { amount, currency, customer: customerId, payment_method, confirm, description, metadata } = body

      if (!amount || !currency) {
        return NextResponse.json(
          { error: 'Amount and currency are required', success: false },
          { status: 400 }
        )
      }

      console.log('[STRIPE API] Creating payment intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        ...(customerId && { customer: customerId }),
        ...(payment_method && { payment_method }),
        ...(confirm !== undefined && { confirm }),
        ...(description && { description }),
        ...(metadata && { metadata })
      })

      console.log('[STRIPE API] Successfully created payment intent:', paymentIntent.id)

      return NextResponse.json({
        success: true,
        payment_intent: paymentIntent
      }, { status: 201 })
    }

    // Default action: list payment intents
    console.log('[STRIPE API] Listing payment intents')

    const params: any = {
      ...getPaginationParams(limit, starting_after),
      ...(customer && { customer })
    }

    const paymentIntents = await stripe.paymentIntents.list(params)

    console.log('[STRIPE API] Successfully listed payment intents, count:', paymentIntents.data.length)

    return NextResponse.json({
      success: true,
      payment_intents: paymentIntents.data,
      has_more: paymentIntents.has_more,
      total_count: paymentIntents.data.length
    })
  } catch (error: any) {
    console.error('[STRIPE API] Payment intents operation failed:', error)
    
    let errorMessage = 'Failed to process payment intents request'
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
