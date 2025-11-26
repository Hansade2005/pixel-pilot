import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@/lib/supabase/server"
import { checkAdminAccess } from '@/lib/admin-utils'
import { createClient as createAdminClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!checkAdminAccess(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Fetch all transactions with user info
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: transactions, error: transactionsError } = await adminSupabase
      .from('ai_transactions')
      .select(`
        id,
        wallet_id,
        user_id,
        amount,
        type,
        description,
        balance_before,
        balance_after,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(1000) // Limit to prevent huge responses

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return NextResponse.json({
        error: "Failed to fetch transactions",
        details: transactionsError.message
      }, { status: 500 })
    }

    // Add user data to each transaction
    const transactionsWithUsers = await Promise.all(
      (transactions || []).map(async (transaction) => {
        const { data: profile, error: profileError } = await adminSupabase
          .from('profiles')
          .select('email, full_name, avatar_url')
          .eq('id', transaction.user_id)
          .single()

        return {
          ...transaction,
          amount: parseFloat(transaction.amount),
          balance_before: transaction.balance_before ? parseFloat(transaction.balance_before) : null,
          balance_after: transaction.balance_after ? parseFloat(transaction.balance_after) : null,
          user: profile || null
        }
      })
    )

    return NextResponse.json({
      transactions: transactionsWithUsers,
      total: transactionsWithUsers.length
    })

  } catch (error) {
    console.error('Error in admin transactions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}