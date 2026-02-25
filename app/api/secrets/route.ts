import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Derive encryption key from service role key (deterministic, no extra env var needed)
const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(supabaseServiceKey || 'fallback-key-for-dev')
  .digest()

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':')
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted format')
  }
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

// GET - List secrets for a project (metadata only, no values)
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const revealId = searchParams.get('revealId')

    // Reveal a single secret's value (audit logged)
    if (revealId) {
      const { data: secret, error } = await supabase
        .from('project_secrets')
        .select('*')
        .eq('id', revealId)
        .eq('user_id', user.id)
        .single()

      if (error || !secret) {
        return NextResponse.json({ error: 'Secret not found' }, { status: 404 })
      }

      // Audit log the access
      await supabase.from('secret_access_logs').insert({
        user_id: user.id,
        secret_id: revealId,
        action: 'viewed',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        metadata: { key: secret.key, project_id: secret.project_id },
      })

      let value = ''
      try {
        value = decrypt(secret.encrypted_value)
      } catch {
        value = '[decryption failed]'
      }

      return NextResponse.json({ value })
    }

    // List all secrets (no values)
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_secrets')
      .select('id, project_id, key, environment, description, last_synced_at, sync_targets, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .order('key', { ascending: true })

    if (error) {
      console.error('[Secrets] List error:', error)
      return NextResponse.json({ error: 'Failed to fetch secrets' }, { status: 500 })
    }

    return NextResponse.json({ secrets: data || [] })
  } catch (error) {
    console.error('[Secrets] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new secret
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { projectId, key, value, environment, description } = body

    if (!projectId || !key || !value) {
      return NextResponse.json({ error: 'projectId, key, and value are required' }, { status: 400 })
    }

    // Validate key format (uppercase, underscores, no spaces)
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
      return NextResponse.json({
        error: 'Key must be uppercase letters, numbers, and underscores (e.g., STRIPE_SECRET_KEY)',
      }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const encryptedValue = encrypt(value)

    const { data, error } = await supabase
      .from('project_secrets')
      .upsert({
        user_id: user.id,
        project_id: projectId,
        key: key.trim(),
        encrypted_value: encryptedValue,
        environment: environment || 'all',
        description: description?.trim() || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,project_id,key,environment',
      })
      .select('id, project_id, key, environment, description, created_at, updated_at')
      .single()

    if (error) {
      console.error('[Secrets] Create error:', error)
      return NextResponse.json({ error: 'Failed to create secret' }, { status: 500 })
    }

    // Audit log
    await supabase.from('secret_access_logs').insert({
      user_id: user.id,
      secret_id: data.id,
      action: 'created',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      metadata: { key, project_id: projectId, environment: environment || 'all' },
    })

    return NextResponse.json({ secret: data })
  } catch (error) {
    console.error('[Secrets] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a secret
export async function PUT(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, value, description } = body

    if (!id) {
      return NextResponse.json({ error: 'Secret ID is required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    if (value !== undefined) {
      updates.encrypted_value = encrypt(value)
      updates.last_synced_at = null // Mark as unsynced
    }
    if (description !== undefined) {
      updates.description = description?.trim() || null
    }

    const { data, error } = await supabase
      .from('project_secrets')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, project_id, key, environment, description, last_synced_at, created_at, updated_at')
      .single()

    if (error) {
      console.error('[Secrets] Update error:', error)
      return NextResponse.json({ error: 'Failed to update secret' }, { status: 500 })
    }

    // Audit log
    await supabase.from('secret_access_logs').insert({
      user_id: user.id,
      secret_id: id,
      action: 'updated',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      metadata: { key: data.key, value_changed: value !== undefined },
    })

    return NextResponse.json({ secret: data })
  } catch (error) {
    console.error('[Secrets] PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a secret
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Secret ID is required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get secret info for audit log before deleting
    const { data: secret } = await supabase
      .from('project_secrets')
      .select('key, project_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const { error } = await supabase
      .from('project_secrets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[Secrets] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete secret' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Secrets] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
