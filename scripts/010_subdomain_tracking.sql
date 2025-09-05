-- Create subdomain tracking table in Supabase
CREATE TABLE public.subdomain_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  deployment_url TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase storage bucket
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_subdomain_tracking_subdomain ON subdomain_tracking(subdomain);
CREATE INDEX idx_subdomain_tracking_user_id ON subdomain_tracking(user_id);
CREATE INDEX idx_subdomain_tracking_workspace_id ON subdomain_tracking(workspace_id);
CREATE INDEX idx_subdomain_tracking_active ON subdomain_tracking(is_active);

-- Enable Row Level Security
ALTER TABLE public.subdomain_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own subdomain tracking" ON public.subdomain_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = subdomain_tracking.user_id
      AND profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own subdomain tracking" ON public.subdomain_tracking
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = subdomain_tracking.user_id
      AND profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own subdomain tracking" ON public.subdomain_tracking
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = subdomain_tracking.user_id
      AND profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own subdomain tracking" ON public.subdomain_tracking
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = subdomain_tracking.user_id
      AND profiles.id = auth.uid()
    )
  );

-- Function to check if subdomain is available
CREATE OR REPLACE FUNCTION is_subdomain_available(subdomain_param TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.subdomain_tracking
    WHERE subdomain = subdomain_param
    AND is_active = true
  );
$$;

-- Function to get subdomain info
CREATE OR REPLACE FUNCTION get_subdomain_info(subdomain_param TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  workspace_id UUID,
  deployment_url TEXT,
  storage_path TEXT,
  is_active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    st.id,
    st.user_id,
    st.workspace_id,
    st.deployment_url,
    st.storage_path,
    st.is_active
  FROM public.subdomain_tracking st
  WHERE st.subdomain = subdomain_param
  AND st.is_active = true;
$$;

-- Function to deactivate subdomain
CREATE OR REPLACE FUNCTION deactivate_subdomain(subdomain_param TEXT, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE public.subdomain_tracking
  SET is_active = false, updated_at = NOW()
  WHERE subdomain = subdomain_param
  AND user_id = user_id_param
  AND is_active = true;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;
