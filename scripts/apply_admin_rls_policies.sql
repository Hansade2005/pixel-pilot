-- Apply Admin RLS Policies for User Management
-- Run this in your Supabase SQL Editor

-- Admin policies for user_settings (allow admin to manage all users)
DROP POLICY IF EXISTS "Admin can view all user settings" ON user_settings;
DROP POLICY IF EXISTS "Admin can insert all user settings" ON user_settings;
DROP POLICY IF EXISTS "Admin can update all user settings" ON user_settings;
DROP POLICY IF EXISTS "Admin can delete all user settings" ON user_settings;

CREATE POLICY "Admin can view all user settings" ON user_settings
  FOR SELECT USING (auth.jwt() ->> 'email' = 'hanscadx8@gmail.com');

CREATE POLICY "Admin can insert all user settings" ON user_settings
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'hanscadx8@gmail.com');

CREATE POLICY "Admin can update all user settings" ON user_settings
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'hanscadx8@gmail.com');

CREATE POLICY "Admin can delete all user settings" ON user_settings
  FOR DELETE USING (auth.jwt() ->> 'email' = 'hanscadx8@gmail.com');

-- Enable RLS for profiles table and create admin policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can insert all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can delete all profiles" ON profiles;

-- Regular user policies
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

-- Grant permissions
GRANT ALL ON profiles TO authenticated;
