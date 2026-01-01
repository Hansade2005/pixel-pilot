-- Create leads email tracking table
CREATE TABLE IF NOT EXISTS leads_email_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_email TEXT NOT NULL UNIQUE,
  lead_name TEXT NOT NULL,
  segment TEXT NOT NULL CHECK (segment IN ('investor', 'creator', 'partner', 'user', 'other')),
  company TEXT,
  context TEXT,
  source TEXT,
  times_sent INTEGER DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_leads_email_tracking_email ON leads_email_tracking(lead_email);
CREATE INDEX idx_leads_email_tracking_segment ON leads_email_tracking(segment);
CREATE INDEX idx_leads_email_tracking_last_sent ON leads_email_tracking(last_sent_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_leads_email_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_email_tracking_updated_at
  BEFORE UPDATE ON leads_email_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_email_tracking_updated_at();

-- Enable RLS
ALTER TABLE leads_email_tracking ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (admin only)
CREATE POLICY "Admin users can manage leads email tracking"
  ON leads_email_tracking
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN (
        SELECT email FROM user_profiles WHERE role = 'admin'
      )
    )
  );

-- Comments
COMMENT ON TABLE leads_email_tracking IS 'Tracks email outreach to leads from leads.md';
COMMENT ON COLUMN leads_email_tracking.messages IS 'Array of sent messages with subject, content, timestamp';
