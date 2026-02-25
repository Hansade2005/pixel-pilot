-- Project Secrets Vault - encrypted environment variable storage
CREATE TABLE IF NOT EXISTS project_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  key TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'all' CHECK (environment IN ('production', 'preview', 'development', 'all')),
  description TEXT DEFAULT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NULL,
  sync_targets JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, project_id, key, environment)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_secrets_user_project ON project_secrets(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_secrets_env ON project_secrets(user_id, project_id, environment);

-- RLS
ALTER TABLE project_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own secrets"
  ON project_secrets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own secrets"
  ON project_secrets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own secrets"
  ON project_secrets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own secrets"
  ON project_secrets FOR DELETE USING (auth.uid() = user_id);

-- Secret Access Audit Log
CREATE TABLE IF NOT EXISTS secret_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secret_id UUID NOT NULL REFERENCES project_secrets(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'viewed', 'updated', 'deleted', 'synced')),
  ip_address TEXT DEFAULT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_secret_access_logs_user ON secret_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_secret_access_logs_secret ON secret_access_logs(secret_id);

ALTER TABLE secret_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON secret_access_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own audit logs"
  ON secret_access_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
