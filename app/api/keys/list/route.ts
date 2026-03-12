import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch API keys metadata from Supabase
    const { data: keys, error } = await supabase
      .from('api_keys_metadata')
      .select('*')
      .eq('user_id', user.id)
      .eq('revoked', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    // Format keys for response (hide full key, show only prefix)
    const formattedKeys = keys?.map(key => ({
      id: key.id,
      name: key.key_name,
      key: '••••••••••••••••', // Never expose full key
      key_prefix: key.key_prefix,
      created_at: key.created_at,
      last_used_at: key.last_used_at,
      requests_count: 0, // TODO: Fetch from usage stats
      tier: key.tier
    })) || []

    return NextResponse.json({ keys: formattedKeys })

  } catch (error: any) {
    console.error('Error listing API keys:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
