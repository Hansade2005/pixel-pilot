-- Create enterprise demo requests table
CREATE TABLE IF NOT EXISTS enterprise_demo_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  company_size TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'scheduled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create enterprise contact requests table
CREATE TABLE IF NOT EXISTS enterprise_contact_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'qualified', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create enterprise proposal requests table
CREATE TABLE IF NOT EXISTS enterprise_proposal_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  company_size TEXT NOT NULL,
  requirements TEXT NOT NULL,
  timeline TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'sent', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON enterprise_demo_requests(status);
CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON enterprise_demo_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON enterprise_demo_requests(email);

CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON enterprise_contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON enterprise_contact_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_requests_email ON enterprise_contact_requests(email);

CREATE INDEX IF NOT EXISTS idx_proposal_requests_status ON enterprise_proposal_requests(status);
CREATE INDEX IF NOT EXISTS idx_proposal_requests_created_at ON enterprise_proposal_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposal_requests_email ON enterprise_proposal_requests(email);

-- Enable Row Level Security (RLS)
ALTER TABLE enterprise_demo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_proposal_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for demo requests (allow inserts for anyone, but only authenticated users can read)
CREATE POLICY "Allow demo request inserts for all users" ON enterprise_demo_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow demo request reads for authenticated users" ON enterprise_demo_requests
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create policies for contact requests
CREATE POLICY "Allow contact request inserts for all users" ON enterprise_contact_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow contact request reads for authenticated users" ON enterprise_contact_requests
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create policies for proposal requests
CREATE POLICY "Allow proposal request inserts for all users" ON enterprise_proposal_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow proposal request reads for authenticated users" ON enterprise_proposal_requests
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_demo_requests_updated_at
  BEFORE UPDATE ON enterprise_demo_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_requests_updated_at
  BEFORE UPDATE ON enterprise_contact_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposal_requests_updated_at
  BEFORE UPDATE ON enterprise_proposal_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
