-- PiPilot Sites Tracking Database Schema
-- Run these SQL commands in your hosting Supabase project

-- Sites table - tracks all hosted sites
CREATE TABLE sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_slug VARCHAR(255) UNIQUE NOT NULL,
  original_slug VARCHAR(255), -- Original requested slug (if different from final)
  auth_user_id VARCHAR(255) NOT NULL, -- From main app auth
  auth_username VARCHAR(255) NOT NULL, -- From main app auth
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_views BIGINT DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}' -- Store additional site info
);

-- Site views table - detailed analytics (optional, for advanced tracking)
CREATE TABLE site_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  referrer TEXT,
  ip_hash VARCHAR(64), -- Anonymized IP for analytics
  country VARCHAR(2),
  device_type VARCHAR(20) -- mobile, desktop, tablet
);

-- Indexes for performance
CREATE INDEX idx_sites_project_slug ON sites(project_slug);
CREATE INDEX idx_sites_auth_user_id ON sites(auth_user_id);
CREATE INDEX idx_sites_created_at ON sites(created_at DESC);
CREATE INDEX idx_site_views_site_id ON site_views(site_id);
CREATE INDEX idx_site_views_viewed_at ON site_views(viewed_at DESC);

-- RLS Policies
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_views ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for your API)
CREATE POLICY "Service role can do anything" ON sites
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do anything" ON site_views
  FOR ALL USING (auth.role() = 'service_role');

-- Optional: Allow public read access for view tracking
CREATE POLICY "Public can insert views" ON site_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read sites for domain check" ON sites
  FOR SELECT USING (true);

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_site_views(site_slug VARCHAR(255))
RETURNS VOID AS $$
BEGIN
  UPDATE sites
  SET
    total_views = total_views + 1,
    last_viewed_at = NOW(),
    updated_at = NOW()
  WHERE project_slug = site_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to check domain availability
CREATE OR REPLACE FUNCTION is_domain_available(check_slug VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM sites
    WHERE project_slug = check_slug
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;