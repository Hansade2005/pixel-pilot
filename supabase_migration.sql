-- Migration: Add Supabase integration fields to user_settings table
-- Add fields for Supabase access token, connection status, and project details

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS supabase_token TEXT,
ADD COLUMN IF NOT EXISTS supabase_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS supabase_project_url TEXT,
ADD COLUMN IF NOT EXISTS supabase_anon_key TEXT,
ADD COLUMN IF NOT EXISTS supabase_service_role_key TEXT,
ADD COLUMN IF NOT EXISTS supabase_selected_project_id TEXT,
ADD COLUMN IF NOT EXISTS supabase_selected_project_name TEXT;

-- Add indexes for the new Supabase fields
CREATE INDEX IF NOT EXISTS idx_user_settings_supabase_connected
ON public.user_settings USING btree (supabase_connected) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_user_settings_supabase_selected_project
ON public.user_settings USING btree (supabase_selected_project_id) TABLESPACE pg_default;

-- Add comments for documentation
COMMENT ON COLUMN public.user_settings.supabase_token IS 'Supabase Management API access token';
COMMENT ON COLUMN public.user_settings.supabase_connected IS 'Whether user has connected Supabase account';
COMMENT ON COLUMN public.user_settings.supabase_project_url IS 'URL of the selected Supabase project';
COMMENT ON COLUMN public.user_settings.supabase_anon_key IS 'Anon/public key for the selected Supabase project';
COMMENT ON COLUMN public.user_settings.supabase_service_role_key IS 'Service role key for the selected Supabase project';
COMMENT ON COLUMN public.user_settings.supabase_selected_project_id IS 'ID of the currently selected Supabase project';
COMMENT ON COLUMN public.user_settings.supabase_selected_project_name IS 'Name of the currently selected Supabase project';