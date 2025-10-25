-- ============================================================================
-- Fix Team Invitations RLS Policies
-- Created: October 25, 2025
-- Purpose: Add missing RLS policies for team_invitations table
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Team members can view invitations" ON team_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Invited users can update invitations" ON team_invitations;

-- Users can view invitations to their organizations
CREATE POLICY "Team members can view invitations" ON team_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = team_invitations.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    )
  );

-- Admins can create invitations
CREATE POLICY "Admins can create invitations" ON team_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = team_invitations.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
      AND team_members.status = 'active'
    )
  );

-- Invitations can be updated (to mark as accepted/declined)
CREATE POLICY "Invited users can update invitations" ON team_invitations
  FOR UPDATE USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON team_invitations TO authenticated;