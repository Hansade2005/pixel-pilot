import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { MigrationRollbackRequest, MigrationRollbackResponse, ApiResponse, SupabaseToolsError } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/supabase/migrations/rollback
 * Rolls back a migration (removes it from tracking, does not reverse the SQL)
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
    const body: MigrationRollbackRequest = await request.json()

    if (!body.migrationName && !body.migrationId) {
      throw new SupabaseToolsError('Either migration name or ID is required', 'VALIDATION_ERROR', 400)
    }

    // Get user's Supabase connection
    const connection = await getUserSupabaseConnection(user.id)
    const supabase = getSupabaseServiceClient(connection)

    // Find the migration to rollback
    let query = supabase
      .from('_supabase_migrations')
      .select('id, name, applied_at')
      .eq('user_id', user.id)

    if (body.migrationName) {
      query = query.eq('name', body.migrationName)
    } else if (body.migrationId) {
      query = query.eq('id', body.migrationId)
    }

    const { data: migration, error: findError } = await query.single()

    if (findError || !migration) {
      const identifier = body.migrationName || body.migrationId
      throw new SupabaseToolsError(
        `Migration '${identifier}' not found in history`,
        'MIGRATION_NOT_FOUND',
        404
      )
    }

    // Remove the migration from tracking (rollback)
    const { error: deleteError } = await supabase
      .from('_supabase_migrations')
      .delete()
      .eq('id', migration.id)
      .eq('user_id', user.id)

    if (deleteError) {
      throw new SupabaseToolsError(
        `Failed to rollback migration '${migration.name}': ${handleDatabaseError(deleteError).message}`,
        'MIGRATION_ROLLBACK_FAILED',
        500
      )
    }

    // Note: This does NOT reverse the SQL changes - that's the responsibility of the user
    // to provide a down migration if they want to undo the schema changes

    const response: MigrationRollbackResponse = {
      migrationName: migration.name,
      migrationId: migration.id,
      rolledBack: true,
      rolledBackAt: new Date().toISOString(),
      note: 'Migration removed from tracking. Schema changes are NOT automatically reversed.'
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Migration '${migration.name}' rolled back from tracking (schema changes not reversed)`
    } as ApiResponse<MigrationRollbackResponse>)

  } catch (error: any) {
    console.error('Error in migrations rollback API:', error)

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