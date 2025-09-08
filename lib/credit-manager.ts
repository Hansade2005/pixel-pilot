import { createClient } from '@/lib/supabase/server'
import { getLimits } from '@/lib/stripe-config'
import { isAdmin } from '@/lib/admin-utils'

export interface CreditUsage {
  userId: string
  creditsUsed: number
  operation: string
  metadata?: any
}

export interface CreditStatus {
  remaining: number
  used: number
  limit: number
  plan: string
  status: 'ok' | 'low' | 'exhausted'
}

/**
 * Check if user is admin and should be excluded from credit system
 */
async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: user, error } = await supabase.auth.admin.getUserById(userId)

    if (error || !user?.user?.email) {
      return false
    }

    return isAdmin(user.user.email)
  } catch (error) {
    console.error('Error checking if user is admin:', error)
    return false
  }
}

/**
 * Check if user has sufficient credits for an operation
 */
export async function checkCredits(userId: string, requiredCredits: number): Promise<{
  hasCredits: boolean
  remainingCredits: number
  creditStatus: CreditStatus
}> {
  try {
    // Check if user is admin - if so, bypass credit system
    const userIsAdmin = await isUserAdmin(userId)
    if (userIsAdmin) {
      console.log(`[ADMIN] Admin user ${userId} bypassing credit check`)
      return {
        hasCredits: true,
        remainingCredits: 999999, // Unlimited for admin
        creditStatus: {
          remaining: 999999,
          used: 0,
          limit: 999999,
          plan: 'admin',
          status: 'ok'
        }
      }
    }

    const supabase = await createClient()

    // Get user's current subscription and credits
    const { data: userSettings, error } = await supabase
      .from('user_settings')
      .select('subscription_plan, credits_remaining, credits_used_this_month')
      .eq('user_id', userId)
      .single()

    if (error || !userSettings) {
      // Default to free tier if no settings found
      const freeLimits = getLimits('free')
      return {
        hasCredits: requiredCredits <= freeLimits.credits,
        remainingCredits: freeLimits.credits,
        creditStatus: {
          remaining: freeLimits.credits,
          used: 0,
          limit: freeLimits.credits,
          plan: 'free',
          status: requiredCredits <= freeLimits.credits ? 'ok' : 'exhausted'
        }
      }
    }

    const limits = getLimits(userSettings.subscription_plan)
    const remaining = userSettings.credits_remaining || limits.credits
    const used = userSettings.credits_used_this_month || 0

    return {
      hasCredits: remaining >= requiredCredits,
      remainingCredits: remaining,
      creditStatus: {
        remaining,
        used,
        limit: limits.credits,
        plan: userSettings.subscription_plan,
        status: remaining > limits.credits * 0.2 ? 'ok' :
               remaining > 0 ? 'low' : 'exhausted'
      }
    }
  } catch (error) {
    console.error('Error checking credits:', error)
    // Return free tier defaults on error
    const freeLimits = getLimits('free')
    return {
      hasCredits: requiredCredits <= freeLimits.credits,
      remainingCredits: freeLimits.credits,
      creditStatus: {
        remaining: freeLimits.credits,
        used: 0,
        limit: freeLimits.credits,
        plan: 'free',
        status: 'ok'
      }
    }
  }
}

/**
 * Deduct credits from user's balance
 */
