-- ============================================================================
-- Team Workspaces Migration
-- Created: January 25, 2025
-- Purpose: Enable team collaboration with organizations, members, and shared workspaces
-- ============================================================================

-- ======================
-- 1. ORGANIZATIONS TABLE
-- ======================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  description TEXT,
  avatar_url TEXT,

  -- Owner
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Subscription (can override individual user subscription)
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'team', 'enterprise')),
  max_members INTEGER DEFAULT 5, -- Free: 5, Team: 20, Enterprise: unlimited
  max_workspaces INTEGER DEFAULT 10, -- Free: 10, Team: 50, Enterprise: unlimited

  -- Billing
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,

  -- Metadata
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================
-- 2. TEAM MEMBERS TABLE
-- ======================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Role-based access control
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  -- owner: Full control
  -- admin: Manage members, billing, workspaces
  -- editor: Create/edit workspaces
  -- viewer: View only

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),

  -- Permissions override (JSON for granular control)
  permissions JSONB DEFAULT '{
    "can_create_workspaces": true,
    "can_delete_workspaces": false,
    "can_invite_members": false,
    "can_manage_billing": false
  }'::jsonb,

  -- Metadata
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure user can only be in organization once
  UNIQUE(organization_id, user_id)
);

-- ======================
-- 3. TEAM WORKSPACES TABLE
-- ======================
CREATE TABLE IF NOT EXISTS team_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  -- Workspace details (mirrors individual workspace structure)
  name TEXT NOT NULL,
  description TEXT,
  template TEXT, -- 'vite', 'nextjs', 'custom'

  -- Owner within organization
  created_by UUID REFERENCES auth.users(id) NOT NULL,

  -- Access control
  visibility TEXT DEFAULT 'team' CHECK (visibility IN ('private', 'team', 'public')),
  -- private: Only creator + explicitly shared users
  -- team: All team members
  -- public: Anyone with link (future feature)

  -- Workspace data (stored as JSON for flexibility)
  files JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,

  -- Activity tracking
  last_edited_by UUID REFERENCES auth.users(id),
  last_edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================
-- 4. WORKSPACE MEMBERS TABLE
-- ======================
-- For private workspaces, track who has access
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES team_workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Access level for this workspace
  access_level TEXT DEFAULT 'editor' CHECK (access_level IN ('owner', 'editor', 'viewer')),

  -- Metadata
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure user can only have one access level per workspace
  UNIQUE(workspace_id, user_id)
);

-- ======================
-- 5. TEAM INVITATIONS TABLE
-- ======================
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  -- Invite details
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),

  -- Invitation status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token TEXT UNIQUE NOT NULL, -- Secure invitation token

  -- Metadata
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Expires in 7 days
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure email can only have one pending invite per org
  UNIQUE(organization_id, email, status)
);

-- ======================
-- 6. ACTIVITY LOG TABLE
-- ======================
CREATE TABLE IF NOT EXISTS team_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES team_workspaces(id) ON DELETE CASCADE,

  -- Activity details
  action TEXT NOT NULL, -- 'created_workspace', 'edited_file', 'invited_member', etc.
  actor_id UUID REFERENCES auth.users(id) NOT NULL,
  target_id UUID, -- ID of affected resource (user, workspace, etc.)

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================
-- INDEXES FOR PERFORMANCE
-- ======================
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_team_members_org ON team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_team_workspaces_org ON team_workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_workspaces_creator ON team_workspaces(created_by);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_org ON team_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_activity_org ON team_activity(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_workspace ON team_activity(workspace_id);

-- ======================
-- ROW LEVEL SECURITY
-- ======================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activity ENABLE ROW LEVEL SECURITY;

-- ======================
-- RLS POLICIES: ORGANIZATIONS
-- ======================
-- Users can view organizations they're a member of
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = organizations.id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    )
  );

-- Users can create organizations (they become owner)
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Owners can update their organizations
CREATE POLICY "Owners can update their organizations" ON organizations
  FOR UPDATE USING (auth.uid() = owner_id);

-- Owners can delete their organizations
CREATE POLICY "Owners can delete their organizations" ON organizations
  FOR DELETE USING (auth.uid() = owner_id);

-- ======================
-- RLS POLICIES: TEAM MEMBERS
-- ======================
-- Users can view members of their organizations
CREATE POLICY "Users can view team members in their orgs" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.organization_id = team_members.organization_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
    )
  );

-- Admins and owners can add members
CREATE POLICY "Admins can add team members" ON team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
      AND team_members.status = 'active'
    )
  );

-- Admins and owners can update members
CREATE POLICY "Admins can update team members" ON team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.organization_id = team_members.organization_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
      AND tm.status = 'active'
    )
  );

