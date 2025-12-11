// API Routes for Template Marketplace
// Location: app/api/marketplace/

/**
 * Marketplace API Endpoints Documentation
 * All endpoints require authentication unless noted
 */

// ============================================================================
// TEMPLATE PRICING & PURCHASE ENDPOINTS
// ============================================================================

/**
 * POST /api/marketplace/templates/[id]/set-price
 * Creator sets/updates template price
 * 
 * @body {
 *   price: number,
 *   pricing_type: 'one-time' | 'subscription' | 'freemium',
 *   subscription_monthly_price?: number,
 *   discount_percent?: number,
 *   discount_active?: boolean
 * }
 * @returns { success: boolean, message: string }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { id } = params
  const user = await getUser() // Auth
  const body = await req.json()

  // Verify ownership
  const template = await supabase
    .from('public_templates')
    .select('user_id')
    .eq('id', id)
    .single()

  if (template.data.user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Update or create pricing
  const { error } = await supabase
    .from('template_pricing')
    .upsert({
      template_id: id,
      price: body.price,
      pricing_type: body.pricing_type,
      subscription_monthly_price: body.subscription_monthly_price,
      discount_percent: body.discount_percent || 0,
      discount_active: body.discount_active || false,
      updated_at: new Date()
    })

  return NextResponse.json({ success: !error, message: error?.message || 'Price updated' })
}

/**
 * POST /api/marketplace/purchase
 * User purchases a template
 * 
 * @body {
 *   template_id: string,
 *   price: number
 * }
 * @returns { 
 *   success: boolean,
 *   payment_url?: string,
 *   purchase_id?: string
 * }
 */