export async function deductCredits(
  userId: string,
  creditsToDeduct: number,
  operation: string,
  metadata?: any
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  try {
    // Check if user is admin - if so, skip credit deduction
    const userIsAdmin = await isUserAdmin(userId)
    if (userIsAdmin) {
      console.log(`[ADMIN] Admin user ${userId} skipping credit deduction for ${operation}`)
      return {
        success: true,
        newBalance: 999999 // Unlimited for admin
      }
    }

    const supabase = await createClient()

    // Check if user has sufficient credits
    const creditCheck = await checkCredits(userId, creditsToDeduct)
    if (!creditCheck.hasCredits) {
      return {
        success: false,
        error: 'Insufficient credits'
      }
    }

    // Deduct credits
    const newBalance = creditCheck.remainingCredits - creditsToDeduct
    const newUsed = creditCheck.creditStatus.used + creditsToDeduct

    const { error } = await supabase
      .from('user_settings')
      .update({
        credits_remaining: newBalance,
        credits_used_this_month: newUsed,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (error) {
      console.error('Error deducting credits:', error)
      return {
        success: false,
        error: 'Failed to update credit balance'
      }
    }

    // Log credit usage (you might want to create a separate table for this)
    console.log(`Credits deducted: ${creditsToDeduct} for ${operation}`, {
      userId,
      newBalance,
      metadata
    })

    return {
      success: true,
      newBalance
    }
  } catch (error) {
    console.error('Error in deductCredits:', error)
    return {
      success: false,
      error: 'Credit deduction failed'
    }
  }
}

/**
 * Get user's current credit status
 */
export async function getCreditStatus(userId: string): Promise<CreditStatus | null> {
  try {
    // Check if user is admin - if so, return unlimited status
    const userIsAdmin = await isUserAdmin(userId)
    if (userIsAdmin) {
      console.log(`[ADMIN] Admin user ${userId} getting unlimited credit status`)
      return {
        remaining: 999999,
        used: 0,
        limit: 999999,
        plan: 'admin',
        status: 'ok'
      }
    }

    const supabase = await createClient()

    const { data: userSettings, error } = await supabase
      .from('user_settings')
      .select('subscription_plan, credits_remaining, credits_used_this_month')
      .eq('user_id', userId)
      .single()

    if (error || !userSettings) {
      // Return free tier defaults
      const freeLimits = getLimits('free')
      return {
        remaining: freeLimits.credits,
        used: 0,
        limit: freeLimits.credits,
        plan: 'free',
        status: 'ok'
      }
    }

    const limits = getLimits(userSettings.subscription_plan)
    const remaining = userSettings.credits_remaining || limits.credits
    const used = userSettings.credits_used_this_month || 0

    return {
      remaining,
      used,
      limit: limits.credits,
      plan: userSettings.subscription_plan,
      status: remaining > limits.credits * 0.2 ? 'ok' :
             remaining > 0 ? 'low' : 'exhausted'
    }
  } catch (error) {
    console.error('Error getting credit status:', error)
    return null
  }
}

/**
 * Calculate credits needed for different operations
 */
export function calculateCredits(operation: string, data?: any): number {
  switch (operation) {
    case 'chat_message':
      // Base cost for chat messages (can vary by model)
      const messageLength = data?.message?.length || 100
      return Math.ceil(messageLength / 100) // 1 credit per 100 characters

    case 'code_generation':
      return 5 // Fixed cost for code generation

    case 'file_analysis':
      return 2 // Fixed cost for file analysis

    case 'deployment':
      return 10 // Fixed cost for deployment

    case 'image_generation':
      return 8 // Fixed cost for image generation

    default:
      return 1 // Default cost
  }
}

/**
 * Reset monthly credits (should be called by a cron job or scheduled function)
 */
export async function resetMonthlyCredits(): Promise<void> {
  try {
    const supabase = await createClient()

    // Get all users with active subscriptions
    const { data: users, error } = await supabase
      .from('user_settings')
      .select('user_id, subscription_plan')
      .neq('subscription_status', 'inactive')

    if (error) {
      console.error('Error fetching users for credit reset:', error)
      return
    }

    for (const user of users || []) {
      const limits = getLimits(user.subscription_plan)

      const { error: updateError } = await supabase
        .from('user_settings')
        .update({
          credits_remaining: limits.credits,
          credits_used_this_month: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.user_id)

      if (updateError) {
        console.error(`Error resetting credits for user ${user.user_id}:`, updateError)
      }
    }

    console.log(`Monthly credits reset for ${users?.length || 0} users`)
  } catch (error) {
    console.error('Error in resetMonthlyCredits:', error)
  }
}
