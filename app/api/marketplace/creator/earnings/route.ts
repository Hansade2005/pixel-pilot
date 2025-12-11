'use server'

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/marketplace/creator/earnings
 * Get creator earnings summary and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is creator
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_creator')
      .eq('id', user.id)
      .single()

    // If profile doesn't exist, create it
    if (profileError && profileError.code === 'PGRST116') {
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          is_creator: false
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating profile:', createError)
        return NextResponse.json(
          { error: 'Failed to initialize user profile' },
          { status: 500 }
        )
      }
      profile = newProfile
    }

    if (!profile?.is_creator) {
      return NextResponse.json(
        { error: 'User is not a creator. Enable creator mode first.' },
        { status: 403 }
      )
    }

    // Get marketplace wallet
    const { data: wallet } = await supabase
      .from('marketplace_wallet')
      .select('*')
      .eq('creator_id', user.id)
      .single()

    // Get total earnings by month
    const { data: monthlyEarnings } = await supabase
      .from('creator_earnings')
      .select('month, total_sales, total_revenue, creator_earnings, paid_out')
      .eq('creator_id', user.id)
      .order('month', { ascending: false })
      .limit(12)

    // Get top performing templates
    const { data: creatorTemplates } = await supabase
      .from('public_templates')
      .select('id')
      .eq('user_id', user.id)

    const templateIds = creatorTemplates?.map((t: any) => t.id) || []

    const { data: topTemplates } = await supabase
      .from('template_metadata')
      .select('template_id, total_sales, total_revenue, rating, review_count')
      .in('template_id', templateIds)
      .order('total_revenue', { ascending: false })
      .limit(5)

    // Get recent transactions
    const { data: recentTransactions } = await supabase
      .from('marketplace_transactions')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get recent payouts
    const { data: recentPayouts } = await supabase
      .from('marketplace_payouts')
      .select('*')
      .eq('creator_id', user.id)
      .order('requested_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      wallet: {
        available_balance: wallet?.available_balance || 0,
        pending_balance: wallet?.pending_balance || 0,
        total_earned: wallet?.total_earned || 0,
        last_payout_date: wallet?.last_payout_date,
        last_payout_amount: wallet?.last_payout_amount,
      },
      monthly_earnings: monthlyEarnings || [],
      top_templates: topTemplates || [],
      recent_transactions: recentTransactions || [],
      recent_payouts: recentPayouts || [],
    })
  } catch (error: any) {
    console.error('Get earnings error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get earnings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/marketplace/creator/earnings
 * Handle creator earnings actions: request_payout, save_bank_details
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, amount, bank_details } = body

    if (action === 'request_payout') {
      return handlePayoutRequest(supabase, user.id, amount)
    } else if (action === 'save_bank_details') {
      return saveBankDetails(supabase, user.id, bank_details)
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error processing request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}

/**
 * Handle payout request
 */
async function handlePayoutRequest(supabase: any, userId: string, amount: number) {
  try {
    // Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid payout amount' },
        { status: 400 }
      )
    }

    if (amount < 50) {
      return NextResponse.json(
        { error: 'Minimum payout amount is $50.00' },
        { status: 400 }
      )
    }

    // Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from('marketplace_wallet')
      .select('*')
      .eq('creator_id', userId)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json(
        { error: 'Marketplace wallet not found' },
        { status: 404 }
      )
    }

    // Check pending payout balance
    if (wallet.pending_balance < amount) {
      return NextResponse.json(
        { error: `Insufficient pending balance. Available: $${wallet.pending_balance.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Get bank details
    const { data: bankData } = await supabase
      .from('creator_bank_details')
      .select('*')
      .eq('creator_id', userId)
      .single()

    if (!bankData) {
      return NextResponse.json(
        { error: 'Bank details not found. Please add your bank details first.' },
        { status: 400 }
      )
    }

    // Create payout request
    const { data: payout, error: payoutError } = await supabase
      .from('payout_requests')
      .insert({
        creator_id: userId,
        amount,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (payoutError) {
      throw new Error(payoutError.message)
    }

    // Update wallet - move from pending_balance to total_paid_out
    const { error: updateError } = await supabase
      .from('marketplace_wallet')
      .update({
        pending_balance: wallet.pending_balance - amount,
        total_paid_out: wallet.total_paid_out + amount,
        balance: wallet.balance - amount,
        updated_at: new Date().toISOString()
      })
      .eq('creator_id', userId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    // Log transaction
    await supabase.from('marketplace_transaction_log').insert({
      creator_id: userId,
      transaction_type: 'payout_request',
      amount,
      description: `Payout request for $${amount.toFixed(2)}`,
      payout_request_id: payout.id,
      created_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Payout request submitted successfully',
      payout_id: payout.id,
      status: 'processing',
      estimated_delivery: '2-5 business days'
    })
  } catch (error: any) {
    console.error('Payout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payout request' },
      { status: 500 }
    )
  }
}

/**
 * Save creator bank details
 */
async function saveBankDetails(supabase: any, userId: string, bankDetails: any) {
  try {
    if (!bankDetails || !bankDetails.account_holder_name || !bankDetails.account_number || 
        !bankDetails.routing_number || !bankDetails.bank_name) {
      return NextResponse.json(
        { error: 'Missing required bank details' },
        { status: 400 }
      )
    }

    // Check if bank details already exist
    const { data: existingDetails } = await supabase
      .from('creator_bank_details')
      .select('id')
      .eq('creator_id', userId)
      .single()

    let result
    if (existingDetails) {
      // Update existing
      result = await supabase
        .from('creator_bank_details')
        .update({
          account_holder_name: bankDetails.account_holder_name,
          account_number: bankDetails.account_number,
          routing_number: bankDetails.routing_number,
          bank_name: bankDetails.bank_name,
          updated_at: new Date().toISOString()
        })
        .eq('creator_id', userId)
        .select()
        .single()
    } else {
      // Create new
      result = await supabase
        .from('creator_bank_details')
        .insert({
          creator_id: userId,
          account_holder_name: bankDetails.account_holder_name,
          account_number: bankDetails.account_number,
          routing_number: bankDetails.routing_number,
          bank_name: bankDetails.bank_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
    }

    if (result.error) {
      throw new Error(result.error.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Bank details saved successfully',
      details: {
        account_holder: bankDetails.account_holder_name,
        bank: bankDetails.bank_name,
        account_last_4: bankDetails.account_number.slice(-4)
      }
    })
  } catch (error: any) {
    console.error('Bank details error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save bank details' },
      { status: 500 }
    )
  }
}

