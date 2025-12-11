'use server'

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
})

/**
 * POST /api/marketplace/purchase
 * Create a purchase order and Stripe checkout session
 * 
 * @body {
 *   template_id: string,
 *   bundle_id?: string (if purchasing bundle instead)
 * }
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
    const { template_id, bundle_id } = body

    let checkoutData: any = {
      customer_email: user.email,
      client_reference_id: user.id,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/workspace?purchase_success=true&redirect=/workspace?view=templates`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/workspace?view=templates`,
    }

    if (bundle_id) {
      // Bundle purchase
      const { data: bundle } = await supabase
        .from('template_bundles')
        .select('*, bundled_templates(template_id)')
        .eq('id', bundle_id)
        .single()

      if (!bundle) {
        return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
      }

      checkoutData.line_items = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: bundle.bundle_name,
              description: bundle.description,
            },
            unit_amount: Math.round(bundle.bundle_price * 100),
          },
          quantity: 1,
        },
      ]

      checkoutData.metadata = {
        type: 'bundle_purchase',
        bundle_id,
        creator_id: bundle.creator_id,
        buyer_id: user.id,
        template_count: bundle.bundled_templates.length,
      }
    } else {
      // Single template purchase
      const { data: template } = await supabase
        .from('public_templates')
        .select('*, template_pricing(*)')
        .eq('id', template_id)
        .single()

      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }

      // Prevent self-purchase
      if (template.user_id === user.id) {
        return NextResponse.json(
          { error: 'Cannot purchase your own template' },
          { status: 400 }
        )
      }

      const pricing = template.template_pricing?.[0]
      const price = pricing?.price || 0

      // Check if template is free
      if (price === 0) {
        // Free template - just grant access
        await grantTemplateAccess(supabase, user.id, template_id, template.user_id, 0)
        return NextResponse.json({
          success: true,
          message: 'Template access granted',
          payment_required: false,
        })
      }

      const platformCommission = 0.25 // 25%
      const stripeFee = price * 0.029 + 0.30
      const creatorEarnings = price - stripeFee - price * platformCommission

      checkoutData.line_items = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: template.name,
              description: template.description,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ]

      checkoutData.metadata = {
        type: 'template_purchase',
        template_id,
        creator_id: template.user_id,
        buyer_id: user.id,
        price: price.toString(),
        platform_fee: (price * platformCommission).toString(),
        creator_earnings: creatorEarnings.toString(),
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(
      checkoutData as Parameters<typeof stripe.checkout.sessions.create>[0]
    )

    return NextResponse.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    })
  } catch (error: any) {
    console.error('Purchase error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create purchase' },
      { status: 500 }
    )
  }
}

/**
 * Grant user access to a template
 */
async function grantTemplateAccess(
  supabase: any,
  buyerId: string,
  templateId: string,
  creatorId: string,
  amount: number
) {
  // Record purchase (for free templates, amount is 0)
  const { error: purchaseError } = await supabase.from('template_purchases').insert({
    template_id: templateId,
    buyer_id: buyerId,
    creator_id: creatorId,
    amount,
    platform_fee: 0,
    creator_earnings: 0,
    status: 'completed',
    purchased_at: new Date(),
  })

  if (purchaseError) throw purchaseError

  // Increment usage count
  await supabase
    .from('template_metadata')
    .update({
      total_downloads: supabase.raw('total_downloads + 1'),
    })
    .eq('template_id', templateId)
}
