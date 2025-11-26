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

    // Fetch all AI team wallets with team info
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch teams and wallets separately, then join manually
    const { data: teams, error: teamsError } = await adminSupabase
      .from('ai_platform_teams')
      .select(`
        id,
        name,
        description,
        wallet_id,
        user_id,
        created_at,
        updated_at
      `)
      .order('updated_at', { ascending: false })

    if (teamsError) {
      console.error('Error fetching teams:', teamsError)
      return NextResponse.json({
        error: "Failed to fetch teams",
        details: teamsError.message
      }, { status: 500 })
    }

    // Get profile and wallet data for each team
    const teamsWithData = await Promise.all(
      (teams || []).map(async (team) => {
        // Get profile data
        const { data: profile, error: profileError } = await adminSupabase
          .from('profiles')
          .select('email, full_name, avatar_url')
          .eq('id', team.user_id)
          .single()

        if (profileError || !profile) {
          console.error('Error fetching profile for team:', team.id, profileError)
          return null
        }

        // Get wallet data if wallet_id exists
        let wallet = null
        if (team.wallet_id) {
          const { data: walletData, error: walletError } = await adminSupabase
            .from('ai_wallets')
            .select('id, balance, currency, created_at, updated_at')
            .eq('id', team.wallet_id)
            .single()

          if (walletError) {
            console.error('Error fetching wallet for team:', team.id, walletError)
          } else {
            wallet = walletData
          }
        }

        return {
          ...team,
          profiles: profile,
          ai_wallets: wallet
        }
      })
    )

    const validTeams = teamsWithData.filter(team => team !== null && team.ai_wallets && team.profiles)

    // Get transaction data for each team wallet
    const teamsWithTransactions = await Promise.all(
      validTeams.map(async (team: any) => {
        // Get total transaction count
        const { count: totalTransactions } = await adminSupabase
          .from('ai_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('wallet_id', team.wallet_id)

        // Get recent transactions (last 5)
        const { data: recentTransactions } = await adminSupabase
          .from('ai_transactions')
          .select('id, amount, type, description, created_at')
          .eq('wallet_id', team.wallet_id)
          .order('created_at', { ascending: false })
          .limit(5)

        // Convert amount to number for each transaction
        const processedTransactions = (recentTransactions || []).map((tx: any) => ({
          ...tx,
          amount: parseFloat(tx.amount)
        }))

        return {
          id: team.ai_wallets.id,
          team_id: team.id,
          team_name: team.name,
          team_description: team.description,
          balance: parseFloat(team.ai_wallets.balance),
          currency: team.ai_wallets.currency,
          created_at: team.ai_wallets.created_at,
          updated_at: team.ai_wallets.updated_at,
          owner: team.profiles,
          transactions: {
            total: totalTransactions || 0,
            recent: processedTransactions
          }
        }
      })
    )

    // Calculate stats
    const totalTeams = teamsWithTransactions.length
    const totalBalance = teamsWithTransactions.reduce((sum, team) => sum + team.balance, 0)
    const averageBalance = totalTeams > 0 ? totalBalance / totalTeams : 0
    const activeWallets = teamsWithTransactions.filter(team => team.balance > 0).length

    return NextResponse.json({
      wallets: teamsWithTransactions,
      stats: {
        totalUsers: totalTeams,
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