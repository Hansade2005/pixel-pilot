-- GitHub and Vercel Authentication Improvements
-- Run this after the other scripts

-- Add indexes for token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_github_token ON profiles(github_token) WHERE github_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_vercel_token ON profiles(vercel_token) WHERE vercel_token IS NOT NULL;

-- Add constraints to ensure tokens are not empty when present
ALTER TABLE profiles 
ADD CONSTRAINT check_github_token_not_empty 
CHECK (github_token IS NULL OR LENGTH(TRIM(github_token)) > 0);

ALTER TABLE profiles 
ADD CONSTRAINT check_vercel_token_not_empty 
CHECK (vercel_token IS NULL OR LENGTH(TRIM(vercel_token)) > 0);

-- Add function to safely update github token
CREATE OR REPLACE FUNCTION update_github_token(
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
    github_token = new_token,
    updated_at = NOW()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$;

-- Add function to safely update vercel token
CREATE OR REPLACE FUNCTION update_vercel_token(
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
    vercel_token = new_token,
    updated_at = NOW()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_github_token(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_vercel_token(UUID, TEXT) TO authenticated;

-- Add RLS policy for token access
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can read their own tokens" ON profiles;
DROP POLICY IF EXISTS "Users can update their own tokens" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Policy to allow users to read their own tokens
CREATE POLICY "Users can read their own tokens" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy to allow users to update their own tokens
CREATE POLICY "Users can update their own tokens" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy to allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
