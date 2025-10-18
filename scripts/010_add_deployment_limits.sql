-- Migration: Add deployment limits and usage tracking columns to user_settings table

-- Add deployment tracking columns to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS deployments_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS github_pushes_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_deployment_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create usage_records table for tracking all usage
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  platform TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for usage_records
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage records
CREATE POLICY "Users can view own usage records" ON usage_records
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own usage records
CREATE POLICY "Users can insert own usage records" ON usage_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_usage_records_user_id_created_at
  ON usage_records(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_records_operation
  ON usage_records(operation);

-- Update existing user_settings records to have default values
UPDATE user_settings
SET deployments_this_month = 0,
    github_pushes_this_month = 0,
    last_deployment_reset = NOW()
WHERE deployments_this_month IS NULL;
