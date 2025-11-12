import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { ExtensionListResponse, ApiResponse, SupabaseToolsError, ExtensionInfo } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/supabase/extensions/list
 * Lists available and installed extensions
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

    // Query for installed extensions
    const { data: installedExtensions, error: installedError } = await supabase
      .from('pg_extension')
      .select(`
        extname,
        extversion,
        extrelocatable
      `)

    if (installedError) {
      throw new SupabaseToolsError(
        `Failed to list installed extensions: ${handleDatabaseError(installedError).message}`,
        'EXTENSION_LIST_FAILED',
        500
      )
    }

    // Query for available extensions
    const { data: availableExtensions, error: availableError } = await supabase
      .from('pg_available_extensions')
      .select(`
        name,
        default_version,
        installed_version,
        comment
      `)

    if (availableError) {
      throw new SupabaseToolsError(
        `Failed to list available extensions: ${handleDatabaseError(availableError).message}`,
        'EXTENSION_LIST_FAILED',
        500
      )
    }

    // Combine and format extension data
    const extensionsMap = new Map<string, ExtensionInfo>()

    // Add available extensions
    if (availableExtensions) {
      availableExtensions.forEach((ext: any) => {
        extensionsMap.set(ext.name, {
          name: ext.name,
          version: ext.installed_version || ext.default_version || 'unknown',
          description: ext.comment || 'No description available',
          installed: !!ext.installed_version,
          schema: 'public', // Default schema
          requires: [] // Would need additional query to get dependencies
        })
      })
    }

    // Update installed status for installed extensions
    if (installedExtensions) {
      installedExtensions.forEach((ext: any) => {
        if (extensionsMap.has(ext.extname)) {
          const existing = extensionsMap.get(ext.extname)!
          existing.installed = true
          existing.version = ext.extversion
        } else {
          // Add extensions that are installed but not in available list
          extensionsMap.set(ext.extname, {
            name: ext.extname,
            version: ext.extversion,
            description: 'Installed extension',
            installed: true,
            schema: 'public',
            requires: []
          })
        }
      })
    }

    const extensions = Array.from(extensionsMap.values())

    const response: ExtensionListResponse = {
      extensions,
      totalCount: extensions.length
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Found ${extensions.length} extensions (${extensions.filter(e => e.installed).length} installed)`
    } as ApiResponse<ExtensionListResponse>)

  } catch (error: any) {
    console.error('Error in extensions list API:', error)

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