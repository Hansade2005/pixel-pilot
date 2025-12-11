import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@/lib/supabase/server"
import { checkAdminAccess } from '@/lib/admin-utils'
import { createClient as createAdminClient } from "@supabase/supabase-js"

/**
 * GET /api/admin/marketplace/stats
 * Get comprehensive marketplace statistics for admin dashboard
 * Includes: total sales, revenue, creators, templates, reviews, trends
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

    // Fetch all creators with wallet info
    const { data: creators, error: creatorsError } = await adminSupabase
      .from('marketplace_wallet')
      .select(`
        id,
        creator_id,
        balance,
        total_earned,
        total_paid_out,
        pending_payout,
        created_at,
        updated_at
      `)
      .order('total_earned', { ascending: false })

    if (creatorsError) {
      return NextResponse.json({
        error: "Failed to fetch creators",
        details: creatorsError.message
      }, { status: 500 })
    }

    // Fetch all template pricing and sales
    const { data: templates, error: templatesError } = await adminSupabase
      .from('template_pricing')
      .select(`
        id,
        template_id,
        price,
        is_paid,
        pricing_type,
        currency,
        discount_percent,
        discount_active,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (templatesError) {
      return NextResponse.json({
        error: "Failed to fetch template pricing",
        details: templatesError.message
      }, { status: 500 })
    }

    // Fetch marketplace metadata
    const { data: metadata, error: metadataError } = await adminSupabase
      .from('marketplace_metadata')
      .select(`
        id,
        template_id,
        category,
        tags,
        total_sales,
        total_revenue,
        total_downloads,
        rating,
        review_count,
        featured,
        featured_at,
        created_at,
        updated_at
      `)
      .order('total_revenue', { ascending: false })

    if (metadataError) {
      return NextResponse.json({
        error: "Failed to fetch marketplace metadata",
        details: metadataError.message
      }, { status: 500 })
    }

    // Fetch purchases
    const { data: purchases, error: purchasesError } = await adminSupabase
      .from('template_purchases')
      .select(`
        id,
        template_id,
        buyer_id,
        price_paid,
        currency,
        payment_status,
        access_granted_at,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (purchasesError) {
      return NextResponse.json({
        error: "Failed to fetch purchases",
        details: purchasesError.message
      }, { status: 500 })
    }

    // Fetch reviews
    const { data: reviews, error: reviewsError } = await adminSupabase
      .from('template_reviews')
      .select(`
        id,
        template_id,
        reviewer_id,
        rating,
        comment,
        helpful_count,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (reviewsError) {
      return NextResponse.json({
        error: "Failed to fetch reviews",
        details: reviewsError.message
      }, { status: 500 })
    }

    // Fetch bundles
    const { data: bundles, error: bundlesError } = await adminSupabase
      .from('template_bundles')
      .select(`
        id,
        creator_id,
        name,
        description,
        price,
        currency,
        discount_percent,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (bundlesError) {
      return NextResponse.json({
        error: "Failed to fetch bundles",
        details: bundlesError.message
      }, { status: 500 })
    }

    // Calculate aggregated statistics
    const totalCreators = creators?.length || 0
    const totalEarned = creators?.reduce((sum, c) => sum + (c.total_earned || 0), 0) || 0
    const totalPaidOut = creators?.reduce((sum, c) => sum + (c.total_paid_out || 0), 0) || 0
    const totalPending = creators?.reduce((sum, c) => sum + (c.pending_payout || 0), 0) || 0
    const totalTemplates = metadata?.length || 0
    const totalPaidTemplates = templates?.filter(t => t.is_paid)?.length || 0
    const totalFreeTemplates = templates?.filter(t => !t.is_paid)?.length || 0
    const totalSales = purchases?.length || 0
    const totalRevenue = purchases?.reduce((sum, p) => sum + (p.price_paid || 0), 0) || 0
    const totalReviews = reviews?.length || 0
    const avgRating = metadata && metadata.length > 0
      ? (metadata.reduce((sum, m) => sum + (m.rating || 0), 0) / metadata.length).toFixed(2)
      : 0
    const totalBundles = bundles?.length || 0

    // Get top creators
    const topCreators = creators?.slice(0, 10) || []

    // Get top templates by revenue
    const topTemplates = metadata?.slice(0, 10) || []

    // Get recent purchases
    const recentPurchases = purchases?.slice(0, 20) || []

    // Get featured templates
    const featuredTemplates = metadata?.filter(m => m.featured) || []

    // Platform health metrics
    const avgPricePerTemplate = totalTemplates > 0
      ? (templates?.reduce((sum, t) => sum + (t.price || 0), 0) / totalTemplates).toFixed(2)
      : 0

    const conversionRate = totalTemplates > 0
      ? ((totalSales / totalTemplates) * 100).toFixed(2)
      : 0

    const avgReviewRating = totalReviews > 0
      ? (reviews?.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2)
      : 0

    return NextResponse.json({
      summary: {
        totalCreators,
        totalTemplates,
        totalPaidTemplates,
        totalFreeTemplates,
        totalSales,
        totalRevenue: totalRevenue.toFixed(2),
        totalEarned: totalEarned.toFixed(2),
        totalPaidOut: totalPaidOut.toFixed(2),
        totalPending: totalPending.toFixed(2),
        totalReviews,
        totalBundles,
        avgRating,
        avgPricePerTemplate,
        conversionRate,
        avgReviewRating
      },
      topCreators,
      topTemplates,
      recentPurchases,
      featuredTemplates,
      creators,
      templates,
      metadata,
      purchases,
      reviews,
      bundles
    })
  } catch (error) {
    console.error('Error fetching marketplace stats:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
