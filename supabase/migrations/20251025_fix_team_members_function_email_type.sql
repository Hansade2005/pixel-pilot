-- ============================================================================
-- Fix Team Members Function Email Type Cast
-- Created: October 25, 2025
-- Purpose: Cast email column to TEXT to match function return type
-- ============================================================================

-- Fix the get_team_members_with_users function to cast email to TEXT
CREATE OR REPLACE FUNCTION get_team_members_with_users(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  user_id UUID,
  role TEXT,
  status TEXT,
  permissions JSONB,
  invited_by UUID,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  email TEXT,
  raw_user_meta_data JSONB,
  user_created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tm.id,
    tm.organization_id,
    tm.user_id,
    tm.role,
    tm.status,
    tm.permissions,
    tm.invited_by,
    tm.joined_at,
    tm.created_at,
    tm.updated_at,
    u.email::TEXT,  -- Cast to TEXT to match return type
    u.raw_user_meta_data,
    u.created_at as user_created_at
  FROM team_members tm
  LEFT JOIN auth.users u ON tm.user_id = u.id
  WHERE tm.organization_id = p_org_id
  AND is_team_member(p_org_id, auth.uid())
  ORDER BY tm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;