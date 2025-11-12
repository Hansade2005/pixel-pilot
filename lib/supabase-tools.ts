import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Connection interface for Supabase operations
export interface SupabaseConnection {
  projectUrl: string
  anonKey: string
  serviceRoleKey: string
  projectId: string
  userId: string
}

// Database operation result types
export interface DatabaseResult<T = any> {
  success: boolean
  data?: T
  error?: DatabaseError
  metadata?: {
    executionTime?: number
    affectedRows?: number
    query?: string
  }
}

// Error types for database operations
export interface DatabaseError {
  code: string
  message: string
  details?: any
  hint?: string
  position?: number
  severity?: string
}

// Table metadata interfaces
export interface TableInfo {
  name: string
  schema: string
  rowCount?: number
  size?: string
  createdAt?: string
  lastModified?: string
}

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  defaultValue?: any
  primaryKey?: boolean
  foreignKey?: {
    table: string
    column: string
  }
}

export interface TableSchema {
  columns: ColumnInfo[]
  indexes: IndexInfo[]
  constraints: ConstraintInfo[]
  triggers: TriggerInfo[]
}

export interface IndexInfo {
  name: string
  columns: string[]
  unique: boolean
  type: string
}

export interface ConstraintInfo {
  name: string
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'NOT NULL'
  columns: string[]
  definition?: string
}

export interface TriggerInfo {
  name: string
  event: string
  timing: string
  function: string
}

// Record operation interfaces
export interface InsertRecordRequest {
  tableName: string
  data: Record<string, any>
  onConflict?: string
  returning?: string[]
}

export interface UpdateRecordRequest {
  tableName: string
  data: Record<string, any>
  where: Record<string, any>
  returning?: string[]
}

export interface DeleteRecordRequest {
  tableName: string
  where: Record<string, any>
  returning?: string[]
}

export interface QueryRecordsRequest {
  tableName: string
  select?: string
  where?: Record<string, any>
  orderBy?: Record<string, 'asc' | 'desc'>
  limit?: number
  offset?: number
}

// Function management interfaces
export interface DatabaseFunction {
  name: string
  schema: string
  language: string
  definition: string
  arguments: FunctionArgument[]
  returnType: string
  volatility: 'VOLATILE' | 'STABLE' | 'IMMUTABLE'
  security: 'SECURITY DEFINER' | 'SECURITY INVOKER'
}

export interface FunctionArgument {
  name: string
  type: string
  defaultValue?: any
}

// Extension management interfaces
export interface ExtensionInfo {
  name: string
  version: string
  description: string
  installed: boolean
  schema: string
  requires: string[]
}

// Migration interfaces
export interface MigrationRequest {
  name: string
  sql: string
  direction: 'up' | 'down'
}

export interface MigrationHistory {
  id: string
  name: string
  executedAt: string
  success: boolean
  error?: string
  checksum: string
}

// Utility functions for connection management
export async function getUserSupabaseConnection(): Promise<SupabaseConnection> {
  const cookieStore = await cookies()

  // Get user session from auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('User not authenticated')
  }

  // Get stored Supabase project details
  const { data: projectDetails, error: projectError } = await supabase
    .from('user_supabase_projects')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_selected', true)
    .single()

  if (projectError || !projectDetails) {
    throw new Error('No Supabase project selected')
  }

  return {
    projectUrl: projectDetails.project_url,
    anonKey: projectDetails.anon_key,
    serviceRoleKey: projectDetails.service_role_key,
    projectId: projectDetails.project_id,
    userId: user.id
  }
}

export function getServiceClient(connection: SupabaseConnection): SupabaseClient {
  return createClient(connection.projectUrl, connection.serviceRoleKey, {
    auth: { persistSession: false }
  })
}

export function getAnonClient(connection: SupabaseConnection): SupabaseClient {
  return createClient(connection.projectUrl, connection.anonKey, {
    auth: { persistSession: false }
  })
}

// Error handling utility
export function handleDatabaseError(error: any): DatabaseError {
  return {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected database error occurred',
    details: error.details,
    hint: error.hint,
    position: error.position,
    severity: error.severity
  }
}

// SQL query building utilities
export function buildSelectQuery(
  tableName: string,
  columns?: string[],
  where?: Record<string, any>,
  orderBy?: Record<string, 'asc' | 'desc'>,
  limit?: number,
  offset?: number
): string {
  let query = `SELECT ${columns ? columns.join(', ') : '*'} FROM ${tableName}`

  if (where && Object.keys(where).length > 0) {
    const conditions = Object.entries(where).map(([key, value], index) =>
      `${key} = $${index + 1}`
    )
    query += ` WHERE ${conditions.join(' AND ')}`
  }

  if (orderBy && Object.keys(orderBy).length > 0) {
    const orderClauses = Object.entries(orderBy).map(([column, direction]) =>
      `${column} ${direction.toUpperCase()}`
    )
    query += ` ORDER BY ${orderClauses.join(', ')}`
  }

  if (limit) {
    query += ` LIMIT ${limit}`
  }

  if (offset) {
    query += ` OFFSET ${offset}`
  }

  return query
}

export function buildInsertQuery(
  tableName: string,
  data: Record<string, any>,
  returning?: string[]
): string {
  const columns = Object.keys(data)
  const values = Object.values(data)
  const placeholders = values.map((_, index) => `$${index + 1}`)

  let query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`

  if (returning && returning.length > 0) {
    query += ` RETURNING ${returning.join(', ')}`
  }

  return query
}

export function buildUpdateQuery(
  tableName: string,
  data: Record<string, any>,
  where: Record<string, any>,
  returning?: string[]
): string {
  const setClauses = Object.keys(data).map((key, index) =>
    `${key} = $${index + 1}`
  )

  const whereClauses = Object.entries(where).map(([key, _], index) =>
    `${key} = $${Object.keys(data).length + index + 1}`
  )

  let query = `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`

  if (returning && returning.length > 0) {
    query += ` RETURNING ${returning.join(', ')}`
  }

  return query
}

export function buildDeleteQuery(
  tableName: string,
  where: Record<string, any>,
  returning?: string[]
): string {
  const whereClauses = Object.entries(where).map(([key, _], index) =>
    `${key} = $${index + 1}`
  )

  let query = `DELETE FROM ${tableName} WHERE ${whereClauses.join(' AND ')}`

  if (returning && returning.length > 0) {
    query += ` RETURNING ${returning.join(', ')}`
  }

  return query
}