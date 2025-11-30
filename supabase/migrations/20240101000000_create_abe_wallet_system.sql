-- ABE (Account-Based Economy) Wallet System
-- Credit-based pricing: $1 = 1 credit, 0.25 credits per message

-- ============================================================================
-- WALLET TABLE - Store user credit balances and usage
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_balance integer NOT NULL DEFAULT 0 CHECK (credits_balance >= 0),
  credits_used_this_month integer NOT NULL DEFAULT 0,
  credits_used_total integer NOT NULL DEFAULT 0,
  last_reset_date date DEFAULT CURRENT_DATE,
  stripe_customer_id text,
  current_plan text DEFAULT 'free' CHECK (current_plan IN ('free', 'creator', 'collaborate', 'scale')),
  subscription_status text DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallet_user_id ON public.wallet(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_stripe_customer_id ON public.wallet(stripe_customer_id);

-- RLS Policies for wallet
ALTER TABLE public.wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallet
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet" ON public.wallet
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet" ON public.wallet
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- USAGE_LOGS TABLE - Track all AI request usage
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model text NOT NULL,
  credits_used numeric(4,2) NOT NULL,
  request_type text NOT NULL,
  endpoint text,
  tokens_used integer,
  response_time_ms integer,
  status text DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout')),
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON public.usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created ON public.usage_logs(user_id, created_at DESC);

-- RLS Policies for usage_logs
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage logs" ON public.usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage logs" ON public.usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TRANSACTIONS TABLE - Track all credit transactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('subscription_grant', 'purchase', 'usage', 'bonus', 'refund', 'adjustment', 'monthly_reset')),
  description text NOT NULL,
  credits_before integer NOT NULL,
  credits_after integer NOT NULL,
  stripe_payment_id text,
  stripe_subscription_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for transaction history
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON public.transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- RLS Policies for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically create wallet for new users
CREATE OR REPLACE FUNCTION public.create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallet (user_id, credits_balance, current_plan)
  VALUES (NEW.id, 20, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create wallet on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_wallet();

-- Function to update wallet updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallet_updated_at ON public.wallet;
CREATE TRIGGER wallet_updated_at
  BEFORE UPDATE ON public.wallet
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_updated_at();

-- Function to handle monthly credit resets
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS void AS $$
DECLARE
  plan_credits INTEGER;
BEGIN
  -- Reset monthly usage for wallets that haven't been reset this month
  UPDATE public.wallet
  SET 
    credits_used_this_month = 0,
    last_reset_date = CURRENT_DATE,
    -- Grant monthly credits based on plan
    credits_balance = CASE
      WHEN current_plan = 'free' THEN 20
      WHEN current_plan = 'creator' THEN credits_balance + 50
      WHEN current_plan = 'collaborate' THEN credits_balance + 75
      WHEN current_plan = 'scale' THEN credits_balance + 150
      ELSE credits_balance
    END
  WHERE last_reset_date < DATE_TRUNC('month', CURRENT_DATE);
  
  -- Log the reset transactions
  INSERT INTO public.transactions (user_id, amount, type, description, credits_before, credits_after)
  SELECT 
    w.user_id,
    CASE
      WHEN w.current_plan = 'free' THEN 20
      WHEN w.current_plan = 'creator' THEN 50
      WHEN w.current_plan = 'collaborate' THEN 75
      WHEN w.current_plan = 'scale' THEN 150
      ELSE 0
    END,
    'monthly_reset',
    'Monthly credit grant for ' || w.current_plan || ' plan',
    w.credits_balance - CASE
      WHEN w.current_plan = 'free' THEN 20
      WHEN w.current_plan = 'creator' THEN 50
      WHEN w.current_plan = 'collaborate' THEN 75
      WHEN w.current_plan = 'scale' THEN 150
      ELSE 0
    END,
    w.credits_balance
  FROM public.wallet w
  WHERE w.last_reset_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.wallet TO authenticated;
GRANT SELECT, INSERT ON public.usage_logs TO authenticated;
GRANT SELECT, INSERT ON public.transactions TO authenticated;

-- Grant access to service role for backend operations
GRANT ALL ON public.wallet TO service_role;
GRANT ALL ON public.usage_logs TO service_role;
GRANT ALL ON public.transactions TO service_role;

COMMENT ON TABLE public.wallet IS 'User wallet balances and credit tracking';
COMMENT ON TABLE public.usage_logs IS 'AI API usage logs for billing and analytics';
COMMENT ON TABLE public.transactions IS 'Credit transaction history for audit trail';
COMMENT ON FUNCTION public.reset_monthly_credits() IS 'Reset monthly credit usage and grant new credits based on plan';
