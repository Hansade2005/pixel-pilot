-- Add deployment-related columns to projects table
ALTER TABLE projects 
ADD COLUMN github_repo_url TEXT,
ADD COLUMN github_repo_name TEXT,
ADD COLUMN vercel_project_id TEXT,
ADD COLUMN vercel_deployment_url TEXT,
ADD COLUMN deployment_status TEXT DEFAULT 'not_deployed' CHECK (deployment_status IN ('not_deployed', 'in_progress', 'deployed', 'failed'));

-- Add token storage columns to profiles table
ALTER TABLE profiles 
ADD COLUMN github_token TEXT,
ADD COLUMN vercel_token TEXT;

-- Create indexes for better performance
CREATE INDEX idx_projects_deployment_status ON projects(deployment_status);
CREATE INDEX idx_projects_github_repo ON projects(github_repo_url);
CREATE INDEX idx_projects_vercel_deployment ON projects(vercel_deployment_url);
