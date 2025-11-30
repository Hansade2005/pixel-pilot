/**
 * ABE Wallet Operations - CRUD operations for user wallets
 * Handles wallet creation, balance queries, and credit management
 */

import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { getWalletBalance, addCredits } from './credit-manager'

export interface Wallet {
  id: string
  userId: string
  creditsBalance: number
  creditsUsedThisMonth: number
  creditsUsedTotal: number
  lastResetDate: string
  stripeCustomerId?: string
  currentPlan: 'free' | 'creator' | 'collaborate' | 'scale'
  subscriptionStatus: 'active' | 'inactive' | 'cancelled' | 'past_due'
  stripeSubscriptionId?: string
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  userId: string
  amount: number
  type: 'subscription_grant' | 'purchase' | 'usage' | 'bonus' | 'refund' | 'adjustment' | 'monthly_reset'
  description: string
  creditsBefore: number
  creditsAfter: number
  stripePaymentId?: string
  stripeSubscriptionId?: string
  metadata?: Record<string, any>
  createdAt: string
}

/**
 * Get or create user wallet
 */
export async function getOrCreateWallet(
  userId: string,
  supabase?: SupabaseClient
): Promise<Wallet | null> {
  const client = supabase || await createClient()

  try {
    // Try to get existing wallet
    const { data, error } = await client
      .from('wallet')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('[Wallet] Error fetching wallet:', error)
      return null
    }

    if (data) {
      return {
        id: data.id,
        userId: data.user_id,
        creditsBalance: data.credits_balance,
        creditsUsedThisMonth: data.credits_used_this_month,
        creditsUsedTotal: data.credits_used_total,
        lastResetDate: data.last_reset_date,
        stripeCustomerId: data.stripe_customer_id,
        currentPlan: data.current_plan,
        subscriptionStatus: data.subscription_status,
        stripeSubscriptionId: data.stripe_subscription_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    }

    // Create new wallet for user
    const { data: newWallet, error: createError } = await client
      .from('wallet')
      .insert({
        user_id: userId,
        credits_balance: 20, // Free plan gets 20 credits
        current_plan: 'free',
        subscription_status: 'inactive'
      })
      .select()
      .single()

    if (createError || !newWallet) {
      console.error('[Wallet] Error creating wallet:', createError)
      return null
    }

    // Log initial credit grant
    await client
      .from('transactions')
      .insert({
        user_id: userId,
        amount: 20,
        type: 'subscription_grant',
        description: 'Welcome bonus - Free plan credits',
        credits_before: 0,
        credits_after: 20
      })

    return {
      id: newWallet.id,
      userId: newWallet.user_id,
      creditsBalance: newWallet.credits_balance,
      creditsUsedThisMonth: newWallet.credits_used_this_month,
      creditsUsedTotal: newWallet.credits_used_total,
      lastResetDate: newWallet.last_reset_date,
      stripeCustomerId: newWallet.stripe_customer_id,
      currentPlan: newWallet.current_plan,
      subscriptionStatus: newWallet.subscription_status,
      stripeSubscriptionId: newWallet.stripe_subscription_id,
      createdAt: newWallet.created_at,
      updatedAt: newWallet.updated_at
    }
  } catch (error) {
    console.error('[Wallet] Exception in getOrCreateWallet:', error)
    return null
  }
}

/**
 * Get user transaction history
 */
export async function getTransactionHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0,
  supabase?: SupabaseClient
): Promise<Transaction[]> {
  const client = supabase || await createClient()

  try {
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Wallet] Error fetching transactions:', error)
      return []
    }

    return (data || []).map(tx => ({
      id: tx.id,
      userId: tx.user_id,
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      creditsBefore: tx.credits_before,
      creditsAfter: tx.credits_after,
      stripePaymentId: tx.stripe_payment_id,
      stripeSubscriptionId: tx.stripe_subscription_id,
      metadata: tx.metadata,
      createdAt: tx.created_at
    }))
  } catch (error) {
    console.error('[Wallet] Exception in getTransactionHistory:', error)
    return []
  }
}

/**
 * Purchase additional credits (paid plans only)
 */
