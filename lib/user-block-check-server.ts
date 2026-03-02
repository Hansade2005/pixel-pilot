/**
 * User Block Check - Server-side version
 * Uses the server Supabase client for API routes and server components
 */

import { createClient } from '@/lib/supabase/server'

export interface BlockStatus {
  isBlocked: boolean
  reason?: string
  blockedAt?: string
  blockedBy?: string
}

/**
 * Check if a user is blocked (server-side)
 */
export async function checkUserBlockedServer(userId: string): Promise<BlockStatus> {
  try {
    const supabase = await createClient()
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
