import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/marketplace/templates
 * Get marketplace templates with filtering and sorting
 * 
 * Query params:
 * - search: string (search by name/description)
 * - category: string (filter by category)
 * - minPrice: number
 * - maxPrice: number
 * - minRating: number (0-5)
 * - sort: 'trending' | 'newest' | 'price-low' | 'price-high' | 'top-rated'
 * - page: number (default 1)
 * - limit: number (default 12)
 * - paid_only: boolean (only show paid templates)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category')
    const minPrice = parseFloat(searchParams.get('minPrice') || '0')
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '10000')
    const minRating = parseFloat(searchParams.get('minRating') || '0')
    const sort = searchParams.get('sort') || 'trending'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 100)
    const paidOnly = searchParams.get('paid_only') === 'true'

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('public_templates')
      .select(`
        id,
        user_id,
        name,
        description,
        thumbnail_url,
        author_name,
        preview_url,
        usage_count,
        created_at,
        template_pricing(price, is_paid, discount_percent, discount_active),
        template_metadata(
          category,
          total_sales,
          total_downloads,
          rating,
          review_count,
          is_featured,
          is_verified
        ),
        profiles(email)
      `, { count: 'exact' })
      .eq('template_metadata.marketplace_visible', true)

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (category) {
      query = query.eq('template_metadata.category', category)
    }

    if (minRating > 0) {
      query = query.gte('template_metadata.rating', minRating)
    }

    if (paidOnly) {
      query = query.eq('template_pricing.is_paid', true)
    }

    // Apply price filter (after fetch because pricing is joined)
    // This will be done in post-processing

    // Apply sorting
    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'price-low':
        query = query.order('template_pricing.price', { ascending: true })
        break
      case 'price-high':
        query = query.order('template_pricing.price', { ascending: false })
        break
      case 'top-rated':
        query = query.order('template_metadata.rating', { ascending: false })
        break
      case 'trending': // most downloads
      default:
        query = query.order('template_metadata.total_downloads', { ascending: false })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: templates, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Filter by price range (post-processing since we need the joined data)
    const filtered = (templates || []).filter((template: any) => {
      const pricing = template.template_pricing?.[0]
      const price = pricing?.price || 0
      return price >= minPrice && price <= maxPrice
    })

    // Format response
    const formattedTemplates = filtered.map((template: any) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      thumbnail_url: template.thumbnail_url,
      author_name: template.author_name || template.profiles?.email?.split('@')[0],
      preview_url: template.preview_url,
      usage_count: template.usage_count,
      pricing: template.template_pricing?.[0] || { price: 0, is_paid: false },
      metadata: template.template_metadata?.[0] || {
        category: 'general',
        total_sales: 0,
        rating: 0,
        review_count: 0
      }
    }))

    return NextResponse.json({
      templates: formattedTemplates,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
