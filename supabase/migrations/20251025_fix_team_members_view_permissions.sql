-- ============================================================================
-- Fix Team Members View Permissions
-- Created: October 25, 2025
-- Purpose: Change view to SECURITY DEFINER and enable RLS with proper policies
-- ============================================================================

-- Change the view to SECURITY DEFINER so it can access auth.users
ALTER VIEW team_members_with_users SET (security_definer = true);

-- Enable RLS on the view
ALTER VIEW team_members_with_users ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy that mirrors team_members policy
CREATE POLICY "Users can view team members with users in their orgs" ON team_members_with_users
  FOR SELECT
  USING (is_team_member(organization_id, auth.uid()));

-- Grant select permission (already exists but ensuring)
GRANT SELECT ON team_members_with_users TO authenticated;