-- Admins and owners can remove members (except owner)
CREATE POLICY "Admins can remove team members" ON team_members
  FOR DELETE USING (
    team_members.role != 'owner' AND
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.organization_id = team_members.organization_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
      AND tm.status = 'active'
    )
  );

-- ======================
-- RLS POLICIES: TEAM WORKSPACES
-- ======================
-- Users can view workspaces in their organizations
CREATE POLICY "Users can view team workspaces" ON team_workspaces
  FOR SELECT USING (
    -- Team visibility: all team members
    (visibility = 'team' AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = team_workspaces.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    ))
    OR
    -- Private visibility: only explicit members or creator
    (visibility = 'private' AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = team_workspaces.id
        AND workspace_members.user_id = auth.uid()
      )
    ))
  );

-- Team members with editor role can create workspaces
CREATE POLICY "Editors can create workspaces" ON team_workspaces
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin', 'editor')
      AND team_members.status = 'active'
    )
  );

-- Workspace owners and editors can update
CREATE POLICY "Editors can update workspaces" ON team_workspaces
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = team_workspaces.id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.access_level IN ('owner', 'editor')
    ) OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = team_workspaces.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
      AND team_members.status = 'active'
    )
  );

-- Workspace owners and org admins can delete
CREATE POLICY "Owners can delete workspaces" ON team_workspaces
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = team_workspaces.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
      AND team_members.status = 'active'
    )
  );

-- ======================
-- RLS POLICIES: WORKSPACE MEMBERS
-- ======================
-- Users can view members of workspaces they have access to
CREATE POLICY "Users can view workspace members" ON workspace_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Workspace owners can add members
CREATE POLICY "Owners can add workspace members" ON workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_workspaces
      WHERE team_workspaces.id = workspace_id
      AND team_workspaces.created_by = auth.uid()
    )
  );

-- Workspace owners can update members
CREATE POLICY "Owners can update workspace members" ON workspace_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_workspaces
      WHERE team_workspaces.id = workspace_members.workspace_id
      AND team_workspaces.created_by = auth.uid()
    )
  );

-- Workspace owners can remove members
CREATE POLICY "Owners can remove workspace members" ON workspace_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM team_workspaces
      WHERE team_workspaces.id = workspace_members.workspace_id
      AND team_workspaces.created_by = auth.uid()
    )
  );

-- ======================
-- RLS POLICIES: TEAM INVITATIONS
-- ======================
-- Users can view invitations to their organizations
CREATE POLICY "Team members can view invitations" ON team_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = team_invitations.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
      AND team_members.status = 'active'
    )
  );

-- Admins can create invitations
CREATE POLICY "Admins can create invitations" ON team_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = organization_id
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

-- ======================
-- RLS POLICIES: TEAM ACTIVITY
-- ======================
-- Users can view activity in their organizations
CREATE POLICY "Users can view team activity" ON team_activity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = team_activity.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    )
  );

-- System can insert activity (logged automatically)
CREATE POLICY "System can insert activity" ON team_activity
  FOR INSERT WITH CHECK (true);

-- ======================
-- TRIGGERS FOR AUTO-UPDATE
-- ======================
-- Update updated_at timestamp on organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on team_members
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on team_workspaces
CREATE TRIGGER update_team_workspaces_updated_at
  BEFORE UPDATE ON team_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ======================
-- HELPER FUNCTIONS
-- ======================
-- Function to check if user is org admin
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID, user_id UUID)
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

-- Function to log team activity
CREATE OR REPLACE FUNCTION log_team_activity(
  p_organization_id UUID,
  p_workspace_id UUID,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO team_activity (organization_id, workspace_id, action, actor_id, metadata)
  VALUES (p_organization_id, p_workspace_id, p_action, auth.uid(), p_metadata)
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================
-- GRANT PERMISSIONS
-- ======================
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON team_members TO authenticated;
GRANT ALL ON team_workspaces TO authenticated;
GRANT ALL ON workspace_members TO authenticated;
GRANT ALL ON team_invitations TO authenticated;
GRANT ALL ON team_activity TO authenticated;

-- ======================
-- COMMENTS FOR DOCUMENTATION
-- ======================
COMMENT ON TABLE organizations IS 'Organizations/teams for collaboration';
COMMENT ON TABLE team_members IS 'Members of organizations with roles';
COMMENT ON TABLE team_workspaces IS 'Shared workspaces within teams';
COMMENT ON TABLE workspace_members IS 'Explicit access control for private workspaces';
COMMENT ON TABLE team_invitations IS 'Pending invitations to join teams';
COMMENT ON TABLE team_activity IS 'Activity log for audit trail';

COMMENT ON COLUMN team_members.role IS 'owner: Full control, admin: Manage members/billing, editor: Create/edit workspaces, viewer: View only';
COMMENT ON COLUMN team_workspaces.visibility IS 'private: Only creator + explicit members, team: All team members, public: Anyone with link';
