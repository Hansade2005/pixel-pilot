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
      const { email: customerEmail, name, phone, description, metadata, address, shipping } = body

      console.log('[STRIPE API] Creating customer')

      const customer = await stripe.customers.create({
        ...(customerEmail && { email: customerEmail }),
        ...(name && { name }),
        ...(phone && { phone }),
        ...(description && { description }),
        ...(metadata && { metadata }),
        ...(address && { address }),
        ...(shipping && { shipping })
      })

      console.log('[STRIPE API] Successfully created customer:', customer.id)

      return NextResponse.json({
        success: true,
        customer
      }, { status: 201 })
    }

    if (action === 'update') {
      // Update customer
      const { id, email: customerEmail, name, phone, description, metadata, address, shipping, default_payment_method } = body

      if (!id) {
        return NextResponse.json(
          { error: 'Customer ID is required for update', success: false },
          { status: 400 }
        )
      }

      console.log('[STRIPE API] Updating customer:', id)

      const updateData: any = {}
      if (customerEmail !== undefined) updateData.email = customerEmail
      if (name !== undefined) updateData.name = name
      if (phone !== undefined) updateData.phone = phone
      if (description !== undefined) updateData.description = description
      if (metadata !== undefined) updateData.metadata = metadata
      if (address !== undefined) updateData.address = address
      if (shipping !== undefined) updateData.shipping = shipping
      if (default_payment_method !== undefined) updateData.default_payment_method = default_payment_method

      const customer = await stripe.customers.update(id, updateData)

      console.log('[STRIPE API] Successfully updated customer:', customer.id)

      return NextResponse.json({
        success: true,
        customer
      })
    }

    if (action === 'delete') {
      // Delete customer
      const { id } = body

      if (!id) {
        return NextResponse.json(
          { error: 'Customer ID is required for deletion', success: false },
          { status: 400 }
        )
      }

      console.log('[STRIPE API] Deleting customer:', id)

      const deleted = await stripe.customers.del(id)

      console.log('[STRIPE API] Successfully deleted customer:', id)

      return NextResponse.json({
        success: true,
        deleted: deleted.deleted,
        id: deleted.id
      })
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
