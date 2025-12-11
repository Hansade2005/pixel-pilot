import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/marketplace/templates/[templateId]/pricing
 * Set or update template pricing
 * Creator only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = await createClient()
    const { templateId } = params

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check ownership
    const { data: template, error: templateError } = await supabase
      .from('public_templates')
      .select('user_id')
      .eq('id', templateId)
      .single()

    if (templateError || !template || template.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Template not found or not owned by you' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate input
    if (body.price < 0) {
      return NextResponse.json(
        { error: 'Price must be >= 0' },
        { status: 400 }
      )
    }

    // Upsert pricing
    const { data: pricing, error: pricingError } = await supabase
      .from('template_pricing')
      .upsert({
        template_id: templateId,
        price: body.price,
        currency: body.currency || 'USD',
        pricing_type: body.pricing_type || 'one-time',
        is_paid: body.price > 0,
        subscription_monthly_price: body.subscription_monthly_price,
        discount_percent: body.discount_percent || 0,
        discount_active: body.discount_active || false,
        discount_until: body.discount_until,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'template_id'
      })
      .select()
      .single()

    if (pricingError) {
      return NextResponse.json(
        { error: pricingError.message },
        { status: 400 }
      )
    }

    // Update marketplace visibility if it's a paid template
    if (body.price > 0) {
      await supabase
        .from('template_metadata')
        .update({ marketplace_visible: true })
        .eq('template_id', templateId)
    }

    return NextResponse.json({
      success: true,
      pricing,
      message: 'Template pricing updated successfully'
    })
  } catch (error) {
    console.error('Error updating template pricing:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/marketplace/templates/[templateId]/pricing
 * Get pricing for a template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = await createClient()
    const { templateId } = params

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
        pricing_type: 'freemium'
      })
    }

    return NextResponse.json(pricing)
  } catch (error) {
    console.error('Error fetching pricing:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
