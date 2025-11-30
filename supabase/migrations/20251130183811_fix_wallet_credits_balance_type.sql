-- Fix credits_balance column to allow decimal values
-- Since CREDITS_PER_MESSAGE = 0.25, we need to support fractional credits

ALTER TABLE public.wallet
ALTER COLUMN credits_balance TYPE numeric(10,2);

-- Also update the check constraint to allow decimal values >= 0
ALTER TABLE public.wallet
DROP CONSTRAINT IF EXISTS wallet_credits_balance_check;

ALTER TABLE public.wallet
ADD CONSTRAINT wallet_credits_balance_check CHECK (credits_balance >= 0);

-- Update any existing integer values to numeric
-- This is a no-op since PostgreSQL handles the conversion automatically