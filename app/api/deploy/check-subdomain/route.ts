import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const subdomain = url.searchParams.get('subdomain')

    if (!subdomain) {
      return NextResponse.json({ error: 'Subdomain parameter is required' }, { status: 400 })
    }

    // Validate subdomain format
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(subdomain)) {
      return NextResponse.json({
        error: 'Invalid subdomain format',
        available: false
      }, { status: 400 })
    }

    if (subdomain.length > 63) {
      return NextResponse.json({
        error: 'Subdomain too long (max 63 characters)',
        available: false
      }, { status: 400 })
    }

    // Check availability using Supabase function
    const supabase = await createClient()
    const { data: isAvailable, error } = await supabase
      .rpc('is_subdomain_available', { subdomain_param: subdomain })

    if (error) {
      console.error('Error checking subdomain availability:', error)
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
    }

    return NextResponse.json({
      subdomain,
      available: isAvailable,
      url: isAvailable ? `https://${subdomain}.pipilot.dev` : null
    })

  } catch (error) {
    console.error('Error checking subdomain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
