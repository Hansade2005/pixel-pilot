-- Netlify Integration
-- Run this after the other scripts

-- Add Netlify token column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS netlify_token TEXT;

-- Add Netlify deployment columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS netlify_site_id TEXT,
ADD COLUMN IF NOT EXISTS netlify_deployment_url TEXT;

-- Add index for netlify_token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_netlify_token ON profiles(netlify_token) WHERE netlify_token IS NOT NULL;

-- Add constraint to ensure netlify_token is not empty when present
ALTER TABLE profiles 
ADD CONSTRAINT check_netlify_token_not_empty 
CHECK (netlify_token IS NULL OR LENGTH(TRIM(netlify_token)) > 0);

-- Add function to safely update netlify token
CREATE OR REPLACE FUNCTION update_netlify_token(
  user_id UUID,
  new_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow users to update their own token
  IF auth.uid() != user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Update the token
  UPDATE profiles 
  SET 
    netlify_token = new_token,
    updated_at = NOW()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_netlify_token(UUID, TEXT) TO authenticated;

-- Update RLS policies to include netlify_token
-- (The existing policies should already cover this since they use auth.uid() = id)
