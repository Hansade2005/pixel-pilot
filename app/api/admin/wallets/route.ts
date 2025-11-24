import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAccess } from '@/lib/admin-utils'

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !checkAdminAccess(user)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all user wallets with user info and transaction counts
    const { data: wallets, error } = await supabase
      .from('ai_wallets')
      .select(`
        id,
        user_id,
        balance,
        created_at,
        updated_at,
        profiles:user_id (
          email,
          full_name,
          avatar_url
        )
      `)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching wallets:', error)
      return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 })
    }

    // Get transaction counts and recent transactions for each wallet
    const walletsWithTransactions = await Promise.all(
      (wallets || []).map(async (wallet) => {
        // Get total transactions count
        const { count: totalTransactions } = await supabase
          .from('ai_wallet_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('wallet_id', wallet.id)

        // Get recent transactions
        const { data: recentTransactions } = await supabase
          .from('ai_wallet_transactions')
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
    const totalBalance = walletsWithTransactions.reduce((sum, wallet) => sum + wallet.balance, 0)
    const averageBalance = totalUsers > 0 ? totalBalance / totalUsers : 0
    const activeWallets = walletsWithTransactions.filter(wallet => wallet.balance > 0).length

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