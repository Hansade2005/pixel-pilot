-- Create deployments table for tracking wildcard subdomain deployments
CREATE TABLE public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status TEXT DEFAULT 'ready' CHECK (status IN ('ready', 'building', 'error', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  commit_sha TEXT,
  commit_message TEXT,
  branch TEXT DEFAULT 'main',
  environment TEXT DEFAULT 'production',
  external_id TEXT, -- For storing subdomain or Vercel deployment ID
  provider TEXT DEFAULT 'pipilot' CHECK (provider IN ('vercel', 'netlify', 'github', 'pipilot'))
);

-- Add indexes for better performance
CREATE INDEX idx_deployments_workspace_id ON deployments(workspace_id);
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_external_id ON deployments(external_id);
CREATE INDEX idx_deployments_provider ON deployments(provider);

-- Enable Row Level Security
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view deployments in their workspaces" ON public.deployments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = deployments.workspace_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create deployments in their workspaces" ON public.deployments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = deployments.workspace_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update deployments in their workspaces" ON public.deployments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = deployments.workspace_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete deployments in their workspaces" ON public.deployments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = deployments.workspace_id
      AND projects.user_id = auth.uid()
    )
  );

-- Add some useful functions for deployment management
CREATE OR REPLACE FUNCTION get_latest_deployment(workspace_id_param UUID)
RETURNS TABLE (
  id UUID,
  url TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  external_id TEXT,
  provider TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    d.id,
    d.url,
    d.status,
    d.created_at,
    d.external_id,
    d.provider
  FROM public.deployments d
  WHERE d.workspace_id = workspace_id_param
  AND d.status = 'ready'
  ORDER BY d.created_at DESC
  LIMIT 1;
$$;

-- Function to check if subdomain is available
CREATE OR REPLACE FUNCTION is_subdomain_available(subdomain_param TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.deployments
    WHERE external_id = subdomain_param
    AND provider = 'pipilot'
    AND status = 'ready'
  );
$$;

-- Function to cleanup old deployments (keep only last 5 per workspace)
CREATE OR REPLACE FUNCTION cleanup_old_deployments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  WITH ranked_deployments AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY workspace_id
        ORDER BY created_at DESC
      ) as rn
    FROM public.deployments
    WHERE status = 'ready'
  ),
  to_delete AS (
    SELECT id FROM ranked_deployments WHERE rn > 5
  )
  DELETE FROM public.deployments
  WHERE id IN (SELECT id FROM to_delete);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;