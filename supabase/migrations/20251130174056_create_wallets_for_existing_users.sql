-- Migration: Create wallets for existing users
-- This migration ensures all existing users have wallets created

-- Insert wallets for users who don't have them yet
INSERT INTO public.wallet (user_id, credits_balance, current_plan)
SELECT
  u.id as user_id,
  20 as credits_balance, -- Free users get 20 credits
  'free' as current_plan
FROM auth.users u
LEFT JOIN public.wallet w ON u.id = w.user_id
WHERE w.user_id IS NULL;

-- Log the wallet creation transactions
INSERT INTO public.transactions (user_id, amount, type, description, credits_before, credits_after)
SELECT
  u.id,
  20,
  'subscription_grant',
  'Initial wallet creation for existing user',
  0,
  20
FROM auth.users u
LEFT JOIN public.wallet w ON u.id = w.user_id
WHERE w.user_id IS NULL;

-- Update the comment to reflect this migration
COMMENT ON TABLE public.wallet IS 'User wallet balances and credit tracking - wallets auto-created for all users';