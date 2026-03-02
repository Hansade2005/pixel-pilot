/**
 * Blocked Users - Database-level user blocking managed by admin
 * Users in the blocked_users table with is_active=true must upgrade before continuing.
 */

import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

export interface BlockedUserInfo {
  isBlocked: boolean
  reason?: string
  notes?: string
}

/**
 * Check if a user is blocked (server-side).
 * Returns block info from the blocked_users table.
 */
export async function checkUserBlocked(
  userId: string,
  supabaseClient?: SupabaseClient
): Promise<BlockedUserInfo> {
  try {
    const supabase = supabaseClient || await createClient()

    const { data, error } = await supabase
      .from('blocked_users')
      .select('id, reason, notes, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('[BlockedUsers] Error checking block status:', error)
      return { isBlocked: false }
    }

    if (data) {
      return {
        isBlocked: true,
        reason: data.reason || 'upgrade_required',
        notes: data.notes || 'Your account has been restricted. Please upgrade your plan to continue using the platform.'
      }
    }

    return { isBlocked: false }
  } catch (err) {
    console.error('[BlockedUsers] Exception:', err)
    return { isBlocked: false }
  }
}
