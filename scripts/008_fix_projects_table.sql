-- Fix missing projects table with required slug column
-- This script creates the projects table that's missing from the current schema

-- Drop the table if it exists (to avoid conflicts)
DROP TABLE IF EXISTS public.projects CASCADE;

-- Create the projects table with all required columns
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,   -- URL-friendly project identifier (REQUIRED)
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT FALSE,
  is_template BOOLEAN DEFAULT FALSE,  -- Indicates if this is a template project
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Deployment tracking
  github_repo_url TEXT,
  github_repo_name TEXT,
  vercel_project_id TEXT,
  vercel_deployment_url TEXT,
  netlify_site_id TEXT,
  netlify_deployment_url TEXT,
  deployment_status TEXT DEFAULT 'not_deployed' CHECK (
    deployment_status IN ('not_deployed', 'in_progress', 'deployed', 'failed')
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_deployment_status ON public.projects(deployment_status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for projects
CREATE POLICY "Users can view their own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- Create a function to generate slugs from project names
CREATE OR REPLACE FUNCTION generate_project_slug(project_name TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  RETURN lower(regexp_replace(regexp_replace(project_name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically generate slug if not provided
CREATE OR REPLACE FUNCTION set_project_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- If slug is not provided, generate one from the name
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_project_slug(NEW.name);
    
    -- Ensure uniqueness by appending a number if needed
    WHILE EXISTS (SELECT 1 FROM public.projects WHERE slug = NEW.slug AND id != NEW.id) LOOP
      NEW.slug := NEW.slug || '-' || floor(random() * 1000)::text;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_set_project_slug
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION set_project_slug();

-- Create a function to update project activity
CREATE OR REPLACE FUNCTION update_project_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the last_activity timestamp when files are modified
  UPDATE public.projects 
  SET last_activity = NOW() 
  WHERE id = NEW.project_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON public.projects TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
