/**
 * ABE Credit Manager - Core credit operations
 * Handles credit deduction, validation, and balance checks
 * 
 * Payment Systems Integrated:
 * - Stripe: Primary payment system for subscriptions and credit top-ups
 * - Polar: Backup payment system (1 credit = $1, Product ID: 09991226-466e-4983-b409-c986577a8599)
 * 
 * Credit Conversion Rate: 1 credit = $1 USD
 * AI Message Rate: 0.25 credits per message request
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Credit constants - MUST match values in lib/stripe-config.ts PRODUCT_CONFIGS
export const CREDITS_PER_MESSAGE = 0.25
export const CREDIT_TO_USD_RATE = 1 // 1 credit = $1
export const FREE_PLAN_MONTHLY_CREDITS = 20
export const CREATOR_PLAN_MONTHLY_CREDITS = 50 // $50 worth = 50 credits as per stripe-config
export const COLLABORATE_PLAN_MONTHLY_CREDITS = 75
export const SCALE_PLAN_MONTHLY_CREDITS = 150

export interface WalletBalance {
  userId: string
  creditsBalance: number
  creditsUsedThisMonth: number
  creditsUsedTotal: number
  currentPlan: 'free' | 'creator' | 'collaborate' | 'scale'
  subscriptionStatus: 'active' | 'inactive' | 'cancelled' | 'past_due'
  canPurchaseCredits: boolean
}

export interface CreditDeductionResult {
  success: boolean
  newBalance: number
  creditsUsed: number
  error?: string
  errorCode?: 'INSUFFICIENT_CREDITS' | 'NO_WALLET' | 'INVALID_USER' | 'DATABASE_ERROR'
}

export interface UsageLogEntry {
  userId: string
  model: string
  creditsUsed: number
  requestType: string
  endpoint: string
  tokensUsed?: number
  responseTimeMs?: number
  status: 'success' | 'error' | 'timeout'
  errorMessage?: string
  metadata?: Record<string, any>
}

/**
 * Get user wallet balance and plan info
 */
export async function getWalletBalance(
  userId: string,
  supabase: SupabaseClient
): Promise<WalletBalance | null> {
  try {
    const { data, error } = await supabase
      .from('wallet')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('[CreditManager] Error fetching wallet:', error)
      return null
    }

    if (!data) {
      // Create wallet if it doesn't exist (new user)
      const { data: newWallet, error: createError } = await supabase
        .from('wallet')
        .insert({
          user_id: userId,
          credits_balance: FREE_PLAN_MONTHLY_CREDITS,
          current_plan: 'free',
          subscription_status: 'inactive'
        })
        .select()
        .single()

      if (createError || !newWallet) {
        console.error('[CreditManager] Error creating wallet:', createError)
        return null
      }

      return {
        userId,
        creditsBalance: newWallet.credits_balance,
        creditsUsedThisMonth: newWallet.credits_used_this_month,
        creditsUsedTotal: newWallet.credits_used_total,
        currentPlan: newWallet.current_plan,
        subscriptionStatus: newWallet.subscription_status,
        canPurchaseCredits: false // Free plan cannot purchase
      }
    }

    return {
      userId,
      creditsBalance: data.credits_balance,
      creditsUsedThisMonth: data.credits_used_this_month,
      creditsUsedTotal: data.credits_used_total,
      currentPlan: data.current_plan,
      subscriptionStatus: data.subscription_status,
      canPurchaseCredits: data.current_plan !== 'free' // Only paid plans can purchase
    }
  } catch (error) {
    console.error('[CreditManager] Exception in getWalletBalance:', error)
    return null
  }
}

/**
 * Check if user has sufficient credits
 */
export async function hasEnoughCredits(
  userId: string,
  creditsRequired: number = CREDITS_PER_MESSAGE,
  supabase: SupabaseClient
): Promise<boolean> {
  const wallet = await getWalletBalance(userId, supabase)
  
  if (!wallet) return false
  
  return wallet.creditsBalance >= creditsRequired
}

/**
 * Deduct credits from user wallet
 */
