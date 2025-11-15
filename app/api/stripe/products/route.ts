import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient, getPaginationParams } from '@/lib/stripe/stripe-api-utils'

/**
 * POST /api/stripe/products
 * Manages products in Stripe account
 * 
 * Body for list: { 
 *   stripeKey: string (required),
 *   action?: 'list',
 *   limit?: number,
 *   starting_after?: string,
 *   active?: boolean
 * }
 * 
 * Body for create: {
 *   stripeKey: string (required),
 *   action: 'create',
 *   name: string (required),
 *   description?: string,
 *   active?: boolean,
 *   metadata?: object,
 *   default_price_data?: { currency: string, unit_amount: number }
 * }
 * 
 * Returns: { success: true, products: array } or { success: true, product: object }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stripeKey, action, limit, starting_after, active } = body

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
      const { name, description, active: isActive, metadata, default_price_data } = body

      if (!name) {
        return NextResponse.json(
          { error: 'Product name is required', success: false },
          { status: 400 }
        )
      }

      console.log('[STRIPE API] Creating product:', name)

      const product = await stripe.products.create({
        name,
        ...(description && { description }),
        ...(isActive !== undefined && { active: isActive }),
        ...(metadata && { metadata }),
        ...(default_price_data && { default_price_data })
      })

      console.log('[STRIPE API] Successfully created product:', product.id)

      return NextResponse.json({
        success: true,
        product
      }, { status: 201 })
    }

    // Handle update action
    if (action === 'update') {
      const { id, name, description, active: isActive, metadata, images, default_price } = body

      if (!id) {
        return NextResponse.json(
          { error: 'Product ID is required for update', success: false },
          { status: 400 }
        )
      }

      console.log('[STRIPE API] Updating product:', id)

      const updateData: any = {}
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (isActive !== undefined) updateData.active = isActive
      if (metadata !== undefined) updateData.metadata = metadata
      if (images !== undefined) updateData.images = images
      if (default_price !== undefined) updateData.default_price = default_price

      const product = await stripe.products.update(id, updateData)

      console.log('[STRIPE API] Successfully updated product:', product.id)

      return NextResponse.json({
        success: true,
        product
      })
    }

    // Handle delete action
    if (action === 'delete') {
      const { id } = body

      if (!id) {
        return NextResponse.json(
          { error: 'Product ID is required for deletion', success: false },
          { status: 400 }
        )
      }

      console.log('[STRIPE API] Deleting product:', id)

      const deleted = await stripe.products.del(id)

      console.log('[STRIPE API] Successfully deleted product:', id)

      return NextResponse.json({
        success: true,
        deleted: deleted.deleted,
        id: deleted.id
      })
    }

    // Default action: list products
    console.log('[STRIPE API] Listing products')

    const params: any = getPaginationParams(limit, starting_after)
    if (active !== null && active !== undefined) {
      params.active = active
    }

    const products = await stripe.products.list(params)

    console.log('[STRIPE API] Successfully listed products, count:', products.data.length)

    return NextResponse.json({
      success: true,
      products: products.data,
      has_more: products.has_more,
      total_count: products.data.length
    })
  } catch (error: any) {
    console.error('[STRIPE API] Products operation failed:', error)
    
    let errorMessage = 'Failed to process products request'
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
