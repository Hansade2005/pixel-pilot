/**
 * ABE Auth Middleware - User ID-based authentication for chat-v2
 * Different from ai-api auth which uses API keys
 * This authenticates based on Supabase user session
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getWalletBalance, deductCredits, CREDITS_PER_MESSAGE } from './credit-manager'

export interface UserAuthContext {
  userId: string
  email: string
  creditsBalance: number
  currentPlan: 'free' | 'creator' | 'collaborate' | 'scale'
  canPurchaseCredits: boolean
}

export interface AuthResult {
  success: boolean
  context?: UserAuthContext
  error?: {
    message: string
    code: 'UNAUTHORIZED' | 'INSUFFICIENT_CREDITS' | 'NO_WALLET' | 'INVALID_SESSION'
    statusCode: number
  }
}

/**
 * Authenticate user from Supabase session
 */
export async function authenticateUser(request: Request): Promise<AuthResult> {
  try {
    const supabase = await createClient()

    // Get user from session
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: {
          message: 'Authentication required. Please sign in.',
          code: 'UNAUTHORIZED',
          statusCode: 401
        }
      }
    }

    // Get wallet balance
    const wallet = await getWalletBalance(user.id, supabase)

    if (!wallet) {
      return {
        success: false,
        error: {
          message: 'Wallet not found. Please contact support.',
          code: 'NO_WALLET',
          statusCode: 500
        }
      }
    }

    // Check if user has enough credits
    if (wallet.creditsBalance < CREDITS_PER_MESSAGE) {
      const message =
        wallet.currentPlan === 'free'
          ? 'Insufficient credits. Please upgrade to a paid plan to continue.'
          : 'Insufficient credits. Please purchase more credits to continue.'

      return {
        success: false,
        error: {
          message,
          code: 'INSUFFICIENT_CREDITS',
          statusCode: 402 // Payment Required
        }
      }
    }

    return {
      success: true,
      context: {
        userId: user.id,
        email: user.email || '',
        creditsBalance: wallet.creditsBalance,
        currentPlan: wallet.currentPlan,
        canPurchaseCredits: wallet.canPurchaseCredits
      }
    }
  } catch (error) {
    console.error('[AuthMiddleware] Exception in authenticateUser:', error)
    return {
      success: false,
      error: {
        message: 'Internal authentication error',
        code: 'INVALID_SESSION',
        statusCode: 500
      }
    }
  }
}

/**
 * Process request billing (deduct credits and log usage)
 */
export async function processRequestBilling(params: {
  userId: string
  model: string
  requestType?: string
  endpoint?: string
  responseTimeMs?: number
  tokensUsed?: number
  status?: 'success' | 'error' | 'timeout'
  errorMessage?: string
}): Promise<{
  success: boolean
  newBalance?: number
  creditsUsed?: number
  error?: string
}> {
  const {
    userId,
    model,
    requestType = 'chat',
    endpoint = '/api/chat-v2',
    responseTimeMs,
    tokensUsed,
    status = 'success',
    errorMessage
  } = params

  try {
    const supabase = await createClient()

    // Deduct credits
    const result = await deductCredits(
      userId,
      CREDITS_PER_MESSAGE,
      {
        model,
        requestType,
        endpoint,
        responseTimeMs,
        tokensUsed,
        status,
        errorMessage
      },
      supabase
    )

    if (!result.success) {
      console.error('[AuthMiddleware] Failed to deduct credits:', result.error)
      return {
        success: false,
        error: result.error
      }
    }

    console.log(
      `[AuthMiddleware] ✅ Deducted ${result.creditsUsed} credits from user ${userId}. New balance: ${result.newBalance}`
    )

    return {
      success: true,
      newBalance: result.newBalance,
      creditsUsed: result.creditsUsed
    }
  } catch (error) {
    console.error('[AuthMiddleware] Exception in processRequestBilling:', error)
    return {
      success: false,
      error: 'Internal billing error'
    }
  }
}

/**
 * Get user credit info (for UI display)
 */
export async function getUserCreditInfo(userId: string): Promise<{
  creditsBalance: number
  creditsUsedThisMonth: number
  currentPlan: string
  canPurchaseCredits: boolean
  estimatedRemainingMessages: number
} | null> {
  try {
    const supabase = await createClient()
    const wallet = await getWalletBalance(userId, supabase)

    if (!wallet) {
      return null
    }

    return {
      creditsBalance: wallet.creditsBalance,
      creditsUsedThisMonth: wallet.creditsUsedThisMonth,
      currentPlan: wallet.currentPlan,
      canPurchaseCredits: wallet.canPurchaseCredits,
      estimatedRemainingMessages: Math.floor(wallet.creditsBalance / CREDITS_PER_MESSAGE)
    }
  } catch (error) {
    console.error('[AuthMiddleware] Exception in getUserCreditInfo:', error)
    return null
  }
}

/**
 * Validate user has sufficient credits before making request
 */
export async function validateCredits(userId: string): Promise<{
  valid: boolean
  message?: string
}> {
  try {
    const supabase = await createClient()
    const wallet = await getWalletBalance(userId, supabase)

    if (!wallet) {
      return {
        valid: false,
        message: 'Wallet not found'
      }
    }

    if (wallet.creditsBalance < CREDITS_PER_MESSAGE) {
      const message =
        wallet.currentPlan === 'free'
          ? `Insufficient credits (${wallet.creditsBalance} remaining). Upgrade to a paid plan to purchase more.`
          : `Insufficient credits (${wallet.creditsBalance} remaining). Purchase more credits to continue.`

      return {
        valid: false,
        message
      }
    }

    return {
      valid: true
    }
  } catch (error) {
    console.error('[AuthMiddleware] Exception in validateCredits:', error)
    return {
      valid: false,
      message: 'Internal validation error'
    }
  }
}
