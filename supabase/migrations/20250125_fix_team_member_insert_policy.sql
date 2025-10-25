-- ============================================================================
-- Fix Team Member Insert Policy - Allow Owner Self-Add
-- Created: January 25, 2025
-- Purpose: Allow organization owners to add themselves as first member
-- ============================================================================

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Admins can add team members" ON team_members;

-- Create new insert policy that allows:
-- 1. Organization owners to add themselves as the first member
-- 2. Existing admins/owners to add other members
CREATE POLICY "Users can add team members" ON team_members
  FOR INSERT WITH CHECK (
    -- Allow org owner to add themselves as the first member
    (user_id = auth.uid() AND
     EXISTS (
       SELECT 1 FROM organizations o
       WHERE o.id = organization_id
       AND o.owner_id = auth.uid()
     ))
    OR
    -- Allow existing admins/owners to add other members
    is_org_admin_or_owner(organization_id, auth.uid())
  );
