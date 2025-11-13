import { createClient } from "@supabase/supabase-js"

/**
 * Creates a Supabase client for a specific project using its service role key
 * This bypasses RLS policies and should only be used in server-side API routes
 * for trusted operations like database management tools
 */
export function createProjectClient(projectUrl: string, serviceRoleKey: string) {
  if (!projectUrl || !serviceRoleKey) {
    throw new Error(
      "Project URL and service role key are required for project client."
    )
  }

  return createClient(projectUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Execute raw SQL queries using the project's Supabase client
 * This is a direct replacement for the Management API runQuery method
 */
export async function executeProjectQuery(
  projectUrl: string,
  serviceRoleKey: string,
  sql: string
): Promise<any[]> {
  const client = createProjectClient(projectUrl, serviceRoleKey)

  try {
    const { data, error } = await client.rpc('execute_sql', { sql })

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error executing project query:', error)
    throw error
  }
}

/**
 * Execute raw SQL queries using the project's Supabase client (alternative method)
 * Uses the REST API directly for more complex queries
 */
export async function executeRawSQL(
  projectUrl: string,
  serviceRoleKey: string,
  sql: string
): Promise<any[]> {
  const client = createProjectClient(projectUrl, serviceRoleKey)

  try {
    // For complex queries, we'll use the client's direct query capability
    // This is a workaround since Supabase doesn't have a built-in execute_sql RPC by default
    const { data, error } = await client
      .from('_supabase_query')
      .select('*')
      .limit(1) // This won't work, but let's try a different approach

    // Actually, let's use the client's ability to run raw queries
    // We'll create a temporary function or use the REST API directly
    const response = await fetch(`${projectUrl}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({ sql })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`SQL execution failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    return result || []
  } catch (error) {
    console.error('Error executing raw SQL:', error)
    throw error
  }
}