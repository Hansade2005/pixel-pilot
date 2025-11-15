import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient } from '@/lib/stripe/stripe-api-utils'

/**
 * POST /api/stripe/search
 * Search across Stripe resources (customers, products, invoices, etc.)
 * 
 * Body: { 
 *   stripeKey: string (required),
 *   resource: 'customers' | 'products' | 'prices' | 'subscriptions' | 'invoices' | 'payment_intents' | 'charges',
 *   query: string (Stripe search query syntax),
 *   limit?: number (default 10)
 * }
 * 
 * Example queries:
 * - customers: "email:'customer@example.com'"
 * - products: "active:'true' AND name~'shirt'"
 * - invoices: "status:'paid' AND total>1000"
 * 
 * Returns: { success: true, results: array, has_more: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stripeKey, resource, query, limit = 10 } = body

    if (!stripeKey) {
      return NextResponse.json(
        { error: 'stripeKey is required', success: false },
        { status: 400 }
      )
    }

    if (!resource || !query) {
      return NextResponse.json(
        { error: 'Resource and query are required', success: false },
        { status: 400 }
      )
    }

    // Validate resource type
    const validResources = ['customers', 'products', 'prices', 'subscriptions', 'invoices', 'payment_intents', 'charges']
    if (!validResources.includes(resource)) {
      return NextResponse.json(
        { error: `Invalid resource. Must be one of: ${validResources.join(', ')}`, success: false },
        { status: 400 }
      )
    }

    console.log('[STRIPE API] Searching', resource, 'with query:', query)

    // Initialize Stripe client
    const stripe = createStripeClient(stripeKey)

    // Perform search based on resource type
    let results: any

    switch (resource) {
      case 'customers':
        results = await stripe.customers.search({ query, limit })
        break
      case 'products':
        results = await stripe.products.search({ query, limit })
        break
      case 'prices':
        results = await stripe.prices.search({ query, limit })
        break
      case 'subscriptions':
        results = await stripe.subscriptions.search({ query, limit })
        break
      case 'invoices':
        results = await stripe.invoices.search({ query, limit })
        break
      case 'payment_intents':
        results = await stripe.paymentIntents.search({ query, limit })
        break
      case 'charges':
        results = await stripe.charges.search({ query, limit })
        break
      default:
        return NextResponse.json(
          { error: 'Unsupported resource type', success: false },
          { status: 400 }
        )
    }

    console.log('[STRIPE API] Search completed, found:', results.data.length, 'results')

    return NextResponse.json({
      success: true,
      results: results.data,
      has_more: results.has_more,
      total_count: results.data.length
    })
  } catch (error: any) {
    console.error('[STRIPE API] Search failed:', error)
    
    let errorMessage = 'Failed to search'
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