export async function deductCredits(
  userId: string,
  creditsToDeduct: number = CREDITS_PER_MESSAGE,
  metadata: Partial<UsageLogEntry> = {},
  supabase: SupabaseClient
): Promise<CreditDeductionResult> {
  try {
    // Get current wallet balance
    const wallet = await getWalletBalance(userId, supabase)

    if (!wallet) {
      return {
        success: false,
        newBalance: 0,
        creditsUsed: 0,
        error: 'Wallet not found',
        errorCode: 'NO_WALLET'
      }
    }

    // Check if user has enough credits
    if (wallet.creditsBalance < creditsToDeduct) {
      return {
        success: false,
        newBalance: wallet.creditsBalance,
        creditsUsed: 0,
        error: `Insufficient credits. Required: ${creditsToDeduct}, Available: ${wallet.creditsBalance}`,
        errorCode: 'INSUFFICIENT_CREDITS'
      }
    }

    // Deduct credits (atomic operation)
    const { data: updatedWallet, error: updateError } = await supabase
      .from('wallet')
      .update({
        credits_balance: wallet.creditsBalance - creditsToDeduct,
        credits_used_this_month: wallet.creditsUsedThisMonth + creditsToDeduct,
        credits_used_total: wallet.creditsUsedTotal + creditsToDeduct
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError || !updatedWallet) {
      console.error('[CreditManager] Error updating wallet:', updateError)
      return {
        success: false,
        newBalance: wallet.creditsBalance,
        creditsUsed: 0,
        error: 'Failed to deduct credits',
        errorCode: 'DATABASE_ERROR'
      }
    }

    // Log the usage
    await logUsage({
      userId,
      model: metadata.model || 'unknown',
      creditsUsed: creditsToDeduct,
      requestType: metadata.requestType || 'chat',
      endpoint: metadata.endpoint || '/api/chat-v2',
      tokensUsed: metadata.tokensUsed,
      responseTimeMs: metadata.responseTimeMs,
      status: metadata.status || 'success',
      errorMessage: metadata.errorMessage,
      metadata: metadata.metadata
    }, supabase)

    // Log transaction
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount: -creditsToDeduct,
        type: 'usage',
        description: `${metadata.requestType || 'Chat'} request - ${metadata.model || 'unknown'} model`,
        credits_before: wallet.creditsBalance,
        credits_after: updatedWallet.credits_balance,
        metadata: metadata.metadata || {}
      })

    return {
      success: true,
      newBalance: updatedWallet.credits_balance,
      creditsUsed: creditsToDeduct
    }
  } catch (error) {
    console.error('[CreditManager] Exception in deductCredits:', error)
    return {
      success: false,
      newBalance: 0,
      creditsUsed: 0,
      error: 'Internal error',
      errorCode: 'DATABASE_ERROR'
    }
  }
}

/**
 * Log usage to usage_logs table
 */
export async function logUsage(
  entry: UsageLogEntry,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('usage_logs')
      .insert({
        user_id: entry.userId,
        model: entry.model,
        credits_used: entry.creditsUsed,
        request_type: entry.requestType,
        endpoint: entry.endpoint,
        tokens_used: entry.tokensUsed,
        response_time_ms: entry.responseTimeMs,
        status: entry.status,
        error_message: entry.errorMessage,
        metadata: entry.metadata || {}
      })

    if (error) {
      console.error('[CreditManager] Error logging usage:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[CreditManager] Exception in logUsage:', error)
    return false
  }
}

/**
 * Add credits to user wallet (for purchases, bonuses, refunds)
 */
