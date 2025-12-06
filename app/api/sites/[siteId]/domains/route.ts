import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/sites/[siteId]/domains
 * Get all custom domains for a specific site
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get domains for this site and user
    const { data: domains, error } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('site_id', params.siteId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching domains:', error)
      return NextResponse.json(
        { error: 'Failed to fetch domains' },
        { status: 500 }
      )
    }

    return NextResponse.json({ domains: domains || [] })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sites/[siteId]/domains
 * Add a new custom domain to a site
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient()
    const { domain } = await request.json()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate domain
    if (!domain || typeof domain !== 'string') {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      )
    }

    // Check if domain already exists for this user
    const { data: existingDomain } = await supabase
      .from('custom_domains')
      .select('id')
      .eq('domain', domain)
      .eq('user_id', user.id)
      .single()

    if (existingDomain) {
      return NextResponse.json(
        { error: 'Domain already exists for this user' },
        { status: 409 }
      )
    }

    // Add domain to Vercel
    const vercelResponse = await fetch(`https://api.vercel.com/v10/projects/prj_JFqriEOhgPe8TVrwSk5kjhgTdS9g/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: domain,
      }),
    })

    if (!vercelResponse.ok) {
      const errorData = await vercelResponse.json()
      console.error('Vercel API Error:', errorData)
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to add domain to Vercel' },
        { status: vercelResponse.status }
      )
    }

    const vercelData = await vercelResponse.json()
    console.log('Vercel Add Domain Response:', vercelData)

    // Add to database
    const { data: newDomain, error: dbError } = await supabase
      .from('custom_domains')
      .insert({
        domain: domain,
        site_id: params.siteId,
        user_id: user.id,
        verified: vercelData.verified || false,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database Error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save domain to database' },
        { status: 500 }
      )
    }

    // Return comprehensive response with DNS instructions
    return NextResponse.json({
      domain: newDomain,
      vercel: vercelData,
      dnsInstructions: vercelData.verification || [],
      message: vercelData.verified 
        ? 'Domain added and verified successfully!' 
        : 'Domain added successfully. Please configure DNS records to complete verification.'
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}