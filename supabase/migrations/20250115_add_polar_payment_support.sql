-- Add Polar payment system support to user_settings table
-- This allows users to pay via Polar as an alternative to Stripe

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS polar_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS polar_checkout_id TEXT,
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe' CHECK (payment_provider IN ('stripe', 'polar'));

-- Add comment for documentation
COMMENT ON COLUMN user_settings.polar_customer_id IS 'Polar customer ID for users who use Polar payment system';
COMMENT ON COLUMN user_settings.polar_checkout_id IS 'Most recent Polar checkout session ID';
COMMENT ON COLUMN user_settings.payment_provider IS 'Payment system used: stripe or polar';

-- Create index for Polar customer lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_polar_customer_id ON user_settings(polar_customer_id);

-- Add to wallet table as well for consistency
ALTER TABLE wallet
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe' CHECK (payment_provider IN ('stripe', 'polar'));

COMMENT ON COLUMN wallet.payment_provider IS 'Payment system used: stripe or polar';
