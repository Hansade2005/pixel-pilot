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

    const { data: teams, error: teamsError } = await adminSupabase
      .from('ai_platform_teams')
      .select(`
        id,
        name,
        description,
        wallet_id,
        created_at,
        updated_at,
        ai_wallets!wallet_id (
          id,
          balance,
          currency,
          created_at,
          updated_at
        ),
        profiles:user_id (
          email,
          full_name,
          avatar_url
        )
      `)
      .order('updated_at', { ascending: false })

    if (teamsError) {
      console.error('Error fetching team wallets:', teamsError)
      return NextResponse.json({
        error: "Failed to fetch team wallets",
        details: teamsError.message
      }, { status: 500 })
    }

    // Get transaction data for each team wallet
    const teamsWithTransactions = await Promise.all(
      (teams || []).filter(team => team.ai_wallets && team.ai_wallets.length > 0).map(async (team) => {
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

        return {
          id: team.ai_wallets[0].id,
          team_id: team.id,
          team_name: team.name,
          team_description: team.description,
          balance: team.ai_wallets[0].balance,
          currency: team.ai_wallets[0].currency,
          created_at: team.ai_wallets[0].created_at,
          updated_at: team.ai_wallets[0].updated_at,
          owner: team.profiles,
          transactions: {
            total: totalTransactions || 0,
            recent: recentTransactions || []
          }
        }
      })
    )

    // Calculate stats
    const totalTeams = teamsWithTransactions.length
    const totalBalance = teamsWithTransactions.reduce((sum, team) => sum + parseFloat(team.balance), 0)
    const averageBalance = totalTeams > 0 ? totalBalance / totalTeams : 0
    const activeWallets = teamsWithTransactions.filter(team => parseFloat(team.balance) > 0).length

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