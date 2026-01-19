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

// Credit constants - Token-based pricing system
// 1 credit = $0.01 (with 3x markup on API costs for profit margin)
export const CREDIT_TO_USD_RATE = 0.01 // 1 credit = $0.01 USD

// Monthly credits per plan (adjusted for new token-based pricing)
export const FREE_PLAN_MONTHLY_CREDITS = 200      // ~$0.66 API cost (~20 messages)
export const CREATOR_PLAN_MONTHLY_CREDITS = 1500  // ~$5 API cost, you charge $15
export const COLLABORATE_PLAN_MONTHLY_CREDITS = 2500  // ~$8 API cost, you charge $25
export const SCALE_PLAN_MONTHLY_CREDITS = 6000    // ~$20 API cost, you charge $60

// Claude Sonnet 4 API pricing (per token)
const INPUT_COST_PER_TOKEN = 0.000003   // $3 per 1M input tokens
const OUTPUT_COST_PER_TOKEN = 0.000015  // $15 per 1M output tokens
const MARKUP_MULTIPLIER = 3  // 3x markup for profit margin

// Request limits per plan (safety against expensive operations)
export const MAX_CREDITS_PER_REQUEST = {
  free: 50,        // Blocks very expensive operations
  creator: 200,    // Allows moderate complexity
  collaborate: 300, // Allows high complexity
  scale: 500       // Allows very high complexity
}

export const MAX_STEPS_PER_REQUEST = {
  free: 5,         // Very limited multi-step tool calls
  creator: 15,     // Moderate multi-step
  collaborate: 20, // High multi-step
  scale: 25        // Very high multi-step
}

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
  promptTokens?: number
  completionTokens?: number
  stepsCount?: number
  responseTimeMs?: number
  status: 'success' | 'error' | 'timeout'
  errorMessage?: string
  metadata?: Record<string, any>
}

/**
 * Calculate credits from actual token usage (AI SDK integration)
 * Returns credit cost based on real API usage with 3x markup
 */
export function calculateCreditsFromTokens(
  promptTokens: number,
  completionTokens: number,
  model: string = 'claude-sonnet'
): number {
  // Calculate actual API cost in USD
  const apiCost = (promptTokens * INPUT_COST_PER_TOKEN) + 
                  (completionTokens * OUTPUT_COST_PER_TOKEN)
  
  // Convert to credits: API cost in dollars * 100 (to get cents) * 3x markup
  const credits = Math.ceil(apiCost * 100 * MARKUP_MULTIPLIER)
  
  // Minimum 1 credit per request to prevent free usage
  return Math.max(1, credits)
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
  creditsRequired: number,
  supabase: SupabaseClient
): Promise<boolean> {
  const wallet = await getWalletBalance(userId, supabase)
  
  if (!wallet) return false
  
  return wallet.creditsBalance >= creditsRequired
}

/**
 * Deduct credits from user wallet
 * @param creditsToDeduct - Number of credits to deduct (calculated from token usage)
 */
export async function deductCredits(
  userId: string,
  creditsToDeduct: number,
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
        prompt_tokens: entry.promptTokens,
        completion_tokens: entry.completionTokens,
        steps_count: entry.stepsCount,
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
 * Deduct credits based on actual token usage from AI SDK
 * Call this AFTER each AI request completes (generateText or streamText)
 * 
 * @example
 * const result = await generateText({ model, messages, tools, maxSteps: 15 })
 * await deductCreditsFromUsage(userId, result.usage, { model: 'claude-sonnet-4', requestType: 'chat', steps: result.steps.length }, supabase)
 */
export async function deductCreditsFromUsage(
  userId: string,
  usage: { promptTokens: number; completionTokens: number },
  metadata: {
    model: string
    requestType: string
    endpoint?: string
    steps?: number  // Number of tool call steps from AI SDK
    responseTimeMs?: number
    status?: 'success' | 'error' | 'timeout'
    errorMessage?: string
  },
  supabase: SupabaseClient
): Promise<CreditDeductionResult> {
  
  // Calculate actual credits based on token usage with markup
  const creditsToDeduct = calculateCreditsFromTokens(
    usage.promptTokens,
    usage.completionTokens,
    metadata.model
  )
  
  console.log(`[CreditManager] Calculated ${creditsToDeduct} credits from ${usage.promptTokens} input + ${usage.completionTokens} output tokens (${metadata.steps || 1} steps)`)
  
  // Use existing deductCredits function with enhanced metadata
  return deductCredits(
    userId,
    creditsToDeduct,
    {
      model: metadata.model,
      requestType: metadata.requestType,
      endpoint: metadata.endpoint || '/api/chat-v2',
      tokensUsed: usage.promptTokens + usage.completionTokens,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      stepsCount: metadata.steps || 1,
      responseTimeMs: metadata.responseTimeMs,
      status: metadata.status || 'success',
      errorMessage: metadata.errorMessage,
      metadata: {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        steps: metadata.steps,
        creditsCalculated: creditsToDeduct
      }
    },
    supabase
  )
}

/**
 * Check if request is within plan limits (safety check before making AI call)
 */
export async function checkRequestLimits(
  userId: string,
  estimatedCredits: number,
  requestedSteps: number,
  supabase: SupabaseClient
): Promise<{ allowed: boolean; reason?: string }> {
  const wallet = await getWalletBalance(userId, supabase)
  
  if (!wallet) {
    return { allowed: false, reason: 'Wallet not found' }
  }
  
  const maxCredits = MAX_CREDITS_PER_REQUEST[wallet.currentPlan] || MAX_CREDITS_PER_REQUEST.free
  const maxSteps = MAX_STEPS_PER_REQUEST[wallet.currentPlan] || MAX_STEPS_PER_REQUEST.free
  
  if (estimatedCredits > maxCredits) {
    return { 
      allowed: false, 
      reason: `Request exceeds plan limit. Max ${maxCredits} credits per request for ${wallet.currentPlan} plan.` 
    }
  }
  
  if (requestedSteps > maxSteps) {
    return { 
      allowed: false, 
      reason: `Too many steps requested. Max ${maxSteps} steps for ${wallet.currentPlan} plan.` 
    }
  }
  
  return { allowed: true }
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
