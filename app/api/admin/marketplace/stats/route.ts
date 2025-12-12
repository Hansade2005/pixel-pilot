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

    console.log('Admin user:', user.email, 'accessing marketplace stats')

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch all creators with wallet info
    console.log('Fetching creators from marketplace_wallet...')
    const { data: creators, error: creatorsError } = await adminSupabase
      .from('marketplace_wallet')
      .select(`
        id,
        creator_id,
        available_balance,
        total_earned,
        total_paid_out,
        pending_balance,
        created_at,
        updated_at
      `)
      .order('total_earned', { ascending: false })

    if (creatorsError) {
      console.error('Error fetching creators:', creatorsError)
      return NextResponse.json({
        error: "Failed to fetch creators",
        details: creatorsError.message
      }, { status: 500 })
    }
    console.log('Successfully fetched creators:', creators?.length)

    // Fetch all template pricing and sales
    console.log('Fetching template pricing...')
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
      console.error('Error fetching templates:', templatesError)
      return NextResponse.json({
        error: "Failed to fetch template pricing",
        details: templatesError.message
      }, { status: 500 })
    }
    console.log('Successfully fetched templates:', templates?.length)

    // Fetch marketplace metadata
    console.log('Fetching template metadata...')
    const { data: metadata, error: metadataError } = await adminSupabase
      .from('template_metadata')
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
        is_featured,
        created_at,
        updated_at
      `)
      .order('total_revenue', { ascending: false })

    if (metadataError) {
      console.error('Error fetching metadata:', metadataError)
      return NextResponse.json({
        error: "Failed to fetch marketplace metadata",
        details: metadataError.message
      }, { status: 500 })
    }
    console.log('Successfully fetched metadata:', metadata?.length)

    // Fetch purchases
    console.log('Fetching purchases...')
    const { data: purchases, error: purchasesError } = await adminSupabase
      .from('template_purchases')
      .select(`
        id,
        template_id,
        buyer_id,
        amount,
        currency,
        status,
        purchased_at
      `)
      .order('purchased_at', { ascending: false })
      .limit(1000)

    if (purchasesError) {
      return NextResponse.json({
        error: "Failed to fetch purchases",
        details: purchasesError.message
      }, { status: 500 })
    }
    console.log('Successfully fetched purchases:', purchases?.length)

    // Fetch reviews
    console.log('Fetching reviews...')
    const { data: reviews, error: reviewsError } = await adminSupabase
      .from('template_reviews')
      .select(`
        id,
        template_id,
        reviewer_id,
        rating,
        review_text,
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
    console.log('Successfully fetched reviews:', reviews?.length)

    // Fetch bundles
    console.log('Fetching bundles...')
    const { data: bundles, error: bundlesError } = await adminSupabase
      .from('template_bundles')
      .select(`
        id,
        creator_id,
        bundle_name,
        description,
        bundle_price,
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
    console.log('Successfully fetched bundles:', bundles?.length)

    // Calculate aggregated statistics
    console.log('Calculating statistics...')
    const totalCreators = creators?.length || 0
    const totalEarned = (creators || []).reduce((sum, c) => {
      const earned = typeof c.total_earned === 'number' ? c.total_earned : parseFloat(c.total_earned as any) || 0
      return sum + earned
    }, 0)
    const totalPaidOut = (creators || []).reduce((sum, c) => {
      const paidOut = typeof c.total_paid_out === 'number' ? c.total_paid_out : parseFloat(c.total_paid_out as any) || 0
      return sum + paidOut
    }, 0)
    const totalPending = (creators || []).reduce((sum, c) => {
      const pending = typeof c.pending_balance === 'number' ? c.pending_balance : parseFloat(c.pending_balance as any) || 0
      return sum + pending
    }, 0)
    const totalTemplates = metadata?.length || 0
    const totalPaidTemplates = (templates || []).filter(t => t.is_paid)?.length || 0
    const totalFreeTemplates = (templates || []).filter(t => !t.is_paid)?.length || 0
    const totalSales = purchases?.length || 0
    const totalRevenue = (purchases || []).reduce((sum, p) => {
      const amount = typeof p.amount === 'number' ? p.amount : parseFloat(p.amount as any) || 0
      return sum + amount
    }, 0)
    const totalReviews = reviews?.length || 0
    const avgRating = (metadata || []).length > 0
      ? ((metadata || []).reduce((sum, m) => {
          const rating = typeof m.rating === 'number' ? m.rating : parseFloat(m.rating as any) || 0
          return sum + rating
        }, 0) / (metadata || []).length).toFixed(2)
      : '0.00'
    const totalBundles = bundles?.length || 0

    console.log('Statistics calculated successfully')

    // Get top creators
    console.log('Processing top creators...')
    const topCreators = (creators || [])
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        creator_id: c.creator_id,
        available_balance: c.available_balance,
        total_earned: c.total_earned,
        total_paid_out: c.total_paid_out,
        pending_balance: c.pending_balance
      }))

    // Get top templates by revenue
    console.log('Processing top templates...')
    const topTemplates = (metadata || [])
      .slice(0, 10)
      .map(m => ({
        id: m.id,
        template_id: m.template_id,
        category: m.category,
        total_sales: m.total_sales,
        total_revenue: m.total_revenue,
        rating: m.rating
      }))

    // Get recent purchases
    console.log('Processing recent purchases...')
    const recentPurchases = (purchases || [])
      .slice(0, 20)
      .map(p => ({
        id: p.id,
        template_id: p.template_id,
        buyer_id: p.buyer_id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        purchased_at: p.purchased_at
      }))

    // Get featured templates
    console.log('Processing featured templates...')
    const featuredTemplates = (metadata || [])
      .filter(m => m.is_featured)
      .map(m => ({
        id: m.id,
        template_id: m.template_id,
        category: m.category,
        rating: m.rating,
        total_revenue: m.total_revenue
      }))

    // Platform health metrics
    console.log('Calculating platform metrics...')
    const avgPricePerTemplate = totalTemplates > 0
      ? ((templates || []).reduce((sum, t) => {
          const price = typeof t.price === 'number' ? t.price : parseFloat(t.price as any) || 0
          return sum + price
        }, 0) / totalTemplates).toFixed(2)
      : '0.00'

    const conversionRate = totalTemplates > 0
      ? ((totalSales / totalTemplates) * 100).toFixed(2)
      : '0.00'

    const avgReviewRating = totalReviews > 0
      ? ((reviews || []).reduce((sum, r) => {
          const rating = typeof r.rating === 'number' ? r.rating : parseFloat(r.rating as any) || 0
          return sum + rating
        }, 0) / totalReviews).toFixed(2)
      : '0.00'

    console.log('All calculations complete, preparing response...')
    const responseData = {
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
        avgRating: String(avgRating),
        avgPricePerTemplate: String(avgPricePerTemplate),
        conversionRate: String(conversionRate),
        avgReviewRating: String(avgReviewRating)
      },
      topCreators,
      topTemplates,
      recentPurchases,
      featuredTemplates
    }

    console.log('Response data prepared, sending response...')
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error fetching marketplace stats:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Detailed error:', errorMessage)
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    )
  }
}
