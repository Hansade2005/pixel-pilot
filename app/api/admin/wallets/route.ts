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

    // Fetch all AI wallets with user info
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: wallets, error: walletsError } = await adminSupabase
      .from('ai_wallets')
      .select(`
        id,
        user_id,
        balance,
        currency,
        created_at,
        updated_at,
        profiles:user_id (
          email,
          full_name,
          avatar_url
        )
      `)
      .order('updated_at', { ascending: false })

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError)
      return NextResponse.json({
        error: "Failed to fetch wallets",
        details: walletsError.message
      }, { status: 500 })
    }

    // Get transaction data for each wallet
    const walletsWithTransactions = await Promise.all(
      (wallets || []).map(async (wallet) => {
        // Get total transaction count
        const { count: totalTransactions } = await adminSupabase
          .from('ai_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('wallet_id', wallet.id)

        // Get recent transactions (last 5)
        const { data: recentTransactions } = await adminSupabase
          .from('ai_transactions')
          .select('id, amount, type, description, created_at')
          .eq('wallet_id', wallet.id)
          .order('created_at', { ascending: false })
          .limit(5)

        return {
          ...wallet,
          transactions: {
            total: totalTransactions || 0,
            recent: recentTransactions || []
          }
        }
      })
    )

    // Calculate stats
    const totalUsers = walletsWithTransactions.length
    const totalBalance = walletsWithTransactions.reduce((sum, wallet) => sum + parseFloat(wallet.balance), 0)
    const averageBalance = totalUsers > 0 ? totalBalance / totalUsers : 0
    const activeWallets = walletsWithTransactions.filter(wallet => parseFloat(wallet.balance) > 0).length

    return NextResponse.json({
      wallets: walletsWithTransactions,
      stats: {
        totalUsers,
        totalBalance,
        averageBalance,
        activeWallets
      }
    })

  } catch (error) {
    console.error('Error in admin wallets API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}