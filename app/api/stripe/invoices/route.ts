import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient, getPaginationParams } from '@/lib/stripe/stripe-api-utils'

/**
 * POST /api/stripe/invoices
 * Manages invoices in Stripe account
 * 
 * Body for list: { 
 *   stripeKey: string (required),
 *   action?: 'list',
 *   limit?: number,
 *   starting_after?: string,
 *   customer?: string,
 *   status?: string
 * }
 * 
 * Body for create: {
 *   stripeKey: string (required),
 *   action: 'create',
 *   customer: string (required),
 *   auto_advance?: boolean,
 *   collection_method?: string,
 *   description?: string,
 *   metadata?: object
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stripeKey, action, limit, starting_after, customer, status } = body

    if (!stripeKey) {
      return NextResponse.json(
        { error: 'stripeKey is required', success: false },
        { status: 400 }
      )
    }

    const stripe = createStripeClient(stripeKey)

    if (action === 'create') {
      const { customer: customerId, auto_advance, collection_method, description, metadata } = body
      
      if (!customerId) {
        return NextResponse.json(
          { error: 'Customer is required', success: false },
          { status: 400 }
        )
      }

      console.log('[STRIPE API] Creating invoice for customer:', customerId)

      const invoice = await stripe.invoices.create({
        customer: customerId,
        ...(auto_advance !== undefined && { auto_advance }),
        ...(collection_method && { collection_method }),
        ...(description && { description }),
        ...(metadata && { metadata })
      })

      console.log('[STRIPE API] Successfully created invoice:', invoice.id)

      return NextResponse.json({
        success: true,
        invoice
      }, { status: 201 })
    }

    // Default action: list invoices
    console.log('[STRIPE API] Listing invoices')

    const params: any = {
      ...getPaginationParams(limit, starting_after),
      ...(customer && { customer }),
      ...(status && { status })
    }

    const invoices = await stripe.invoices.list(params)

    console.log('[STRIPE API] Successfully listed invoices, count:', invoices.data.length)

    return NextResponse.json({
      success: true,
      invoices: invoices.data,
      has_more: invoices.has_more,
      total_count: invoices.data.length
    })
  } catch (error: any) {
    console.error('[STRIPE API] Invoices operation failed:', error)
    
    let errorMessage = 'Failed to process invoices request'
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
