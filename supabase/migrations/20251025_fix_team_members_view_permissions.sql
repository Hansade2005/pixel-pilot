-- ============================================================================
-- Remove Problematic Team Members View
-- Created: October 25, 2025
-- Purpose: Remove the view that causes permission issues, use function instead
-- ============================================================================

-- Drop the problematic view since we're using the RPC function instead
DROP VIEW IF EXISTS team_members_with_users;