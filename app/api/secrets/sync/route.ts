import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(supabaseServiceKey || 'fallback-key-for-dev')
  .digest()

function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':')
  if (!ivHex || !authTagHex || !encrypted) throw new Error('Invalid format')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

// POST - Sync secrets to a deployment platform
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { projectId, platform, vercelProjectId, vercelToken, vercelTeamId, environment } = body

    if (!projectId || !platform) {
      return NextResponse.json({ error: 'projectId and platform are required' }, { status: 400 })
    }

    if (platform !== 'vercel') {
      return NextResponse.json({ error: 'Only Vercel sync is currently supported' }, { status: 400 })
    }

    if (!vercelProjectId || !vercelToken) {
      return NextResponse.json({ error: 'vercelProjectId and vercelToken are required for Vercel sync' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch all secrets for this project
    let query = supabase
      .from('project_secrets')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', projectId)

    if (environment && environment !== 'all') {
      query = query.or(`environment.eq.${environment},environment.eq.all`)
    }

    const { data: secrets, error: fetchError } = await query
    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch secrets' }, { status: 500 })
    }

    if (!secrets || secrets.length === 0) {
      return NextResponse.json({ message: 'No secrets to sync', synced: 0 })
    }

    // Decrypt and prepare variables for Vercel
    const variables = secrets.map(secret => {
      let value = ''
      try {
        value = decrypt(secret.encrypted_value)
      } catch {
        return null
      }

      const envMap: Record<string, string[]> = {
        all: ['production', 'preview', 'development'],
        production: ['production'],
        preview: ['preview'],
        development: ['development'],
      }

      return {
        key: secret.key,
        value,
        type: 'encrypted' as const,
        target: envMap[secret.environment] || ['production', 'preview', 'development'],
      }
    }).filter(Boolean)

    // Push to Vercel via their API
    const teamParam = vercelTeamId ? `?teamId=${vercelTeamId}` : ''
    const vercelRes = await fetch(
      `https://api.vercel.com/v10/projects/${vercelProjectId}/env${teamParam}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variables),
      }
    )

    let synced = 0
    let failed: Array<{ key: string; error: string }> = []

    if (vercelRes.ok) {
      const result = await vercelRes.json()
      synced = Array.isArray(result) ? result.length : variables.length
    } else {
      // Try upsert one by one for better error handling
      for (const v of variables) {
        if (!v) continue
        try {
          const singleRes = await fetch(
            `https://api.vercel.com/v10/projects/${vercelProjectId}/env${teamParam}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${vercelToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                key: v.key,
                value: v.value,
                type: 'encrypted',
                target: v.target,
              }),
            }
          )

          if (singleRes.ok) {
            synced++
          } else {
            const errBody = await singleRes.json().catch(() => ({}))
            // If already exists, try PATCH
            if (errBody?.error?.code === 'ENV_ALREADY_EXISTS') {
              // Get existing env ID
              const listRes = await fetch(
                `https://api.vercel.com/v9/projects/${vercelProjectId}/env${teamParam}`,
                { headers: { 'Authorization': `Bearer ${vercelToken}` } }
              )
              if (listRes.ok) {
                const envList = await listRes.json()
                const existing = envList.envs?.find((e: any) => e.key === v.key)
                if (existing) {
                  const patchRes = await fetch(
                    `https://api.vercel.com/v9/projects/${vercelProjectId}/env/${existing.id}${teamParam}`,
                    {
                      method: 'PATCH',
                      headers: {
                        'Authorization': `Bearer ${vercelToken}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ value: v.value, target: v.target }),
                    }
                  )
                  if (patchRes.ok) {
                    synced++
                  } else {
                    failed.push({ key: v.key, error: 'Failed to update existing variable' })
                  }
                }
              }
            } else {
              failed.push({ key: v.key, error: errBody?.error?.message || 'Unknown error' })
            }
          }
        } catch (err: any) {
          failed.push({ key: v.key, error: err.message })
        }
      }
    }

    // Update sync timestamps
    if (synced > 0) {
      const now = new Date().toISOString()
      await supabase
        .from('project_secrets')
        .update({
          last_synced_at: now,
          sync_targets: [{ platform: 'vercel', project_id: vercelProjectId, synced_at: now }],
        })
        .eq('user_id', user.id)
        .eq('project_id', projectId)

      // Audit log
      for (const secret of secrets) {
        await supabase.from('secret_access_logs').insert({
          user_id: user.id,
          secret_id: secret.id,
          action: 'synced',
          metadata: { platform: 'vercel', vercel_project_id: vercelProjectId },
        })
      }
    }

    return NextResponse.json({
      synced,
      failed: failed.length > 0 ? failed : undefined,
      total: variables.length,
    })
  } catch (error) {
    console.error('[Secrets Sync] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
