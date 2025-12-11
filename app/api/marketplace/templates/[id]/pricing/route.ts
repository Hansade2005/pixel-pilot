'use server'

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/marketplace/templates/[id]/pricing
 * Get pricing info for a template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const templateId = params.id

    // Get pricing
    const { data: pricing, error } = await supabase
      .from('template_pricing')
      .select('*')
      .eq('template_id', templateId)
      .single()

    if (error) {
      // Return default free pricing if not found
      return NextResponse.json({
        template_id: templateId,
        price: 0,
        is_paid: false,
        pricing_type: 'freemium',
        discount_active: false,
        discount_percent: 0,
      })
    }

    return NextResponse.json(pricing)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get pricing' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/marketplace/templates/[id]/pricing
 * Creator sets/updates template pricing
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

    const templateId = params.id
    const body = await request.json()

    // Verify template ownership
    const { data: template } = await supabase
      .from('public_templates')
      .select('user_id')
      .eq('id', templateId)
      .single()

    if (!template || template.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - not template owner' },
        { status: 403 }
      )
    }

    // Upsert pricing
    const { error: upsertError } = await supabase
      .from('template_pricing')
      .upsert(
        {
          template_id: templateId,
          price: body.price || 0,
          pricing_type: body.pricing_type || 'freemium',
          is_paid: body.price > 0,
          subscription_monthly_price: body.subscription_monthly_price,
          discount_percent: body.discount_percent || 0,
          discount_active: body.discount_active || false,
          discount_until: body.discount_until,
          updated_at: new Date(),
        },
        { onConflict: 'template_id' }
      )
      .select()
      .single()

    if (upsertError) throw upsertError

    return NextResponse.json({
      success: true,
      message: 'Pricing updated successfully',
    })
  } catch (error: any) {
    console.error('Pricing update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update pricing' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/marketplace/templates/[id]/pricing
 * Update template pricing
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return POST(request, { params })
}
