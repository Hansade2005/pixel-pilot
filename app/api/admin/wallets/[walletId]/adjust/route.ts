import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@/lib/supabase/server"
import { checkAdminAccess } from '@/lib/admin-utils'
import { createClient as createAdminClient } from "@supabase/supabase-js"

export async function POST(
  request: NextRequest,
  { params }: { params: { walletId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!checkAdminAccess(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { amount, reason, type } = await request.json()

    if (!amount || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Amount is required and must be a number' }, { status: 400 })
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const walletId = params.walletId

    // Get current wallet balance
    const { data: wallet, error: walletError } = await adminSupabase
      .from('ai_wallets')
      .select('balance, user_id')
      .eq('id', walletId)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const newBalance = parseFloat(wallet.balance) + amount

    // Prevent negative balances
    if (newBalance < 0) {
      return NextResponse.json({ error: 'Balance cannot be negative' }, { status: 400 })
    }

    // Update wallet balance
    const { error: updateError } = await adminSupabase
      .from('ai_wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', walletId)

    if (updateError) {
      console.error('Error updating wallet balance:', updateError)
      return NextResponse.json({ error: 'Failed to update wallet balance' }, { status: 500 })
    }

    // Record the transaction
    const { error: transactionError } = await adminSupabase
      .from('ai_transactions')
      .insert({
        wallet_id: walletId,
        user_id: wallet.user_id,
        amount: Math.abs(amount),
        type: 'adjustment',
        description: `Admin adjustment: ${reason}`,
        balance_before: parseFloat(wallet.balance),
        balance_after: newBalance,
        metadata: {
          admin_reason: reason,
          adjustment_type: type || 'admin_adjustment',
          admin_user_id: user.id
        }
      })

    if (transactionError) {
      console.error('Error recording transaction:', transactionError)
      // Don't fail the request if transaction logging fails
    }

    return NextResponse.json({
      success: true,
      previous_balance: wallet.balance,
      new_balance: newBalance,
      adjustment: amount
    })

  } catch (error) {
    console.error('Error in wallet adjustment API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}