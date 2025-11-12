import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export interface SupabaseConnection {
  projectUrl: string
  serviceRoleKey: string
  projectId: string
  userId: string
}

export interface UserSupabaseSettings {
  supabase_project_url: string
  supabase_service_role_key: string
  supabase_selected_project_id: string
}

/**
 * Get user's Supabase connection details from our database
 */
export const getUserSupabaseConnection = async (userId: string): Promise<SupabaseConnection> => {
  const adminClient = createAdminClient()

  const { data: settings, error } = await adminClient
    .from('user_settings')
    .select('supabase_project_url, supabase_service_role_key, supabase_selected_project_id')
    .eq('user_id', userId)
    .single()

  if (error) {
    throw new Error(`Failed to retrieve Supabase settings: ${error.message}`)
  }

  if (!settings?.supabase_project_url || !settings?.supabase_service_role_key || !settings?.supabase_selected_project_id) {
    throw new Error('Incomplete Supabase settings found for user')
  }

  return {
    projectUrl: settings.supabase_project_url,
    serviceRoleKey: settings.supabase_service_role_key,
    projectId: settings.supabase_selected_project_id,
    userId
  }
}

/**
 * Create a Supabase client with service role key (bypasses RLS)
 */
export const getSupabaseServiceClient = (connection: SupabaseConnection): SupabaseClient => {
  return createClient(connection.projectUrl, connection.serviceRoleKey, {
    auth: { persistSession: false }
  })
}

/**
 * Validate Supabase connection by testing a simple query
 */
export const validateSupabaseConnection = async (connection: SupabaseConnection): Promise<boolean> => {
  try {
    const client = getSupabaseServiceClient(connection)

    // Test connection with a simple query
    const { error } = await client
      .from('pg_tables')
      .select('tablename')
      .limit(1)

    return !error
  } catch (error) {
    console.error('Supabase connection validation failed:', error)
    return false
  }
}

/**
 * Database error types for better error handling
 */
export interface DatabaseError {
  code: string
  message: string
  details?: any
  hint?: string
  position?: number
}

/**
 * Normalize database errors into a consistent format
 */
export const handleDatabaseError = (error: any): DatabaseError => {
  return {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected database error occurred',
    details: error.details,
    hint: error.hint,
    position: error.position
  }
}

/**
 * Common PostgreSQL error codes
 */
export const POSTGRES_ERROR_CODES = {
  DUPLICATE_KEY: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  INVALID_TEXT_REPRESENTATION: '22P02',
  UNDEFINED_TABLE: '42P01',
  UNDEFINED_COLUMN: '42703',
  SYNTAX_ERROR: '42601',
  INSUFFICIENT_PRIVILEGE: '42501'
} as const