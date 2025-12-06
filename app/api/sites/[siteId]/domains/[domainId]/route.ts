import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/sites/[siteId]/domains/[domainId]/verify
 * Manually verify a domain
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string; domainId: string } }
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

    // Get domain details
    const { data: domain, error: domainError } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('id', params.domainId)
      .eq('user_id', user.id)
      .single()

    if (domainError || !domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }

    // Verify domain with Vercel
    const vercelResponse = await fetch(`https://api.vercel.com/v9/projects/prj_JFqriEOhgPe8TVrwSk5kjhgTdS9g/domains/${domain.domain}`, {
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
      },
    })

    if (!vercelResponse.ok) {
      const errorData = await vercelResponse.json()
      console.error('Vercel API Error:', errorData)
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to check domain status' },
        { status: vercelResponse.status }
      )
    }

    const vercelData = await vercelResponse.json()
    console.log('Vercel Verify Domain Response:', vercelData)

    // Update database if verification status changed
    if (vercelData.verified !== domain.verified) {
      const { error: updateError } = await supabase
        .from('custom_domains')
        .update({
          verified: vercelData.verified,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.domainId)

      if (updateError) {
        console.error('Database Update Error:', updateError)
      }
    }

    return NextResponse.json({
      verified: vercelData.verified,
      domain: domain.domain,
      updated: vercelData.verified !== domain.verified,
      vercel: vercelData
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/sites/[siteId]/domains/[domainId]
 * Remove a custom domain
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { siteId: string; domainId: string } }
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

    // Get domain details
    const { data: domain, error: domainError } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('id', params.domainId)
      .eq('user_id', user.id)
      .single()

    if (domainError || !domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }

    // Remove from Vercel
    const vercelResponse = await fetch(`https://api.vercel.com/v9/projects/prj_JFqriEOhgPe8TVrwSk5kjhgTdS9g/domains/${domain.domain}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
      },
    })

    // Log the response for debugging
    console.log('Vercel Delete Response Status:', vercelResponse.status)
    
    if (!vercelResponse.ok && vercelResponse.status !== 404) {
      const errorText = await vercelResponse.text()
      console.warn('Vercel domain deletion warning:', errorText)
      // Don't fail the request if Vercel deletion fails, just log it
    }

    // Remove from database
    const { error: dbError } = await supabase
      .from('custom_domains')
      .delete()
      .eq('id', params.domainId)

    if (dbError) {
      console.error('Database Error:', dbError)
      return NextResponse.json(
        { error: 'Failed to delete domain from database' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Domain deleted successfully',
      domain: domain.domain
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}