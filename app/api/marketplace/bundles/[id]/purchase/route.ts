'use server'

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

/**
 * POST /api/marketplace/bundles/[id]/purchase
 * Purchase a bundle (handles both free and paid bundles)
 * 
 * @body {
 *   bundle_id: string,
 *   promotional_code?: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bundleId = params.id
    const body = await request.json()
    const { promotional_code } = body

    // Get bundle details
    const { data: bundle, error: bundleError } = await supabase
      .from('template_bundles')
      .select('*, profiles(id, stripe_connect_id)')
      .eq('id', bundleId)
      .eq('is_public', true)
      .single()

    if (bundleError || !bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    // Get bundled templates
    const { data: bundledTemplates, error: templatesError } = await supabase
      .from('bundled_templates')
      .select('template_id')
      .eq('bundle_id', bundleId)

    if (templatesError) throw templatesError

    const templateIds = bundledTemplates?.map((bt: any) => bt.template_id) || []

    // Check if user already purchased this bundle
    const { data: existingPurchase } = await supabase
      .from('template_purchases')
      .select('id')
      .eq('buyer_id', user.id)
      .eq('bundle_id', bundleId)
      .single()

    if (existingPurchase) {
      return NextResponse.json(
        { error: 'You already purchased this bundle' },
        { status: 400 }
      )
    }

    // Handle free bundles
    if (bundle.bundle_price === 0) {
      // Grant access to all templates in bundle
      const purchases = templateIds.map((templateId: string) => ({
        buyer_id: user.id,
        creator_id: bundle.profiles.id,
        template_id: templateId,
        bundle_id: bundleId,
        amount: 0,
        platform_fee: 0,
        creator_earnings: 0,
        status: 'completed',
        purchased_at: new Date().toISOString(),
      }))

      const { error: purchaseError } = await supabase
        .from('template_purchases')
        .insert(purchases)

      if (purchaseError) throw purchaseError

      // Update bundle download count
      await supabase
        .from('template_bundles')
        .update({ total_downloads: (bundle.total_downloads || 0) + 1 })
        .eq('id', bundleId)

      return NextResponse.json({
        success: true,
        access_granted: true,
        bundle_id: bundleId,
        template_count: templateIds.length,
      })
    }

    // Handle paid bundles - create Stripe checkout session
    const platformCommission = 0.25 // 25%
    const stripeFeePercentage = 0.029 // 2.9%
    const stripeFeeFixed = 0.3 // $0.30

    const totalPrice = Math.round(bundle.bundle_price * 100) // Convert to cents

    const stripeFee = Math.ceil(totalPrice * stripeFeePercentage + stripeFeeFixed)
    const platformFee = Math.ceil(totalPrice * platformCommission)
    const creatorEarnings = totalPrice - stripeFee - platformFee

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: bundle.bundle_name,
              description: bundle.description,
              metadata: {
                bundle_id: bundleId,
                template_count: templateIds.length.toString(),
              },
            },
            unit_amount: totalPrice,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/marketplace/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/marketplace/bundles/${bundleId}`,
      metadata: {
        buyer_id: user.id,
        creator_id: bundle.profiles.id,
        bundle_id: bundleId,
        template_ids: templateIds.join(','),
        platform_fee: platformFee.toString(),
        creator_earnings: creatorEarnings.toString(),
        purchase_type: 'bundle',
      },
    })

    // Record pending purchase
    const { error: pendingError } = await supabase
      .from('template_purchases')
      .insert({
        buyer_id: user.id,
        creator_id: bundle.profiles.id,
        bundle_id: bundleId,
        amount: totalPrice / 100, // Convert back to dollars
        platform_fee: platformFee / 100,
        creator_earnings: creatorEarnings / 100,
        status: 'pending',
        payment_intent_id: session.payment_intent,
        purchased_at: new Date().toISOString(),
      })

    if (pendingError) throw pendingError

    return NextResponse.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    })
  } catch (error: any) {
    console.error('Bundle purchase error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to purchase bundle' },
      { status: 500 }
    )
  }
}
