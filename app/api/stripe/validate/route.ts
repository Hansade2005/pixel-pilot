import { NextRequest, NextResponse } from 'next/server'
import { validateStripeKey } from '@/lib/stripe/stripe-api-utils'

/**
 * POST /api/stripe/validate
 * Validates a Stripe API key and returns account information
 * 
 * Body: { stripeKey: string }
 * Returns: { success: true, valid: boolean, account?: object, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stripeKey } = body

    if (!stripeKey) {
      return NextResponse.json(
        { error: 'stripeKey is required', success: false },
        { status: 400 }
      )
    }

    console.log('[STRIPE API] Validating Stripe key')

    // Validate the Stripe key
    const result = await validateStripeKey(stripeKey)

    console.log('[STRIPE API] Validation complete:', result.valid ? 'Valid' : 'Invalid')

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('[STRIPE API] Validation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to validate API key', success: false },
      { status: 500 }
    )
  }
}
