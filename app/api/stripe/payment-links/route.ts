import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient, getPaginationParams } from '@/lib/stripe/stripe-api-utils'

/**
 * POST /api/stripe/payment-links
 * Manages payment links in Stripe account
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
 *   line_items: array (required) - [{ price: string, quantity: number }],
 *   after_completion?: {
 *     type: 'redirect' | 'hosted_confirmation',
 *     redirect?: { url: string }
 *   },
 *   metadata?: object
 * }
 * 
 * Returns: { success: true, payment_links: array } or { success: true, payment_link: object }
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
      const { line_items, after_completion, metadata } = body

      if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
        return NextResponse.json(
          { error: 'Line items are required', success: false },
          { status: 400 }
        )
      }

      console.log('[STRIPE API] Creating payment link')

      // Create payment link
      const paymentLink = await stripe.paymentLinks.create({
        line_items,
        ...(after_completion && { after_completion }),
        ...(metadata && { metadata })
      })

      console.log('[STRIPE API] Successfully created payment link:', paymentLink.id)

      return NextResponse.json({
        success: true,
        payment_link: paymentLink
      }, { status: 201 })
    }

    // Default action: list payment links
    console.log('[STRIPE API] Listing payment links')

    const paymentLinks = await stripe.paymentLinks.list(
      getPaginationParams(limit, starting_after)
    )

    console.log('[STRIPE API] Successfully listed payment links, count:', paymentLinks.data.length)

    return NextResponse.json({
      success: true,
      payment_links: paymentLinks.data,
      has_more: paymentLinks.has_more,
      total_count: paymentLinks.data.length
    })
  } catch (error: any) {
    console.error('[STRIPE API] Payment links operation failed:', error)
    
    let errorMessage = 'Failed to process payment links request'
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
