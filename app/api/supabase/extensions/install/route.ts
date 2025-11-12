import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { ExtensionInstallRequest, ExtensionInstallResponse, ApiResponse, SupabaseToolsError } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/supabase/extensions/install
 * Installs a PostgreSQL extension
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
    const body: ExtensionInstallRequest = await request.json()

    if (!body.extensionName) {
      throw new SupabaseToolsError('Extension name is required', 'VALIDATION_ERROR', 400)
    }

    // Get user's Supabase connection
    const connection = await getUserSupabaseConnection(user.id)
    const supabase = getSupabaseServiceClient(connection)

    // Check if extension is available
    const { data: availableExtensions, error: availableError } = await supabase
      .from('pg_available_extensions')
      .select('name, installed_version')
      .eq('name', body.extensionName)
      .single()

    if (availableError) {
      throw new SupabaseToolsError(
        `Extension '${body.extensionName}' is not available: ${handleDatabaseError(availableError).message}`,
        'EXTENSION_NOT_AVAILABLE',
        400
      )
    }

    if (availableExtensions?.installed_version) {
      throw new SupabaseToolsError(
        `Extension '${body.extensionName}' is already installed (version: ${availableExtensions.installed_version})`,
        'EXTENSION_ALREADY_INSTALLED',
        409
      )
    }

    // Install the extension using raw SQL
    const schema = body.schema || 'public'
    const installQuery = `CREATE EXTENSION IF NOT EXISTS "${body.extensionName}" SCHEMA ${schema}`

    const { error: installError } = await supabase.rpc('exec_sql', {
      sql: installQuery
    })

    if (installError) {
      // Try direct SQL execution if RPC fails
      try {
        const { error: directError } = await supabase
          .from('_supabase_tools_temp')
          .select('*')
          .limit(0) // This will fail but allows us to execute raw SQL

        // If we get here, try a different approach
        throw new SupabaseToolsError(
          `Failed to install extension '${body.extensionName}': ${handleDatabaseError(installError).message}`,
          'EXTENSION_INSTALL_FAILED',
          500
        )
      } catch {
        // This is expected - we need to use a different approach
        throw new SupabaseToolsError(
          `Failed to install extension '${body.extensionName}': ${handleDatabaseError(installError).message}`,
          'EXTENSION_INSTALL_FAILED',
          500
        )
      }
    }

    // Verify installation
    const { data: verifyData, error: verifyError } = await supabase
      .from('pg_extension')
      .select('extname, extversion')
      .eq('extname', body.extensionName)
      .single()

    if (verifyError || !verifyData) {
      throw new SupabaseToolsError(
        `Extension '${body.extensionName}' was not installed successfully`,
        'EXTENSION_VERIFY_FAILED',
        500
      )
    }

    const response: ExtensionInstallResponse = {
      extensionName: verifyData.extname,
      version: verifyData.extversion,
      schema: schema,
      installed: true
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Extension '${body.extensionName}' installed successfully in schema '${schema}'`
    } as ApiResponse<ExtensionInstallResponse>)

  } catch (error: any) {
    console.error('Error in extensions install API:', error)

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