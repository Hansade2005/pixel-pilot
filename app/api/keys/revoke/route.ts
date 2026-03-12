import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { keyId } = body

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 })
    }

    // Mark key as revoked in Supabase
    const { error: updateError } = await supabase
      .from('api_keys_metadata')
      .update({ revoked: true, revoked_at: new Date().toISOString() })
      .eq('id', keyId)
      .eq('user_id', user.id) // Ensure user owns this key

    if (updateError) {
      console.error('Error revoking API key:', updateError)
      return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
    }

    // TODO: Also revoke in Cloudflare KV by updating the key's metadata
    // This would require fetching the actual key from Supabase first

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error revoking API key:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
