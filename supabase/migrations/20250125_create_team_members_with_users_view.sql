-- ============================================================================
-- Create View for Team Members with User Info
-- Created: January 25, 2025
-- Purpose: Expose team members with user information for easier querying
-- ============================================================================

-- Create a view that joins team_members with auth.users
CREATE OR REPLACE VIEW team_members_with_users AS
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
  -- User information from auth.users
  u.email,
  u.raw_user_meta_data,
  u.created_at as user_created_at
FROM team_members tm
LEFT JOIN auth.users u ON tm.user_id = u.id;

-- Enable RLS on the view (inherits from team_members)
ALTER VIEW team_members_with_users SET (security_invoker = true);

-- Grant access to authenticated users
GRANT SELECT ON team_members_with_users TO authenticated;

-- Add comment
COMMENT ON VIEW team_members_with_users IS 'Team members with user information joined from auth.users';

-- Also create a function as an alternative approach for more complex queries
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
    u.email,
    u.raw_user_meta_data,
    u.created_at as user_created_at
  FROM team_members tm
  LEFT JOIN auth.users u ON tm.user_id = u.id
  WHERE tm.organization_id = p_org_id
  AND is_team_member(p_org_id, auth.uid())
  ORDER BY tm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_team_members_with_users(UUID) TO authenticated;