export async function addCredits(
  userId: string,
  creditsToAdd: number,
  type: 'subscription_grant' | 'purchase' | 'bonus' | 'refund' | 'adjustment',
  description: string,
  supabase: SupabaseClient,
  stripePaymentId?: string
): Promise<boolean> {
  try {
    // Get current wallet balance
    const wallet = await getWalletBalance(userId, supabase)

    if (!wallet) {
      console.error('[CreditManager] Wallet not found for user:', userId)
      return false
    }

    // Add credits
    const { data: updatedWallet, error: updateError } = await supabase
      .from('wallet')
      .update({
        credits_balance: wallet.creditsBalance + creditsToAdd
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError || !updatedWallet) {
      console.error('[CreditManager] Error adding credits:', updateError)
      return false
    }

    // Log transaction
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount: creditsToAdd,
        type,
        description,
        credits_before: wallet.creditsBalance,
        credits_after: updatedWallet.credits_balance,
        stripe_payment_id: stripePaymentId
      })

    console.log(`[CreditManager] Added ${creditsToAdd} credits to user ${userId}. New balance: ${updatedWallet.credits_balance}`)
    return true
  } catch (error) {
    console.error('[CreditManager] Exception in addCredits:', error)
    return false
  }
}

/**
 * Update user plan and grant monthly credits
 */
export async function updateUserPlan(
  userId: string,
  plan: 'free' | 'creator' | 'collaborate' | 'scale',
  subscriptionStatus: 'active' | 'inactive' | 'cancelled' | 'past_due',
  supabase: SupabaseClient,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<boolean> {
  try {
    const wallet = await getWalletBalance(userId, supabase)

    if (!wallet) {
      console.error('[CreditManager] Wallet not found for user:', userId)
      return false
    }

    // Determine monthly credits for the plan
    let monthlyCredits = 0
    switch (plan) {
      case 'free':
        monthlyCredits = FREE_PLAN_MONTHLY_CREDITS
        break
      case 'creator':
        monthlyCredits = CREATOR_PLAN_MONTHLY_CREDITS
        break
      case 'collaborate':
        monthlyCredits = COLLABORATE_PLAN_MONTHLY_CREDITS
        break
      case 'scale':
        monthlyCredits = SCALE_PLAN_MONTHLY_CREDITS
        break
    }

    // Update wallet with new plan
    const { error } = await supabase
      .from('wallet')
      .update({
        current_plan: plan,
        subscription_status: subscriptionStatus,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        credits_balance: wallet.creditsBalance + monthlyCredits
      })
      .eq('user_id', userId)

    if (error) {
      console.error('[CreditManager] Error updating plan:', error)
      return false
    }

    // Log transaction for plan upgrade
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount: monthlyCredits,
        type: 'subscription_grant',
        description: `Monthly credits for ${plan} plan`,
        credits_before: wallet.creditsBalance,
        credits_after: wallet.creditsBalance + monthlyCredits,
        stripe_subscription_id: stripeSubscriptionId
      })

    console.log(`[CreditManager] Updated user ${userId} to ${plan} plan with ${monthlyCredits} credits`)
    return true
  } catch (error) {
    console.error('[CreditManager] Exception in updateUserPlan:', error)
    return false
  }
}

/**
 * Get user usage analytics
 */
export async function getUserUsageStats(
  userId: string,
  supabase: SupabaseClient,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalCreditsUsed: number
  totalRequests: number
  avgCreditsPerRequest: number
  modelBreakdown: Record<string, number>
} | null> {
  try {
    let query = supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', userId)

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data, error } = await query

    if (error || !data) {
      console.error('[CreditManager] Error fetching usage stats:', error)
      return null
    }

    const totalCreditsUsed = data.reduce((sum: number, log: any) => sum + parseFloat(log.credits_used.toString()), 0)
    const totalRequests = data.length
    const avgCreditsPerRequest = totalRequests > 0 ? totalCreditsUsed / totalRequests : 0

    // Model breakdown
    const modelBreakdown: Record<string, number> = {}
    data.forEach((log: any) => {
      const model = log.model || 'unknown'
      modelBreakdown[model] = (modelBreakdown[model] || 0) + parseFloat(log.credits_used.toString())
    })

    return {
      totalCreditsUsed,
      totalRequests,
      avgCreditsPerRequest,
      modelBreakdown
    }
  } catch (error) {
    console.error('[CreditManager] Exception in getUserUsageStats:', error)
    return null
  }
}
