-- Add foreign key relationship from user_settings to profiles
-- This allows Supabase PostgREST to automatically join these tables

-- First, ensure the profiles table exists and has the same user_id structure
-- The profiles table should have id column that matches auth.users(id)

-- Add a comment to help PostgREST understand the relationship
COMMENT ON COLUMN user_settings.user_id IS 'Foreign key to profiles.id';

-- You can also create a view to make joins easier
CREATE OR REPLACE VIEW user_settings_with_profile AS
SELECT 
  us.*,
  p.email,
  p.full_name,
  p.avatar_url
FROM user_settings us
LEFT JOIN profiles p ON us.user_id = p.id;

-- Grant access to the view
GRANT SELECT ON user_settings_with_profile TO authenticated;
GRANT SELECT ON user_settings_with_profile TO service_role;

-- Create an index for better join performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id_profiles ON user_settings(user_id);

COMMENT ON VIEW user_settings_with_profile IS 'User settings joined with profile data for easier queries';
