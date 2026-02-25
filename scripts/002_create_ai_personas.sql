-- AI Personas table - stores custom AI personality/instruction sets per user
CREATE TABLE IF NOT EXISTS ai_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instructions TEXT NOT NULL,
  project_id TEXT DEFAULT NULL,  -- NULL = global persona, set = project-specific
  icon TEXT DEFAULT 'bot',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_ai_personas_user_id ON ai_personas(user_id);

-- Index for project-specific persona lookup
CREATE INDEX IF NOT EXISTS idx_ai_personas_project ON ai_personas(user_id, project_id);

-- RLS policies
ALTER TABLE ai_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own personas"
  ON ai_personas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own personas"
  ON ai_personas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own personas"
  ON ai_personas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own personas"
  ON ai_personas FOR DELETE
  USING (auth.uid() = user_id);

-- Project Snapshots table - stores point-in-time snapshots of project file state
CREATE TABLE IF NOT EXISTS project_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  file_count INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  files JSONB NOT NULL DEFAULT '[]',  -- Array of {path, content, size} objects
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_project_snapshots_user_project ON project_snapshots(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_snapshots_created ON project_snapshots(created_at DESC);

-- RLS policies
ALTER TABLE project_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots"
  ON project_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own snapshots"
  ON project_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots"
  ON project_snapshots FOR DELETE
  USING (auth.uid() = user_id);
