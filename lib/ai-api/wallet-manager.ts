import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get or create wallet for a user
 */
export async function getOrCreateWallet(userId: string) {
  try {
    // Try to get existing wallet
    let { data: wallet, error } = await supabase
      .from('ai_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Create if doesn't exist
    if (error && error.code === 'PGRST116') {
      const { data: newWallet, error: createError } = await supabase
        .from('ai_wallets')
        .insert({
          user_id: userId,
          balance: 0.00,
          currency: 'USD',
        })
        .select()
        .single();

      if (createError) throw createError;
      wallet = newWallet;
    } else if (error) {
      throw error;
    }

    return wallet;
  } catch (error) {
    console.error('Error getting/creating wallet:', error);
    return null;
  }
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(userId: string): Promise<number | null> {
  try {
    const wallet = await getOrCreateWallet(userId);
    return wallet ? parseFloat(wallet.balance) : null;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return null;
  }
}

/**
 * Add credits to wallet (topup, bonus, refund)
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: 'topup' | 'bonus' | 'refund' | 'adjustment',
  description: string,
  metadata?: any
): Promise<boolean> {
  try {
    // Get wallet
    const wallet = await getOrCreateWallet(userId);
    if (!wallet) throw new Error('Wallet not found');

    const balanceBefore = parseFloat(wallet.balance);
    const balanceAfter = balanceBefore + amount;

    // Update wallet balance
    const { error: walletError } = await supabase
      .from('ai_wallets')
      .update({ balance: balanceAfter })
      .eq('id', wallet.id);

    if (walletError) throw walletError;

    // Log transaction
    const { error: txError } = await supabase
      .from('ai_transactions')
      .insert({
        user_id: userId,
        wallet_id: wallet.id,
        amount,
        type,
        description,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        metadata: metadata || {},
      });

    if (txError) throw txError;

    return true;
  } catch (error) {
    console.error('Error adding credits:', error);
    return false;
  }
}

/**
 * Deduct credits for API usage
 */
export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  metadata?: any
): Promise<{ success: boolean; newBalance?: number }> {
  try {
    // Get wallet
    const wallet = await getOrCreateWallet(userId);
    if (!wallet) throw new Error('Wallet not found');

    const balanceBefore = parseFloat(wallet.balance);
    
    // Check if sufficient balance
    if (balanceBefore < amount) {
      return { success: false };
    }

    const balanceAfter = balanceBefore - amount;

    // Update wallet balance
    const { error: walletError } = await supabase
      .from('ai_wallets')
      .update({ balance: balanceAfter })
      .eq('id', wallet.id);

    if (walletError) throw walletError;

    // Log transaction
    const { error: txError } = await supabase
      .from('ai_transactions')
      .insert({
        user_id: userId,
        wallet_id: wallet.id,
        amount: -amount, // Negative for deduction
        type: 'usage',
        description,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        metadata: metadata || {},
      });

    if (txError) throw txError;

    return { success: true, newBalance: balanceAfter };
  } catch (error) {
    console.error('Error deducting credits:', error);
    return { success: false };
  }
}

/**
 * Get transaction history
 */
export async function getTransactions(
  userId: string,
  options?: { limit?: number; offset?: number }
) {
  try {
    let query = supabase
      .from('ai_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
}

/**
 * Set wallet balance (admin only)
 */
export async function setWalletBalance(
  userId: string,
  newBalance: number,
  description: string,
  adminUserId: string
): Promise<boolean> {
  try {
    const wallet = await getOrCreateWallet(userId);
    if (!wallet) throw new Error('Wallet not found');

    const balanceBefore = parseFloat(wallet.balance);
    const difference = newBalance - balanceBefore;

    // Update wallet
    const { error: walletError } = await supabase
      .from('ai_wallets')
      .update({ balance: newBalance })
      .eq('id', wallet.id);

    if (walletError) throw walletError;

    // Log transaction
    const { error: txError } = await supabase
      .from('ai_transactions')
      .insert({
        user_id: userId,
        wallet_id: wallet.id,
        amount: difference,
        type: 'adjustment',
        description: `${description} (Admin: ${adminUserId})`,
        balance_before: balanceBefore,
        balance_after: newBalance,
        metadata: { admin_user_id: adminUserId },
      });

    if (txError) throw txError;

    return true;
  } catch (error) {
    console.error('Error setting wallet balance:', error);
    return false;
  }
}
