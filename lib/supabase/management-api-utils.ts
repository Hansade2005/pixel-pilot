import { SupabaseManagementAPI } from '@dyad-sh/supabase-management-js'

/**
 * Utility function to execute SQL queries via Supabase Management API
 * Handles the "OK (200)" error case where the operation succeeds but the client throws an error
 */
export async function executeManagementQuery(
  client: SupabaseManagementAPI,
  projectId: string,
  sql: string,
  operation: string = 'query'
): Promise<any> {
  try {
    console.log(`[SUPABASE API] Executing ${operation}:`, sql.substring(0, 100) + (sql.length > 100 ? '...' : ''))

    const result = await client.runQuery(projectId, sql)

    console.log(`[SUPABASE API] ${operation} completed successfully`)
    return result

  } catch (error: any) {
    console.error(`[SUPABASE API] ${operation} threw error:`, error)

    // Check if this is actually a successful operation that was misreported
    // The Management API client sometimes throws errors on successful HTTP 200 responses
    if (error.message?.includes('OK (200)')) {
      console.log(`[SUPABASE API] ${operation} appears successful despite error (HTTP 200), treating as success`)

      // For DDL operations (CREATE, DROP, etc.), return success without result data
      if (operation.includes('CREATE') || operation.includes('DROP') || operation.includes('ALTER')) {
        return { success: true, operation }
      }

      // For SELECT operations, return empty array as fallback
      if (operation.includes('SELECT') || operation.includes('SHOW')) {
        return []
      }

      // For other operations, return a generic success indicator
      return { success: true, operation }
    }

    // If it's a real error, re-throw it
    throw error
  }
}

/**
 * Check if a table exists in the database
 */
export async function checkTableExists(
  client: SupabaseManagementAPI,
  projectId: string,
  schema: string,
  tableName: string
): Promise<boolean> {
  try {
    const result = await executeManagementQuery(
      client,
      projectId,
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = '${schema.replace(/'/g, "''")}' AND table_name = '${tableName.replace(/'/g, "''")}') as table_exists`,
      'table existence check'
    )

    // Handle different result formats
    if (Array.isArray(result) && result.length > 0) {
      return Boolean(result[0].table_exists)
    }

    return false
  } catch (error) {
    console.error('[SUPABASE API] Error checking table existence:', error)
    return false
  }
}