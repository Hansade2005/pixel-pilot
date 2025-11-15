import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient, getPaginationParams } from '@/lib/stripe/stripe-api-utils'

/**
 * POST /api/stripe/prices
 * Manages prices in Stripe account
 * 
 * Body for list: { 
 *   stripeKey: string (required),
 *   action?: 'list',
 *   limit?: number,
 *   starting_after?: string,
 *   product?: string,
 *   active?: boolean
 * }
 * 
 * Body for create: {
 *   stripeKey: string (required),
 *   action: 'create',
 *   product: string (required),
 *   currency: string (required),
 *   unit_amount: number (required, in cents),
 *   recurring?: { interval: 'day' | 'week' | 'month' | 'year', interval_count?: number },
 *   metadata?: object
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stripeKey, action, limit, starting_after, product, active } = body

    if (!stripeKey) {
      return NextResponse.json(
        { error: 'stripeKey is required', success: false },
        { status: 400 }
      )
    }

    const stripe = createStripeClient(stripeKey)

    if (action === 'create') {
      const { product: productId, currency, unit_amount, recurring, metadata, nickname } = body

      if (!productId || !currency || unit_amount === undefined) {
        return NextResponse.json(
          { error: 'Product, currency, and unit_amount are required', success: false },
          { status: 400 }
        )
      }

      console.log('[STRIPE API] Creating price for product:', productId)

      const price = await stripe.prices.create({
        product: productId,
        currency,
        unit_amount,
        ...(recurring && { recurring }),
        ...(metadata && { metadata }),
        ...(nickname && { nickname })
      })

      console.log('[STRIPE API] Successfully created price:', price.id)

      return NextResponse.json({
        success: true,
        price
      }, { status: 201 })
    }

    if (action === 'update') {
      const { id, active: isActive, metadata, nickname } = body

      if (!id) {
        return NextResponse.json(
          { error: 'Price ID is required for update', success: false },
          { status: 400 }
        )
      }

      console.log('[STRIPE API] Updating price:', id)

      const updateData: any = {}
      if (isActive !== undefined) updateData.active = isActive
      if (metadata !== undefined) updateData.metadata = metadata
      if (nickname !== undefined) updateData.nickname = nickname

      const price = await stripe.prices.update(id, updateData)

      console.log('[STRIPE API] Successfully updated price:', price.id)

      return NextResponse.json({
        success: true,
        price
      })
    }

    // List prices
    console.log('[STRIPE API] Listing prices')

    const params: any = {
      ...getPaginationParams(limit, starting_after),
      ...(product && { product })
    }
    
    if (active !== null && active !== undefined) {
      params.active = active
    }

    const prices = await stripe.prices.list(params)

    console.log('[STRIPE API] Successfully listed prices, count:', prices.data.length)

    return NextResponse.json({
      success: true,
      prices: prices.data,
      has_more: prices.has_more,
      total_count: prices.data.length
    })
  } catch (error: any) {
    console.error('[STRIPE API] Prices operation failed:', error)
    
    let errorMessage = 'Failed to process prices request'
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
