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

    const walletId = params.walletId
    const { amount, reason, type } = await request.json()

    if (!amount || !reason) {
      return NextResponse.json({ error: "Amount and reason are required" }, { status: 400 })
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get current wallet state
    const { data: wallet, error: walletError } = await adminSupabase
      .from('wallet')
      .select('user_id, credits_balance')
      .eq('id', walletId)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    const newBalance = Math.max(0, wallet.credits_balance + amount)

    // Update wallet balance
    const { error: updateError } = await adminSupabase
      .from('wallet')
      .update({ credits_balance: newBalance })
      .eq('id', walletId)

    if (updateError) {
      console.error('Error updating wallet:', updateError)
      return NextResponse.json({ error: "Failed to update wallet" }, { status: 500 })
    }

    // Log the transaction
    const { error: transactionError } = await adminSupabase
      .from('transactions')
      .insert({
        user_id: wallet.user_id,
        amount: amount,
        type: type || 'adjustment',
        description: reason,
        credits_before: wallet.credits_balance,
        credits_after: newBalance
      })

    if (transactionError) {
      console.error('Error logging transaction:', transactionError)
      // Don't fail the request if transaction logging fails
    }

    return NextResponse.json({
      success: true,
      new_balance: newBalance,
      adjustment: amount
    })

  } catch (error) {
    console.error('Error adjusting credit balance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}