-- Create API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id INTEGER NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL, -- First 12 chars for display (e.g., "sk_live_xxx")
  name TEXT NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rate_limit INTEGER DEFAULT 1000, -- Requests per hour
  is_active BOOLEAN DEFAULT true
);

-- Create index for faster lookups
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_database_id ON api_keys(database_id);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- Row Level Security Policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only manage API keys for their own databases
CREATE POLICY "Users can view their own database API keys"
  ON api_keys
  FOR SELECT
  USING (
    database_id IN (
      SELECT id FROM databases WHERE user_id = (auth.uid())::text
    )
  );

CREATE POLICY "Users can create API keys for their databases"
  ON api_keys
  FOR INSERT
  WITH CHECK (
    database_id IN (
      SELECT id FROM databases WHERE user_id = (auth.uid())::text
    )
  );

CREATE POLICY "Users can delete their database API keys"
  ON api_keys
  FOR DELETE
  USING (
    database_id IN (
      SELECT id FROM databases WHERE user_id = (auth.uid())::text
    )
  );

CREATE POLICY "Users can update their database API keys"
  ON api_keys
  FOR UPDATE
  USING (
    database_id IN (
      SELECT id FROM databases WHERE user_id = (auth.uid())::text
    )
  );

-- Create API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for usage queries
CREATE INDEX idx_api_usage_api_key_id ON api_usage(api_key_id);
CREATE INDEX idx_api_usage_created_at ON api_usage(created_at);

-- Enable RLS
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Users can view usage for their API keys
CREATE POLICY "Users can view their API usage"
  ON api_usage
  FOR SELECT
  USING (
    api_key_id IN (
      SELECT ak.id FROM api_keys ak
      INNER JOIN databases d ON ak.database_id = d.id
      WHERE d.user_id = (auth.uid())::text
    )
  );

COMMENT ON TABLE api_keys IS 'API keys for external application access to databases';
COMMENT ON TABLE api_usage IS 'Tracks API usage for rate limiting and analytics';
