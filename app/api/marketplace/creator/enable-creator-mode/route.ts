import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/marketplace/creator/enable-creator-mode
 * Enable creator mode for a user
 * Creates marketplace_wallet and initializes creator settings
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if already creator
    const { data: existingWallet } = await supabase
      .from('marketplace_wallet')
      .select('id')
      .eq('creator_id', user.id)
      .single()

    if (existingWallet) {
      return NextResponse.json(
        { error: 'Already a creator' },
        { status: 400 }
      )
    }

    // Create marketplace wallet
    const { data: wallet, error: walletError } = await supabase
      .from('marketplace_wallet')
      .insert({
        creator_id: user.id,
        balance: 0,
        total_earned: 0,
        total_paid_out: 0,
        pending_payout: 0
      })
      .select()
      .single()

    if (walletError) {
      return NextResponse.json(
        { error: walletError.message },
        { status: 400 }
      )
    }

    // Create creator settings
    const { data: settings, error: settingsError } = await supabase
      .from('creator_settings')
      .insert({
        creator_id: user.id,
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url
      })
      .select()
      .single()

    if (settingsError) {
      console.error('Settings error:', settingsError)
    }

    // Update user profile
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update({
        is_creator: true,
        creator_mode_enabled_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Don't fail - wallet was created successfully
    }

    return NextResponse.json({
      success: true,
      wallet,
      profile: updatedProfile,
      message: 'Creator mode enabled successfully!'
    }, { status: 201 })
  } catch (error) {
    console.error('Error enabling creator mode:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
