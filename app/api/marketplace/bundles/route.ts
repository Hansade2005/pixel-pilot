'use server'

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/marketplace/bundles
 * Creator creates a new bundle (vibe pack)
 * 
 * @body {
 *   bundle_name: string,
 *   description: string,
 *   category: string,
 *   theme: string,
 *   bundle_price: number,
 *   template_ids: string[]
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
    const { bundle_name, description, category, theme, bundle_price, template_ids } = body

    // Validate input
    if (!bundle_name || !bundle_price || !template_ids || template_ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create bundle
    const { data: bundle, error: bundleError } = await supabase
      .from('template_bundles')
      .insert({
        creator_id: user.id,
        bundle_name,
        description,
        category,
        theme,
        bundle_price,
        total_templates: template_ids.length,
        is_public: true,
      })
      .select()
      .single()

    if (bundleError) throw bundleError

    // Add templates to bundle
    const bundledTemplates = template_ids.map((template_id: string) => ({
      bundle_id: bundle.id,
      template_id,
    }))

    const { error: bundledError } = await supabase
      .from('bundled_templates')
      .insert(bundledTemplates)

    if (bundledError) throw bundledError

    return NextResponse.json({
      success: true,
      bundle: bundle,
    })
  } catch (error: any) {
    console.error('Bundle creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create bundle' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/marketplace/bundles
 * Get all public bundles with filtering
 * 
 * @query {
 *   category?: string,
 *   theme?: string,
 *   sort?: 'trending' | 'newest' | 'price-low' | 'price-high',
 *   page?: number,
 *   limit?: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const category = searchParams.get('category')
    const theme = searchParams.get('theme')
    const sort = searchParams.get('sort') || 'trending'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('template_bundles')
      .select('*, bundled_templates(count)', { count: 'exact' })
      .eq('is_public', true)

    if (category) {
      query = query.eq('category', category)
    }

    if (theme) {
      query = query.eq('theme', theme)
    }

    // Apply sorting
    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'price-low':
        query = query.order('bundle_price', { ascending: true })
        break
      case 'price-high':
        query = query.order('bundle_price', { ascending: false })
        break
      case 'trending':
      default:
        query = query.order('total_downloads', { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)

    const { data: bundles, count, error } = await query

    if (error) throw error

    return NextResponse.json({
      bundles,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error('Get bundles error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bundles' },
      { status: 500 }
    )
  }
}
