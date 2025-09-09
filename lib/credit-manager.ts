import { getLimits } from '@/lib/stripe-config'

export interface UsageRecord {
  userId: string
  operation: string
  platform?: string
  metadata?: any
  timestamp: Date
}

export interface PlanStatus {
  plan: string
  canUseVercel: boolean
  canUseNetlify: boolean
  canUseGitHub: boolean
  deploymentsThisMonth: number
  deploymentsLimit: number
  githubPushesThisMonth: number
  githubPushesLimit: number
  unlimitedPrompts: boolean
  status: 'ok' | 'deployment_limit_reached' | 'github_limit_reached' | 'upgrade_required'
}


/**
 * Check if user can perform an operation based on their plan
 */
export async function checkPlanLimits(userId: string, operation: string, platform?: string): Promise<{
  canPerform: boolean
  planStatus: PlanStatus
  reason?: string
}> {
  try {
    const response = await fetch('/api/limits/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operation, platform }),
    })

    if (!response.ok) {
      throw new Error(`Plan check failed: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error checking plan limits:', error)
    // Return free tier defaults on error
    const freeLimits = getLimits('free')
    return {
      canPerform: operation !== 'deploy' || platform === 'netlify',
      planStatus: {
        plan: 'free',
        canUseVercel: freeLimits.canUseVercel,
        canUseNetlify: freeLimits.canUseNetlify,
        canUseGitHub: freeLimits.canUseGitHub,
        deploymentsThisMonth: 0,
        deploymentsLimit: freeLimits.deploymentsPerMonth,
        githubPushesThisMonth: 0,
        githubPushesLimit: freeLimits.githubPushesPerMonth || 2,
        unlimitedPrompts: freeLimits.unlimitedPrompts,
        status: 'ok'
      }
    }
  }
}

/**
 * Record usage for tracking and limits
 */
export async function recordUsage(
  userId: string,
  operation: string,
  platform?: string,
  metadata?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/limits/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation,
        platform,
        metadata
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || `Usage recording failed: ${response.status}`
      }
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error in recordUsage:', error)
    return {
      success: false,
      error: 'Usage recording failed'
    }
  }
}

/**
 * Get user's current plan status
 */
export async function getPlanStatus(userId: string): Promise<PlanStatus | null> {
  try {
    const response = await fetch('/api/limits/status')

    if (!response.ok) {
      throw new Error(`Plan status fetch failed: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error getting plan status:', error)
    return null
  }
}

/**
 * Check if a deployment platform is available for the user's plan
 */
export function canUsePlatform(planId: string, platform: string): boolean {
  const limits = getLimits(planId)

  switch (platform.toLowerCase()) {
    case 'vercel':
      return limits.canUseVercel
    case 'netlify':
      return limits.canUseNetlify
    case 'github':
      return limits.canUseGitHub
    default:
      return false
  }
}

/**
 * Get deployment limit for a user's plan
 */
export function getDeploymentLimit(planId: string): number {
  const limits = getLimits(planId)
  return limits.deploymentsPerMonth
}

/**
 * Check if a plan has unlimited prompts
 */
export function hasUnlimitedPrompts(planId: string): boolean {
  const limits = getLimits(planId)
  return limits.unlimitedPrompts
}

