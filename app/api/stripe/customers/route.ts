import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient, getPaginationParams } from '@/lib/stripe/stripe-api-utils'

/**
 * POST /api/stripe/customers/list
 * Lists customers from Stripe account
 * 
 * Body: { 
 *   stripeKey: string (required),
 *   limit?: number (max 100, default 10),
 *   starting_after?: string (pagination cursor),
 *   email?: string (filter by email)
 * }
 * 
 * Returns: { success: true, customers: array, has_more: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stripeKey, limit, starting_after, email, action } = body

    if (!stripeKey) {
      return NextResponse.json(
        { error: 'stripeKey is required', success: false },
        { status: 400 }
      )
    }

    // Initialize Stripe client
    const stripe = createStripeClient(stripeKey)

    // Handle different actions
    if (action === 'create') {
      // Create customer
      const { email: customerEmail, name, phone, description, metadata } = body

      console.log('[STRIPE API] Creating customer')

      const customer = await stripe.customers.create({
        ...(customerEmail && { email: customerEmail }),
        ...(name && { name }),
        ...(phone && { phone }),
        ...(description && { description }),
        ...(metadata && { metadata })
      })

      console.log('[STRIPE API] Successfully created customer:', customer.id)

      return NextResponse.json({
        success: true,
        customer
      }, { status: 201 })
    }

    // Default action: list customers
    console.log('[STRIPE API] Listing customers')

    const params = {
      ...getPaginationParams(limit, starting_after),
      ...(email && { email })
    }

    const customers = await stripe.customers.list(params)

    console.log('[STRIPE API] Successfully listed customers, count:', customers.data.length)

    return NextResponse.json({
      success: true,
      customers: customers.data,
      has_more: customers.has_more,
      total_count: customers.data.length
    })
  } catch (error: any) {
    console.error('[STRIPE API] Customers operation failed:', error)
    
    let errorMessage = 'Failed to process customers request'
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