export async function purchaseCredits(
  userId: string,
  creditsAmount: number,
  stripePaymentId: string,
  supabase?: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  const client = supabase || await createClient()

  try {
    // Check if user is on paid plan
    const wallet = await getWalletBalance(userId, client)

    if (!wallet) {
      return { success: false, error: 'Wallet not found' }
    }

    if (wallet.currentPlan === 'free') {
      return { success: false, error: 'Free plan users cannot purchase credits. Please upgrade to a paid plan.' }
    }

    // Add credits
    const success = await addCredits(
      userId,
      creditsAmount,
      'purchase',
      `Purchased ${creditsAmount} credits ($${creditsAmount})`,
      client,
      stripePaymentId
    )

    if (!success) {
      return { success: false, error: 'Failed to add credits' }
    }

    return { success: true }
  } catch (error) {
    console.error('[Wallet] Exception in purchaseCredits:', error)
    return { success: false, error: 'Internal error' }
  }
}

/**
 * Handle subscription status change (from Stripe webhook)
 */
export async function handleSubscriptionChange(
  userId: string,
  plan: 'free' | 'creator' | 'collaborate' | 'scale',
  status: 'active' | 'inactive' | 'cancelled' | 'past_due',
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase || await createClient()

  try {
    const { error } = await client
      .from('wallet')
      .update({
        current_plan: plan,
        subscription_status: status,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId
      })
      .eq('user_id', userId)

    if (error) {
      console.error('[Wallet] Error updating subscription:', error)
      return false
    }

    console.log(`[Wallet] Updated subscription for user ${userId} to ${plan} (${status})`)
    return true
  } catch (error) {
    console.error('[Wallet] Exception in handleSubscriptionChange:', error)
    return false
  }
}

/**
 * Cancel subscription (downgrade to free)
 */
export async function cancelSubscription(
  userId: string,
  supabase?: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  const client = supabase || await createClient()

  try {
    const wallet = await getWalletBalance(userId, client)

    if (!wallet) {
      return { success: false, error: 'Wallet not found' }
    }

    // Update to free plan (keep existing credits)
    const { error } = await client
      .from('wallet')
      .update({
        current_plan: 'free',
        subscription_status: 'cancelled',
        stripe_subscription_id: null
      })
      .eq('user_id', userId)

    if (error) {
      console.error('[Wallet] Error cancelling subscription:', error)
      return { success: false, error: 'Failed to cancel subscription' }
    }

    // Log the cancellation
    await client
      .from('transactions')
      .insert({
        user_id: userId,
        amount: 0,
        type: 'adjustment',
        description: 'Subscription cancelled - downgraded to Free plan',
        credits_before: wallet.creditsBalance,
        credits_after: wallet.creditsBalance,
        metadata: { previous_plan: wallet.currentPlan }
      })

    return { success: true }
  } catch (error) {
    console.error('[Wallet] Exception in cancelSubscription:', error)
    return { success: false, error: 'Internal error' }
  }
}

/**
 * Check if user can make a request (has credits)
 */
export async function canMakeRequest(
  userId: string,
  creditsRequired: number = 0.25,
  supabase?: SupabaseClient
): Promise<{ allowed: boolean; reason?: string }> {
  const client = supabase || await createClient()

  const wallet = await getWalletBalance(userId, client)

  if (!wallet) {
    return { allowed: false, reason: 'Wallet not found' }
  }

  if (wallet.creditsBalance < creditsRequired) {
    if (wallet.currentPlan === 'free') {
      return {
        allowed: false,
        reason: 'Insufficient credits. Upgrade to a paid plan to purchase more credits.'
      }
    } else {
      return {
        allowed: false,
        reason: 'Insufficient credits. Purchase more credits to continue.'
      }
    }
  }

  return { allowed: true }
}

/**
 * Get wallet summary with usage stats
 */
export async function getWalletSummary(
  userId: string,
  supabase?: SupabaseClient
): Promise<{
  wallet: Wallet | null
  recentTransactions: Transaction[]
  monthlyUsage: number
  estimatedRemainingMessages: number
} | null> {
  const client = supabase || await createClient()

  try {
    const wallet = await getOrCreateWallet(userId, client)

    if (!wallet) {
      return null
    }

    const recentTransactions = await getTransactionHistory(userId, 10, 0, client)
    const estimatedRemainingMessages = Math.floor(wallet.creditsBalance / 0.25)

    return {
      wallet,
      recentTransactions,
      monthlyUsage: wallet.creditsUsedThisMonth,
      estimatedRemainingMessages
    }
  } catch (error) {
    console.error('[Wallet] Exception in getWalletSummary:', error)
    return null
  }
}
