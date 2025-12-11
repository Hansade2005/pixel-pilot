'use server'

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/marketplace/creator/setup
 * Enable creator mode for a user and initiate Stripe Connect onboarding
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
    const { stripe_account_id, business_type } = body

    // Update user profile to enable creator mode
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_creator: true,
        creator_mode_enabled_at: new Date(),
        stripe_connect_id: stripe_account_id,
        creator_bio: body.bio || '',
        creator_website: body.website || '',
      })
      .eq('id', user.id)

    if (updateError) throw updateError

    // Create marketplace wallet entry
    const { error: walletError } = await supabase
      .from('marketplace_wallet')
      .insert({
        creator_id: user.id,
        available_balance: 0,
        pending_balance: 0,
        total_earned: 0,
        stripe_connect_id: stripe_account_id,
      })
      .select()
      .single()

    if (walletError && !walletError.message.includes('duplicate key')) {
      throw walletError
    }

    return NextResponse.json({
      success: true,
      message: 'Creator mode enabled',
      user_id: user.id,
    })
  } catch (error: any) {
    console.error('Creator setup error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to enable creator mode' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/marketplace/creator/setup
 * Get creator setup status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get creator profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_creator, stripe_connect_id, creator_bio, creator_website, total_templates, total_earnings')
      .eq('id', user.id)
      .single()

    // Get marketplace wallet
    const { data: wallet } = await supabase
      .from('marketplace_wallet')
      .select('*')
      .eq('creator_id', user.id)
      .single()

    return NextResponse.json({
      is_creator: profile?.is_creator || false,
      stripe_connected: !!profile?.stripe_connect_id,
      bio: profile?.creator_bio,
      website: profile?.creator_website,
      total_templates: profile?.total_templates || 0,
      total_earnings: wallet?.total_earned || 0,
      available_balance: wallet?.available_balance || 0,
      pending_balance: wallet?.pending_balance || 0,
    })
  } catch (error: any) {
    console.error('Get creator setup error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get creator info' },
      { status: 500 }
    )
  }
}
