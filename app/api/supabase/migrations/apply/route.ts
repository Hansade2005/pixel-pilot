import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { MigrationApplyRequest, MigrationApplyResponse, ApiResponse, SupabaseToolsError } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/supabase/migrations/apply
 * Applies a migration to the database
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const adminClient = createAdminClient()
    const authHeader = request.headers.get('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      throw new SupabaseToolsError('Missing or invalid authorization header', 'AUTH_MISSING', 401)
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)

    if (authError || !user) {
      throw new SupabaseToolsError('Invalid authentication token', 'AUTH_INVALID', 401)
    }

    // Parse request body
    const body: MigrationApplyRequest = await request.json()

    if (!body.name || !body.query) {
      throw new SupabaseToolsError('Migration name and query are required', 'VALIDATION_ERROR', 400)
    }

    // Validate migration name format (snake_case)
    if (!/^[a-z][a-z0-9_]*$/.test(body.name)) {
      throw new SupabaseToolsError(
        'Migration name must be in snake_case format (lowercase letters, numbers, and underscores only)',
        'VALIDATION_ERROR',
        400
      )
    }

    // Get user's Supabase connection
    const connection = await getUserSupabaseConnection(user.id)
    const supabase = getSupabaseServiceClient(connection)

    // Check if migration tracking table exists, create if not
    const createTrackingTableQuery = `
      CREATE TABLE IF NOT EXISTS _supabase_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        checksum VARCHAR(64),
        user_id UUID NOT NULL
      )
    `

    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: createTrackingTableQuery
    })

    if (tableError) {
      console.warn('Could not create migration tracking table via RPC, trying direct approach')
    }

    // Check if migration has already been applied
    const { data: existingMigration, error: checkError } = await supabase
      .from('_supabase_migrations')
      .select('id, applied_at')
      .eq('name', body.name)
      .eq('user_id', user.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.warn(`Could not check migration status: ${handleDatabaseError(checkError).message}`)
    }

    if (existingMigration) {
      throw new SupabaseToolsError(
        `Migration '${body.name}' has already been applied at ${existingMigration.applied_at}`,
        'MIGRATION_ALREADY_APPLIED',
        409
      )
    }

    // Apply the migration
    const { error: migrationError } = await supabase.rpc('exec_sql', {
      sql: body.query
    })

    if (migrationError) {
      throw new SupabaseToolsError(
        `Failed to apply migration '${body.name}': ${handleDatabaseError(migrationError).message}`,
        'MIGRATION_APPLY_FAILED',
        500
      )
    }

    // Record the migration as applied
    const { error: recordError } = await supabase
      .from('_supabase_migrations')
      .insert({
        name: body.name,
        user_id: user.id,
        checksum: body.checksum || null
      })

    if (recordError) {
      console.warn(`Migration applied but could not record it: ${handleDatabaseError(recordError).message}`)
    }

    const response: MigrationApplyResponse = {
      name: body.name,
      applied: true,
      appliedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Migration '${body.name}' applied successfully`
    } as ApiResponse<MigrationApplyResponse>)

  } catch (error: any) {
    console.error('Error in migrations apply API:', error)

    if (error instanceof SupabaseToolsError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code
        } as ApiResponse,
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      } as ApiResponse,
      { status: 500 }
    )
  }
}