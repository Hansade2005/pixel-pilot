import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/marketplace/templates/[templateId]/reviews
 * Get reviews for a template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = await createClient()
    const { templateId } = params

    // Get reviews
    const { data: reviews, error } = await supabase
      .from('template_reviews')
      .select(`
        id,
        rating,
        review_text,
        created_at,
        reviewer_id,
        is_verified_purchase,
        helpful_count
      `)
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reviews: reviews || [] })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/marketplace/templates/[templateId]/reviews
 * Add a review to a template (users who purchased only)
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

    const body = await request.json()
    const { rating, review_text } = body

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Check if user purchased this template
    const { data: purchase } = await supabase
      .from('template_purchases')
      .select('id')
      .eq('template_id', templateId)
      .eq('buyer_id', user.id)
      .eq('status', 'completed')
      .single()

    if (!purchase) {
      return NextResponse.json(
        { error: 'Only verified purchasers can review' },
        { status: 403 }
      )
    }

    // Check if user already reviewed
    const { data: existingReview } = await supabase
      .from('template_reviews')
      .select('id')
      .eq('template_id', templateId)
      .eq('reviewer_id', user.id)
      .single()

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this template' },
        { status: 400 }
      )
    }

    // Create review
    const { data: review, error: insertError } = await supabase
      .from('template_reviews')
      .insert({
        template_id: templateId,
        reviewer_id: user.id,
        rating,
        review_text: review_text || null,
        is_verified_purchase: true
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      )
    }

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