export async function POST_PURCHASE(req: Request) {
  const user = await getUser()
  const { template_id, price } = await req.json()

  // Get template and creator info
  const { data: template } = await supabase
    .from('public_templates')
    .select('user_id, name, author_name')
    .eq('id', template_id)
    .single()

  // Prevent self-purchase
  if (template.user_id === user.id) {
    return NextResponse.json({ error: 'Cannot purchase own template' }, { status: 400 })
  }

  // Create Stripe checkout session
  const platformFee = price * 0.25 // 25% commission (adjustable)
  const creatorEarnings = price - (price * 0.029 + 0.30) - platformFee

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: `${template.name} - Template` },
          unit_amount: Math.round(price * 100)
        },
        quantity: 1
      }
    ],
    metadata: {
      template_id,
      buyer_id: user.id,
      creator_id: template.user_id,
      platform_fee: platformFee,
      creator_earnings: creatorEarnings
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/workspace?purchase=success&template=${template_id}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/workspace?view=templates`
  })

  // Create pending purchase record
  const { data: purchase } = await supabase
    .from('template_purchases')
    .insert({
      template_id,
      buyer_id: user.id,
      creator_id: template.user_id,
      amount: price,
      platform_fee: platformFee,
      creator_earnings: creatorEarnings,
      payment_intent_id: session.payment_intent,
      status: 'pending'
    })
    .select()
    .single()

  return NextResponse.json({
    success: true,
    payment_url: session.url,
    purchase_id: purchase.id
  })
}

/**
 * GET /api/marketplace/templates/[id]/price
 * Get pricing info for a template
 */
export async function GET_PRICE(req: Request, { params }: { params: { id: string } }) {
  const { data: pricing } = await supabase
    .from('template_pricing')
    .select('*')
    .eq('template_id', params.id)
    .single()

  return NextResponse.json(pricing)
}

// ============================================================================
// CREATOR EARNINGS & ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/marketplace/creator/earnings
 * Get creator's earnings summary and monthly breakdown
 */
export async function GET_CREATOR_EARNINGS(req: Request) {
  const user = await getUser()

  // Total earnings
  const { data: totalEarnings } = await supabase
    .from('creator_earnings')
    .select('creator_earnings')
    .eq('creator_id', user.id)

  const total = totalEarnings?.reduce((sum, row) => sum + row.creator_earnings, 0) || 0

  // Monthly breakdown
  const { data: monthlyEarnings } = await supabase
    .from('creator_earnings')
    .select('month, total_sales, total_revenue, creator_earnings, paid_out')
    .eq('creator_id', user.id)
    .order('month', { ascending: false })

  // Top templates
  const { data: topTemplates } = await supabase
    .from('template_metadata')
    .select('template_id, total_sales, total_revenue, rating')
    .in('template_id', await getCreatorTemplateIds(user.id))
    .order('total_revenue', { ascending: false })
    .limit(5)

  return NextResponse.json({
    total_earnings: total,
    monthly_breakdown: monthlyEarnings,
    top_templates: topTemplates
  })
}

/**
 * GET /api/marketplace/creator/stats
 * Get detailed creator statistics
 */
export async function GET_CREATOR_STATS(req: Request) {
  const user = await getUser()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('total_templates, total_earnings, is_creator')
    .eq('id', user.id)
    .single()

  const { count: totalPurchases } = await supabase
    .from('template_purchases')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', user.id)
    .eq('status', 'completed')

  const { data: avgRating } = await supabase
    .rpc('get_creator_avg_rating', { creator_id: user.id })

  return NextResponse.json({
    total_templates: profiles.total_templates,
    total_earnings: profiles.total_earnings,
    total_sales: totalPurchases,
    average_rating: avgRating,
    is_creator: profiles.is_creator
  })
}

// ============================================================================
// BUNDLE / VIBE PACK ENDPOINTS
// ============================================================================

/**
 * POST /api/marketplace/bundles
 * Creator creates a new bundle
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
export async function POST_BUNDLE(req: Request) {
  const user = await getUser()
  const body = await req.json()

  // Create bundle
  const { data: bundle } = await supabase
    .from('template_bundles')
    .insert({
      creator_id: user.id,
      bundle_name: body.bundle_name,
      description: body.description,
      category: body.category,
      theme: body.theme,
      bundle_price: body.bundle_price,
      total_templates: body.template_ids.length
    })
    .select()
    .single()

  // Add templates to bundle
  const bundledTemplates = body.template_ids.map((template_id: string) => ({
    bundle_id: bundle.id,
    template_id
  }))

  await supabase.from('bundled_templates').insert(bundledTemplates)

  return NextResponse.json(bundle)
}

/**
 * GET /api/marketplace/bundles
 * Get all public bundles with optional filters
 * 
 * @query {
 *   category?: string,
 *   theme?: string,
 *   sort?: 'trending' | 'newest' | 'price-low' | 'price-high'
 * }
 */
export async function GET_BUNDLES(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const theme = searchParams.get('theme')
  const sort = searchParams.get('sort') || 'trending'

  let query = supabase
    .from('template_bundles')
    .select('*')
    .eq('is_public', true)

  if (category) query = query.eq('category', category)
  if (theme) query = query.eq('theme', theme)

  // Apply sorting
  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  } else if (sort === 'price-low') {
    query = query.order('bundle_price', { ascending: true })
  } else if (sort === 'price-high') {
    query = query.order('bundle_price', { ascending: false })
  } else {
    // trending (by downloads)
    query = query.order('total_downloads', { ascending: false })
  }

  const { data: bundles } = await query

  return NextResponse.json(bundles)
}

/**
 * POST /api/marketplace/bundles/[id]/purchase
 * User purchases a bundle (all templates in bundle)
 */
export async function POST_BUNDLE_PURCHASE(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser()

  // Get bundle with templates
  const { data: bundle } = await supabase
    .from('template_bundles')
    .select('*, bundled_templates(template_id)')
    .eq('id', params.id)
    .single()

  // Create checkout for bundle
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: bundle.bundle_name,
            description: bundle.description
          },
          unit_amount: Math.round(bundle.bundle_price * 100)
        },
        quantity: 1
      }
    ],
    metadata: {
      bundle_id: params.id,
      buyer_id: user.id,
      creator_id: bundle.creator_id,
      template_count: bundle.bundled_templates.length
    }
  })

  return NextResponse.json({ payment_url: session.url })
}

// ============================================================================
// TEMPLATE REVIEWS & RATINGS
// ============================================================================

/**
 * POST /api/marketplace/templates/[id]/reviews
 * User submits a review for a template
 */
export async function POST_REVIEW(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser()
  const body = await req.json()

  // Verify purchase
  const { data: purchase } = await supabase
    .from('template_purchases')
    .select('id')
    .eq('template_id', params.id)
    .eq('buyer_id', user.id)
    .eq('status', 'completed')
    .single()

  const { data: review } = await supabase
    .from('template_reviews')
    .insert({
      template_id: params.id,
      reviewer_id: user.id,
      rating: body.rating,
      review_text: body.review_text,
      is_verified_purchase: !!purchase
    })
    .select()
    .single()

  // Update template metadata rating
  await updateTemplateRating(params.id)

  return NextResponse.json(review)
}

/**
 * GET /api/marketplace/templates/[id]/reviews
 * Get reviews for a template
 */
export async function GET_REVIEWS(req: Request, { params }: { params: { id: string } }) {
  const { data: reviews } = await supabase
    .from('template_reviews')
    .select('*, reviewer_id, rating, review_text, created_at')
    .eq('template_id', params.id)
    .order('created_at', { ascending: false })

  return NextResponse.json(reviews)
}

// ============================================================================
// WEBHOOK: STRIPE PAYMENT SUCCESS
// ============================================================================

/**
 * POST /api/webhooks/stripe
 * Handle Stripe events (payment.success, etc)
 */
export async function POST_WEBHOOK(req: Request) {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature || '',
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (error) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'charge.succeeded') {
    const charge = event.data.object

    // Find and update purchase
    const { data: purchase } = await supabase
      .from('template_purchases')
      .select('*')
      .eq('payment_intent_id', charge.payment_intent)
      .single()

    if (purchase) {
      // Mark purchase as completed
      await supabase
        .from('template_purchases')
        .update({ status: 'completed', purchased_at: new Date() })
        .eq('id', purchase.id)

      // Update template metadata
      await supabase.rpc('increment_template_sales', {
        template_id: purchase.template_id,
        amount: purchase.creator_earnings
      })

      // Send confirmation emails
      await sendPurchaseEmail(purchase.buyer_id, purchase.template_id)
      await sendEarningsNotification(purchase.creator_id, purchase.creator_earnings)
    }
  }

  return NextResponse.json({ received: true })
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getCreatorTemplateIds(userId: string) {
  const { data } = await supabase
    .from('public_templates')
    .select('id')
    .eq('user_id', userId)
  return data?.map(t => t.id) || []
}

async function updateTemplateRating(templateId: string) {
  const { data: reviews } = await supabase
    .from('template_reviews')
    .select('rating')
    .eq('template_id', templateId)

  const avgRating = reviews?.reduce((sum, r) => sum + r.rating, 0) / reviews.length || 0

  await supabase
    .from('template_metadata')
    .update({
      rating: avgRating,
      review_count: reviews?.length || 0
    })
    .eq('template_id', templateId)
}

async function sendPurchaseEmail(userId: string, templateId: string) {
  // Implementation: Send email to buyer with template access
}

async function sendEarningsNotification(creatorId: string, amount: number) {
  // Implementation: Notify creator of new sale
}
