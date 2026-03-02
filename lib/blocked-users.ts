/**
 * Blocked users list - these users must upgrade before they can use the platform.
 * Add user IDs here to block them from using the workspace, chat, and API routes.
 */

export const BLOCKED_USERS: Record<string, { email: string; reason: string }> = {
  '613b7089-0587-4458-a570-a0f76598b510': {
    email: 'sliverfurwerewolf858ad@gmail.com',
    reason: 'Account suspended. Please upgrade your plan to continue using the platform.',
  },
}

/**
 * Check if a user is blocked from using the platform
 */
export function isUserBlocked(userId: string): boolean {
  return userId in BLOCKED_USERS
}

/**
 * Get the block reason for a user
 */
export function getBlockReason(userId: string): string | null {
  return BLOCKED_USERS[userId]?.reason ?? null
}
