-- Add connection state tracking to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS github_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vercel_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS netlify_connected BOOLEAN DEFAULT false;

-- Add deployment tracking fields
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS deployments_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_deployment_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS github_pushes_this_month INTEGER DEFAULT 0;

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_user_settings_github_connected ON user_settings(github_connected);
CREATE INDEX IF NOT EXISTS idx_user_settings_vercel_connected ON user_settings(vercel_connected);
CREATE INDEX IF NOT EXISTS idx_user_settings_netlify_connected ON user_settings(netlify_connected);