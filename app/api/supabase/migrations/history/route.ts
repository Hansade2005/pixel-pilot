import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { MigrationHistoryResponse, ApiResponse, SupabaseToolsError, MigrationRecord } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/supabase/migrations/history
 * Lists migration history
 */
export async function GET(request: NextRequest) {
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

    // Get user's Supabase connection
    const connection = await getUserSupabaseConnection(user.id)
    const supabase = getSupabaseServiceClient(connection)

    // Get migration history
    const { data: migrations, error: historyError } = await supabase
      .from('_supabase_migrations')
      .select('id, name, applied_at, checksum')
      .eq('user_id', user.id)
      .order('applied_at', { ascending: false })

    if (historyError) {
      // If table doesn't exist, return empty history
      if (historyError.code === 'PGRST116' || historyError.message?.includes('does not exist')) {
        const response: MigrationHistoryResponse = {
          migrations: [],
          totalCount: 0
        }

        return NextResponse.json({
          success: true,
          data: response,
          message: 'No migration history found'
        } as ApiResponse<MigrationHistoryResponse>)
      }

      throw new SupabaseToolsError(
        `Failed to get migration history: ${handleDatabaseError(historyError).message}`,
        'MIGRATION_HISTORY_FAILED',
        500
      )
    }

    // Format migration records
    const formattedMigrations: MigrationRecord[] = (migrations || []).map((migration: any) => ({
      id: migration.id,
      name: migration.name,
      appliedAt: migration.applied_at,
      checksum: migration.checksum
    }))

    const response: MigrationHistoryResponse = {
      migrations: formattedMigrations,
      totalCount: formattedMigrations.length
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Found ${formattedMigrations.length} applied migrations`
    } as ApiResponse<MigrationHistoryResponse>)

  } catch (error: any) {
    console.error('Error in migrations history API:', error)

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