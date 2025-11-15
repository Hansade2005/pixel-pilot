import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient, getPaginationParams } from '@/lib/stripe/stripe-api-utils'

/**
 * POST /api/stripe/coupons
 * Manages coupons in Stripe account
 * 
 * Body for list: { 
 *   stripeKey: string (required),
 *   action?: 'list',
 *   limit?: number (max 100, default 10),
 *   starting_after?: string (pagination cursor)
 * }
 * 
 * Body for create: {
 *   stripeKey: string (required),
 *   action: 'create',
 *   duration: 'forever' | 'once' | 'repeating' (required),
 *   percent_off?: number (0-100, required if amount_off not provided),
 *   amount_off?: number (in cents, required if percent_off not provided),
 *   currency?: string (required if amount_off is provided),
 *   duration_in_months?: number (required if duration is 'repeating'),
 *   name?: string,
 *   metadata?: object
 * }
 * 
 * Returns: { success: true, coupons: array } or { success: true, coupon: object }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stripeKey, action, limit, starting_after } = body

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
      const { duration, percent_off, amount_off, currency, duration_in_months, name, metadata } = body

      if (!duration) {
        return NextResponse.json(
          { error: 'Duration is required', success: false },
          { status: 400 }
        )
      }

      if (!percent_off && !amount_off) {
        return NextResponse.json(
          { error: 'Either percent_off or amount_off is required', success: false },
          { status: 400 }
        )
      }

      if (amount_off && !currency) {
        return NextResponse.json(
          { error: 'Currency is required when amount_off is provided', success: false },
          { status: 400 }
        )
      }

      if (duration === 'repeating' && !duration_in_months) {
        return NextResponse.json(
          { error: 'duration_in_months is required when duration is repeating', success: false },
          { status: 400 }
        )
      }

      console.log('[STRIPE API] Creating coupon')

      // Create coupon
      const coupon = await stripe.coupons.create({
        duration,
        ...(percent_off && { percent_off }),
        ...(amount_off && { amount_off }),
        ...(currency && { currency }),
        ...(duration_in_months && { duration_in_months }),
        ...(name && { name }),
        ...(metadata && { metadata })
      })

      console.log('[STRIPE API] Successfully created coupon:', coupon.id)

      return NextResponse.json({
        success: true,
        coupon
      }, { status: 201 })
    }

    // Default action: list coupons
    console.log('[STRIPE API] Listing coupons')

    const coupons = await stripe.coupons.list(
      getPaginationParams(limit, starting_after)
    )

    console.log('[STRIPE API] Successfully listed coupons, count:', coupons.data.length)

    return NextResponse.json({
      success: true,
      coupons: coupons.data,
      has_more: coupons.has_more,
      total_count: coupons.data.length
    })
  } catch (error: any) {
    console.error('[STRIPE API] Coupons operation failed:', error)
    
    let errorMessage = 'Failed to process coupons request'
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
