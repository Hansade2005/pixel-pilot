/**
 * User Block Check - Database-level user blocking system
 * Admin can manage blocked users via the blocked_users table in Supabase
 * Blocked users must upgrade their plan before continuing to use the platform
 */

import { createClient } from '@/lib/supabase/client'

export interface BlockStatus {
  isBlocked: boolean
  reason?: string
  blockedAt?: string
  blockedBy?: string
}

/**
 * Check if a user is blocked (client-side)
 */
export async function checkUserBlocked(userId: string): Promise<BlockStatus> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('blocked_users')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return { isBlocked: false }
    }

    return {
      isBlocked: true,
      reason: data.reason || 'Your account requires an upgrade before you can continue.',
      blockedAt: data.blocked_at,
      blockedBy: data.blocked_by,
    }
  } catch {
    return { isBlocked: false }
  }
}
