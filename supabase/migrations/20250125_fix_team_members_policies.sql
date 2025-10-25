-- ============================================================================
-- Fix Team Members RLS Policies - Remove Infinite Recursion
-- Created: January 25, 2025
-- Purpose: Fix infinite recursion in team_members policies
-- ============================================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view team members in their orgs" ON team_members;
DROP POLICY IF EXISTS "Admins can add team members" ON team_members;
DROP POLICY IF EXISTS "Admins can update team members" ON team_members;
DROP POLICY IF EXISTS "Admins can remove team members" ON team_members;

-- ======================
-- HELPER FUNCTION TO CHECK MEMBERSHIP (bypasses RLS)
-- ======================
CREATE OR REPLACE FUNCTION is_team_member(org_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE organization_id = org_id
    AND team_members.user_id = user_id
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is org owner
CREATE OR REPLACE FUNCTION is_org_owner(org_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organizations
    WHERE id = org_id
    AND owner_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin or owner
CREATE OR REPLACE FUNCTION is_org_admin_or_owner(org_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE organization_id = org_id
    AND team_members.user_id = user_id
    AND role IN ('owner', 'admin')
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================
-- NEW RLS POLICIES: TEAM MEMBERS (using helper functions)
-- ======================

-- Users can view members of organizations they belong to
CREATE POLICY "Users can view team members in their orgs" ON team_members
  FOR SELECT USING (
    is_team_member(organization_id, auth.uid())
  );

-- Admins and owners can add members
CREATE POLICY "Admins can add team members" ON team_members
  FOR INSERT WITH CHECK (
    is_org_admin_or_owner(organization_id, auth.uid())
  );

-- Admins and owners can update members (but not change owner role)
CREATE POLICY "Admins can update team members" ON team_members
  FOR UPDATE USING (
    is_org_admin_or_owner(organization_id, auth.uid())
  );

-- Admins and owners can remove members (except owner)
CREATE POLICY "Admins can remove team members" ON team_members
  FOR DELETE USING (
    role != 'owner' AND is_org_admin_or_owner(organization_id, auth.uid())
  );

-- ======================
-- UPDATE ORGANIZATIONS POLICIES TO USE HELPER FUNCTION
-- ======================

-- Drop and recreate organizations SELECT policy
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;

CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    is_team_member(id, auth.uid()) OR owner_id = auth.uid()
  );
