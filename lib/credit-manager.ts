import { getLimits } from '@/lib/stripe-config'

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
 * Check if user has sufficient credits for an operation
 */
export async function checkCredits(userId: string, requiredCredits: number): Promise<{
  hasCredits: boolean
  remainingCredits: number
  creditStatus: CreditStatus
}> {
  try {
    const response = await fetch('/api/credits/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requiredCredits }),
    })

    if (!response.ok) {
      throw new Error(`Credit check failed: ${response.status}`)
    }

    const data = await response.json()
    return data
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
    const response = await fetch('/api/credits/deduct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creditsToDeduct,
        operation,
        metadata
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || `Deduction failed: ${response.status}`
      }
    }

    const data = await response.json()
    return data
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
    const response = await fetch('/api/credits/status')

    if (!response.ok) {
      throw new Error(`Credit status fetch failed: ${response.status}`)
    }

    const data = await response.json()
    return data
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

