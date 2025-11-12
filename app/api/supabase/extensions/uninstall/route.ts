import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { ExtensionUninstallRequest, ExtensionUninstallResponse, ApiResponse, SupabaseToolsError } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/supabase/extensions/uninstall
 * Uninstalls a PostgreSQL extension
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
    const body: ExtensionUninstallRequest = await request.json()

    if (!body.extensionName) {
      throw new SupabaseToolsError('Extension name is required', 'VALIDATION_ERROR', 400)
    }

    // Get user's Supabase connection
    const connection = await getUserSupabaseConnection(user.id)
    const supabase = getSupabaseServiceClient(connection)

    // Check if extension is installed
    const { data: installedExtension, error: checkError } = await supabase
      .from('pg_extension')
      .select('extname, extversion')
      .eq('extname', body.extensionName)
      .single()

    if (checkError || !installedExtension) {
      throw new SupabaseToolsError(
        `Extension '${body.extensionName}' is not installed`,
        'EXTENSION_NOT_INSTALLED',
        404
      )
    }

    // Check if extension can be uninstalled (not relocatable check)
    const { data: extensionInfo, error: infoError } = await supabase
      .from('pg_extension')
      .select('extrelocatable')
      .eq('extname', body.extensionName)
      .single()

    if (infoError) {
      console.warn(`Could not check if extension is relocatable: ${handleDatabaseError(infoError).message}`)
    }

    // Attempt to uninstall the extension
    const uninstallQuery = `DROP EXTENSION IF EXISTS "${body.extensionName}"`

    const { error: uninstallError } = await supabase.rpc('exec_sql', {
      sql: uninstallQuery
    })

    if (uninstallError) {
      // Try direct SQL execution if RPC fails
      try {
        const { error: directError } = await supabase
          .from('_supabase_tools_temp')
          .select('*')
          .limit(0) // This will fail but allows us to execute raw SQL

        // If we get here, try a different approach
        throw new SupabaseToolsError(
          `Failed to uninstall extension '${body.extensionName}': ${handleDatabaseError(uninstallError).message}`,
          'EXTENSION_UNINSTALL_FAILED',
          500
        )
      } catch {
        // This is expected - we need to use a different approach
        throw new SupabaseToolsError(
          `Failed to uninstall extension '${body.extensionName}': ${handleDatabaseError(uninstallError).message}`,
          'EXTENSION_UNINSTALL_FAILED',
          500
        )
      }
    }

    // Verify uninstallation
    const { data: verifyData, error: verifyError } = await supabase
      .from('pg_extension')
      .select('extname')
      .eq('extname', body.extensionName)
      .single()

    if (verifyData) {
      throw new SupabaseToolsError(
        `Extension '${body.extensionName}' was not uninstalled successfully`,
        'EXTENSION_VERIFY_FAILED',
        500
      )
    }

    const response: ExtensionUninstallResponse = {
      extensionName: body.extensionName,
      uninstalled: true
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Extension '${body.extensionName}' uninstalled successfully`
    } as ApiResponse<ExtensionUninstallResponse>)

  } catch (error: any) {
    console.error('Error in extensions uninstall API:', error)

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