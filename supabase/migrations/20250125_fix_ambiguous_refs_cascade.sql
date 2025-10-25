-- ============================================================================
-- Fix Ambiguous Column References - Complete Fix
-- Created: January 25, 2025
-- Purpose: Fix ambiguous column references by recreating functions and policies
-- ============================================================================

-- Drop policies first (they depend on the functions)
DROP POLICY IF EXISTS "Users can view team members in their orgs" ON team_members;
DROP POLICY IF EXISTS "Admins can add team members" ON team_members;
DROP POLICY IF EXISTS "Admins can update team members" ON team_members;
DROP POLICY IF EXISTS "Admins can remove team members" ON team_members;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;

-- Now drop functions
DROP FUNCTION IF EXISTS is_team_member(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS is_org_owner(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS is_org_admin_or_owner(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS is_org_admin(UUID, UUID) CASCADE;

-- ======================
-- RECREATE HELPER FUNCTIONS (with qualified column names)
-- ======================

-- Helper function to check if user is a team member
CREATE FUNCTION is_team_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.organization_id = p_org_id
    AND tm.user_id = p_user_id
    AND tm.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user is org owner
CREATE FUNCTION is_org_owner(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = p_org_id
    AND o.owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user is admin or owner
CREATE FUNCTION is_org_admin_or_owner(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.organization_id = p_org_id
    AND tm.user_id = p_user_id
    AND tm.role IN ('owner', 'admin')
    AND tm.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function for is_org_admin (legacy compatibility)
CREATE FUNCTION is_org_admin(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_org_admin_or_owner(p_org_id, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ======================
-- RECREATE RLS POLICIES
-- ======================

-- Organizations: Users can view organizations they're a member of
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    is_team_member(id, auth.uid()) OR owner_id = auth.uid()
  );

-- Team Members: Users can view members of organizations they belong to
CREATE POLICY "Users can view team members in their orgs" ON team_members
  FOR SELECT USING (
    is_team_member(organization_id, auth.uid())
  );

-- Team Members: Admins and owners can add members
-- NOTE: This policy was later updated in 20250125_fix_team_member_insert_policy.sql
-- to allow org owners to add themselves as the first member
CREATE POLICY "Admins can add team members" ON team_members
  FOR INSERT WITH CHECK (
    is_org_admin_or_owner(organization_id, auth.uid())
  );

-- Team Members: Admins and owners can update members
CREATE POLICY "Admins can update team members" ON team_members
  FOR UPDATE USING (
    is_org_admin_or_owner(organization_id, auth.uid())
  );

-- Team Members: Admins and owners can remove members (except owner)
CREATE POLICY "Admins can remove team members" ON team_members
  FOR DELETE USING (
    role != 'owner' AND is_org_admin_or_owner(organization_id, auth.uid())
  );
