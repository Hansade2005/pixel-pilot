import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@/lib/supabase/server"
import { checkAdminAccess } from '@/lib/admin-utils'
import { createClient as createAdminClient } from "@supabase/supabase-js"

/**
 * GET /api/admin/marketplace/payouts
 * Get all pending payout requests for admin review
 * Includes filtering and sorting
 */
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

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query
    let query = adminSupabase
      .from('payout_requests')
      .select(`
        id,
        creator_id,
        amount,
        status,
        created_at,
        updated_at,
        completed_at,
        stripe_transfer_id
      `, { count: 'exact' })

    // Filter by status
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Sort and paginate
    const { data: payouts, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({
        error: "Failed to fetch payouts",
        details: error.message
      }, { status: 500 })
    }

    // Get creator info for each payout
    const payoutsWithCreators = await Promise.all(
      (payouts || []).map(async (payout) => {
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', payout.creator_id)
          .single()

        return {
          ...payout,
          creator_email: profile?.email,
          creator_name: profile?.full_name
        }
      })
    )

    // Summary stats
    const { data: stats } = await adminSupabase
      .from('payout_requests')
      .select('status, amount')

    const summary = {
      total_pending_requests: stats?.filter(s => s.status === 'pending').length || 0,
      total_processing: stats?.filter(s => s.status === 'processing').length || 0,
      total_completed: stats?.filter(s => s.status === 'completed').length || 0,
      total_failed: stats?.filter(s => s.status === 'failed').length || 0,
      total_pending_amount: stats
        ?.filter(s => s.status === 'pending')
        .reduce((sum, s) => sum + (s.amount || 0), 0) || 0
    }

    return NextResponse.json({
      payouts: payoutsWithCreators,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      summary
    })
  } catch (error) {
    console.error('Error fetching payouts:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/marketplace/payouts
 * Process payout requests
 * Actions: approve, reject, mark_processing, mark_completed
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!checkAdminAccess(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { action, payout_id, notes } = body

    if (!payout_id) {
      return NextResponse.json(
        { error: "Payout ID required" },
        { status: 400 }
      )
    }

    // Get payout details
    const { data: payout, error: payoutError } = await adminSupabase
      .from('payout_requests')
      .select('*')
      .eq('id', payout_id)
      .single()

    if (payoutError || !payout) {
      return NextResponse.json(
        { error: "Payout request not found" },
        { status: 404 }
      )
    }

    let updatedStatus = payout.status
    let completedAt = payout.completed_at

    // Handle different actions
    if (action === 'mark_processing') {
      updatedStatus = 'processing'
    } else if (action === 'mark_completed') {
      updatedStatus = 'completed'
      completedAt = new Date().toISOString()
    } else if (action === 'mark_failed') {
      updatedStatus = 'failed'
      completedAt = new Date().toISOString()
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      )
    }

    // Update payout status
    const { error: updateError } = await adminSupabase
      .from('payout_requests')
      .update({
        status: updatedStatus,
        updated_at: new Date().toISOString(),
        completed_at: completedAt,
        admin_notes: notes
      })
      .eq('id', payout_id)

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update payout", details: updateError.message },
        { status: 500 }
      )
    }

    // Log admin action
    await adminSupabase.from('admin_action_logs').insert({
      admin_id: user.id,
      action: `payout_${action}`,
      resource_type: 'payout_request',
      resource_id: payout_id,
      details: {
        payout_id,
        amount: payout.amount,
        creator_id: payout.creator_id,
        previous_status: payout.status,
        new_status: updatedStatus,
        notes
      },
      created_at: new Date().toISOString()
    })

    // If completed, update creator wallet
    if (updatedStatus === 'completed') {
      const { data: wallet } = await adminSupabase
        .from('marketplace_wallet')
        .select('*')
        .eq('creator_id', payout.creator_id)
        .single()

      if (wallet) {
        // Already deducted from balance when request was made
        // Just need to record the completion
        await adminSupabase
          .from('marketplace_wallet')
          .update({
            updated_at: new Date().toISOString()
          })
          .eq('creator_id', payout.creator_id)
      }
    }

    // If failed, refund the amount back to balance
    if (updatedStatus === 'failed') {
      const { data: wallet } = await adminSupabase
        .from('marketplace_wallet')
        .select('*')
        .eq('creator_id', payout.creator_id)
        .single()

      if (wallet) {
        await adminSupabase
          .from('marketplace_wallet')
          .update({
            balance: wallet.balance + payout.amount,
            pending_balance: wallet.pending_balance + payout.amount,
            updated_at: new Date().toISOString()
          })
          .eq('creator_id', payout.creator_id)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Payout marked as ${updatedStatus}`,
      payout_id,
      new_status: updatedStatus
    })
  } catch (error: any) {
    console.error('Error processing payout:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
