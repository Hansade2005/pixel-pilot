-- Fix schema issues and add missing functionality
-- Run this after the previous migration scripts

-- 1. Fix the files table to match what the chat route expects
-- Add a 'type' column as an alias for 'file_type' for backward compatibility
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS type TEXT;
UPDATE public.files SET type = file_type WHERE type IS NULL;
ALTER TABLE public.files ALTER COLUMN type SET NOT NULL;
ALTER TABLE public.files ALTER COLUMN type SET DEFAULT 'text';

-- 2. Create folders table for better project organization
CREATE TABLE IF NOT EXISTS public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  parent_folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, path)
);

-- 3. Add missing columns to files table for better organization
ALTER TABLE public.files 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS size BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_directory BOOLEAN DEFAULT FALSE;

-- 4. Add missing columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Enhance chat_sessions table
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 6. Add missing columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_files_project_path ON public.files(project_id, path);
CREATE INDEX IF NOT EXISTS idx_files_folder ON public.files(folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_project_path ON public.folders(project_id, path);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_active ON public.chat_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_messages_session_created ON public.messages(chat_session_id, created_at);

-- 8. Enable RLS on new tables
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for folders
CREATE POLICY "Users can view folders in their projects" ON public.folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = folders.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create folders in their projects" ON public.folders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = folders.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update folders in their projects" ON public.folders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = folders.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete folders in their projects" ON public.folders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = folders.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- 10. Create function to update project last_activity
CREATE OR REPLACE FUNCTION public.update_project_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.projects 
  SET last_activity = NOW() 
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$;

-- 11. Create trigger to update project activity on file changes
DROP TRIGGER IF EXISTS on_file_activity ON public.files;
CREATE TRIGGER on_file_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_activity();

-- 12. Create function to generate project slugs
CREATE OR REPLACE FUNCTION public.generate_project_slug(project_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Convert to lowercase and replace spaces/special chars with hyphens
  base_slug := LOWER(REGEXP_REPLACE(project_name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g');
  base_slug := TRIM(BOTH '-' FROM base_slug);
  
  final_slug := base_slug;
  
  -- Check if slug exists and append number if needed
  WHILE EXISTS (SELECT 1 FROM public.projects WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- 13. Update existing projects to have slugs
UPDATE public.projects 
SET slug = public.generate_project_slug(name) 
WHERE slug IS NULL;

-- 14. Create constraint to ensure all projects have slugs
ALTER TABLE public.projects ALTER COLUMN slug SET NOT NULL;

-- 15. Add comments for documentation
COMMENT ON TABLE public.folders IS 'Project folder structure for better organization';
COMMENT ON TABLE public.files IS 'Project files with content and metadata';
COMMENT ON TABLE public.projects IS 'User projects with deployment tracking';
COMMENT ON TABLE public.chat_sessions IS 'AI chat conversation sessions';
COMMENT ON TABLE public.messages IS 'Individual chat messages with metadata';
