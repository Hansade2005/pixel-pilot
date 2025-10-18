-- Create user_settings table with subscription tracking
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  cloud_sync_enabled BOOLEAN DEFAULT false,
  last_backup TIMESTAMP WITH TIME ZONE,

  -- External service tokens
  vercel_token TEXT,
  github_token TEXT,
  netlify_token TEXT,

  -- Stripe subscription fields
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'canceled', 'past_due', 'trialing')),
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'teams', 'enterprise')),
  credits_remaining INTEGER DEFAULT 25,
  credits_used_this_month INTEGER DEFAULT 0,
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_settings table for global system configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_backups table
CREATE TABLE IF NOT EXISTS user_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  backup_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_backups_user_id ON user_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Set up Row Level Security (RLS)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_settings
CREATE POLICY "Users can view their own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies for user_settings (allow admin to manage all users)
CREATE POLICY "Admin can view all user settings" ON user_settings
  FOR SELECT USING (auth.jwt() ->> 'email' = 'hanscadx8@gmail.com');

CREATE POLICY "Admin can insert all user settings" ON user_settings
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'hanscadx8@gmail.com');

CREATE POLICY "Admin can update all user settings" ON user_settings
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'hanscadx8@gmail.com');

CREATE POLICY "Admin can delete all user settings" ON user_settings
  FOR DELETE USING (auth.jwt() ->> 'email' = 'hanscadx8@gmail.com');

-- Create policies for user_backups
CREATE POLICY "Users can view their own backups" ON user_backups
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own backups" ON user_backups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own backups" ON user_backups
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backups" ON user_backups
  FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin policies for profiles (allow admin to manage all profiles)
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (auth.jwt() ->> 'email' = 'hanscadx8@gmail.com');

CREATE POLICY "Admin can insert all profiles" ON profiles
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'hanscadx8@gmail.com');

CREATE POLICY "Admin can update all profiles" ON profiles
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'hanscadx8@gmail.com');

CREATE POLICY "Admin can delete all profiles" ON profiles
  FOR DELETE USING (auth.jwt() ->> 'email' = 'hanscadx8@gmail.com');

-- Create policies for system_settings
CREATE POLICY "Authenticated users can view system settings" ON system_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert system settings" ON system_settings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update system settings" ON system_settings
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT ALL ON user_settings TO authenticated;
GRANT ALL ON user_backups TO authenticated;
GRANT ALL ON system_settings TO authenticated;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for user_settings
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update updated_at for system_settings
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();