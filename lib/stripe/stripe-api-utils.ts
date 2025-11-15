import Stripe from 'stripe'

/**
 * Utility functions for Stripe API operations
 * These functions help with common operations and error handling
 */

/**
 * Create a Stripe client instance with the provided API key
 */
export function createStripeClient(apiKey: string): Stripe {
  return new Stripe(apiKey, {
    apiVersion: '2025-08-27.basil',
    typescript: true,
  })
}

/**
 * Normalize Stripe errors into user-friendly messages
 */
export function normalizeStripeError(error: any): string {
  if (error.type === 'StripeCardError') {
    return `Card error: ${error.message}`
  } else if (error.type === 'StripeInvalidRequestError') {
    return `Invalid request: ${error.message}`
  } else if (error.type === 'StripeAPIError') {
    return `API error: ${error.message}`
  } else if (error.type === 'StripeConnectionError') {
    return 'Network error connecting to Stripe. Please check your internet connection.'
  } else if (error.type === 'StripeAuthenticationError') {
    return 'Invalid Stripe API key. Please check your credentials.'
  } else if (error.type === 'StripeRateLimitError') {
    return 'Too many requests to Stripe. Please try again later.'
  } else if (error.message) {
    return error.message
  }
  
  return 'An unexpected error occurred with Stripe'
}

/**
 * Validate that the Stripe API key is valid
 */
export async function validateStripeKey(apiKey: string): Promise<{ valid: boolean; error?: string; account?: Stripe.Account }> {
  try {
    const stripe = createStripeClient(apiKey)
    const account = await stripe.accounts.retrieve()
    
    return {
      valid: true,
      account
    }
  } catch (error: any) {
    return {
      valid: false,
      error: normalizeStripeError(error)
    }
  }
}

/**
 * Format amount from cents to dollars (or other currency units)
 */
export function formatAmount(amount: number, currency: string = 'usd'): string {
  const isZeroDecimalCurrency = ['jpy', 'krw', 'vnd', 'clp', 'pyg'].includes(currency.toLowerCase())
  
  if (isZeroDecimalCurrency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount / 100)
}

/**
 * Convert amount from dollars to cents (or maintain for zero-decimal currencies)
 */
export function amountToCents(amount: number, currency: string = 'usd'): number {
  const isZeroDecimalCurrency = ['jpy', 'krw', 'vnd', 'clp', 'pyg'].includes(currency.toLowerCase())
  
  if (isZeroDecimalCurrency) {
    return Math.round(amount)
  }
  
  return Math.round(amount * 100)
}

/**
 * Safe pagination helper
 */
export function getPaginationParams(limit?: number, startingAfter?: string) {
  return {
    limit: limit && limit > 0 && limit <= 100 ? limit : 10,
    ...(startingAfter && { starting_after: startingAfter })
  }
}

/**
 * Format Stripe object for API response (remove sensitive data)
 */
export function sanitizeStripeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }
  
  // Remove common sensitive fields
  const sensitiveFields = ['client_secret', 'secret', 'private_key']
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      delete sanitized[field]
    }
  }
  
  return sanitized
}

/**
 * Standard error response format
 */
export function createErrorResponse(message: string, status: number = 500) {
  return Response.json(
    { error: message, success: false },
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Standard success response format
 */
export function createSuccessResponse(data: any, status: number = 200) {
  return Response.json(
    { success: true, data },
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Extract and validate Authorization header
 */
export function extractAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * Get Stripe access token from Supabase for authenticated user
 */
export async function getStripeAccessToken(userId: string): Promise<string | null> {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('stripe_connections')
      .select('access_token')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      console.error('Failed to fetch Stripe access token:', error)
      return null
    }

    return data.access_token
  } catch (error) {
    console.error('Error getting Stripe access token:', error)
    return null
  }
}

/**
 * Handle Stripe API errors and return formatted response
 */
export function handleStripeError(error: any): Response {
  console.error('Stripe API Error:', error)

  if (error instanceof Stripe.errors.StripeError) {
    return createErrorResponse(
      normalizeStripeError(error),
      error.statusCode || 500
    )
  }

  return createErrorResponse(
    error.message || 'An unexpected error occurred',
    500
  )
}
