import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, tier } = body

    if (!name) {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 })
    }

    // Generate secure API key
    const prefix = tier === 'free' ? 'pk_test_' : 'pk_live_'
    const randomBytes = crypto.randomBytes(24).toString('hex')
    const apiKey = prefix + randomBytes

    // Store in Cloudflare KV via Worker Management API
    const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN
    const kvNamespaceId = 'e3b571cde10d48e38fdb107e0b9e2911' // API_KEYS namespace

    if (!cloudflareAccountId || !cloudflareApiToken) {
      console.warn('Cloudflare credentials not configured - storing in Supabase only')
    } else {
      // Store in Cloudflare KV
      const keyData = {
        name,
        tier,
        userId: user.id,
        createdAt: new Date().toISOString(),
        totalRequests: 0,
        lastUsedAt: null,
        revoked: false,
        rateLimit: tier === 'free' ? 1000 : tier === 'pro' ? 5000 : 10000
      }

      const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/storage/kv/namespaces/${kvNamespaceId}/values/${encodeURIComponent(apiKey)}`

      await fetch(kvUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(keyData)
      })
    }

    // Store metadata in Supabase
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

    const { error: insertError } = await supabase
      .from('api_keys_metadata')
      .insert({
        user_id: user.id,
        key_hash: keyHash,
        key_prefix: apiKey.substring(0, 12),
        key_name: name,
        tier,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error storing key metadata:', insertError)
      return NextResponse.json({ error: 'Failed to store key metadata' }, { status: 500 })
    }

    return NextResponse.json({ apiKey, name })

  } catch (error: any) {
    console.error('Error generating API key:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
