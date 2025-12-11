'use server'

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/marketplace/templates/[id]/reviews
 * Submit a review for a template (must be verified purchase)
 * 
 * @body {
 *   rating: number (1-5),
 *   review_text: string
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

    const templateId = params.id
    const body = await request.json()
    const { rating, review_text } = body

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (!review_text || review_text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Review text is required' },
        { status: 400 }
      )
    }

    // Verify user has purchased this template
    const { data: purchase, error: purchaseError } = await supabase
      .from('template_purchases')
      .select('id')
      .eq('buyer_id', user.id)
      .eq('template_id', templateId)
      .eq('status', 'completed')
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: 'You must purchase this template to leave a review' },
        { status: 403 }
      )
    }

    // Check if user already reviewed this template
    const { data: existingReview } = await supabase
      .from('template_reviews')
      .select('id')
      .eq('template_id', templateId)
      .eq('reviewer_id', user.id)
      .single()

    if (existingReview) {
      // Update existing review
      const { data: updatedReview, error: updateError } = await supabase
        .from('template_reviews')
        .update({
          rating,
          review_text,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingReview.id)
        .select()
        .single()

      if (updateError) throw updateError

      return NextResponse.json({
        success: true,
        review: updatedReview,
        is_update: true,
      })
    }

    // Create new review
    const { data: review, error: reviewError } = await supabase
      .from('template_reviews')
      .insert({
        template_id: templateId,
        reviewer_id: user.id,
        rating,
        review_text,
        is_verified_purchase: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (reviewError) throw reviewError

    // Update template metadata with new average rating
    const { data: allReviews, error: allReviewsError } = await supabase
      .from('template_reviews')
      .select('rating')
      .eq('template_id', templateId)

    if (!allReviewsError && allReviews) {
      const averageRating =
        allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) /
        allReviews.length

      await supabase
        .from('template_metadata')
        .update({
          rating: Math.round(averageRating * 10) / 10,
          review_count: allReviews.length,
        })
        .eq('template_id', templateId)
    }

    return NextResponse.json({
      success: true,
      review,
      is_update: false,
    })
  } catch (error: any) {
    console.error('Review creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create review' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/marketplace/templates/[id]/reviews
 * Get reviews for a template with sorting
 * 
 * @query {
 *   sort?: 'helpful' | 'newest' | 'highest' | 'lowest',
 *   page?: number,
 *   limit?: number
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const templateId = params.id
    const sort = searchParams.get('sort') || 'newest'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('template_reviews')
      .select('*, profiles(username, avatar_url)', { count: 'exact' })
      .eq('template_id', templateId)

    // Apply sorting
    switch (sort) {
      case 'highest':
        query = query.order('rating', { ascending: false })
        break
      case 'lowest':
        query = query.order('rating', { ascending: true })
        break
      case 'helpful':
        query = query.order('helpful_count', { ascending: false })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)

    const { data: reviews, count, error } = await query

    if (error) throw error

    // Get template metadata for rating summary
    const { data: metadata } = await supabase
      .from('template_metadata')
      .select('rating, review_count')
      .eq('template_id', templateId)
      .single()

    return NextResponse.json({
      reviews,
      summary: metadata,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error('Get reviews error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}
