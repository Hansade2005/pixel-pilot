// TypeScript interfaces for Supabase Tools API

// ========== TABLE MANAGEMENT ==========

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  default?: string
  primary_key?: boolean
  foreign_key?: {
    table: string
    column: string
  }
}

export interface TableInfo {
  name: string
  schema: string
  rowCount: number
  size: string
  createdAt: string
  columns: ColumnInfo[]
}

export interface TableListResponse {
  tables: TableInfo[]
  totalCount: number
}

export interface TableReadResponse {
  schema: ColumnInfo[]
  sampleRow: Record<string, any>
  metadata: {
    totalRows: number
    tableSize: string
    lastModified: string
  }
}

export interface CreateTableRequest {
  tableName: string
  schema: string // SQL DDL statement
  ifNotExists?: boolean
}

export interface CreateTableResponse {
  success: boolean
  tableName: string
  message: string
}

export interface DeleteTableRequest {
  tableName: string
  cascade?: boolean // Drop dependent objects
}

export interface DeleteTableResponse {
  success: boolean
  tableName: string
  message: string
}

// ========== RECORD OPERATIONS ==========

export interface InsertRecordRequest {
  tableName: string
  data: Record<string, any>
  onConflict?: string // Column name for conflict resolution
  returning?: string[] // Columns to return
}

export interface InsertRecordResponse {
  success: boolean
  record: Record<string, any>
  message: string
}

export interface UpdateRecordRequest {
  tableName: string
  data: Record<string, any>
  where: Record<string, any>
  returning?: string[]
}

export interface UpdateRecordResponse {
  success: boolean
  records: Record<string, any>[]
  affectedRows: number
  message: string
}

export interface DeleteRecordRequest {
  tableName: string
  where: Record<string, any>
  returning?: string[]
}

export interface DeleteRecordResponse {
  success: boolean
  records: Record<string, any>[]
  affectedRows: number
  message: string
}

// ========== FUNCTION MANAGEMENT ==========

export interface FunctionArgument {
  name: string
  type: string
  default?: string
}

export interface DatabaseFunction {
  name: string
  schema: string
  language: string
  definition: string
  arguments: FunctionArgument[]
  returnType: string
  volatility: 'VOLATILE' | 'STABLE' | 'IMMUTABLE'
  createdAt: string
}

export interface FunctionListResponse {
  functions: DatabaseFunction[]
  totalCount: number
}

export interface CreateFunctionRequest {
  functionName: string
  schema: string
  definition: string
  arguments?: FunctionArgument[]
  returnType: string
  language?: string
  volatility?: 'VOLATILE' | 'STABLE' | 'IMMUTABLE'
}

export interface CreateFunctionResponse {
  success: boolean
  functionName: string
  message: string
}

export interface UpdateFunctionRequest {
  functionName: string
  schema: string
  newDefinition: string
  newArguments?: FunctionArgument[]
  newReturnType?: string
  newVolatility?: 'VOLATILE' | 'STABLE' | 'IMMUTABLE'
}

export interface UpdateFunctionResponse {
  success: boolean
  functionName: string
  message: string
}

export interface DeleteFunctionRequest {
  functionName: string
  schema: string
}

export interface DeleteFunctionResponse {
  success: boolean
  functionName: string
  message: string
}

// ========== EXTENSION MANAGEMENT ==========

export interface ExtensionInfo {
  name: string
  version: string
  description: string
  installed: boolean
  schema: string
  requires: string[]
}

export interface ExtensionListResponse {
  extensions: ExtensionInfo[]
  totalCount: number
}

export interface InstallExtensionRequest {
  extensionName: string
  schema?: string
  version?: string
}

export interface InstallExtensionResponse {
  success: boolean
  extensionName: string
  version: string
  message: string
}

export interface UninstallExtensionRequest {
  extensionName: string
  cascade?: boolean
}

export interface ExtensionInstallRequest {
  extensionName: string
  schema?: string
}

export interface ExtensionInstallResponse {
  extensionName: string
  version: string
  schema: string
  installed: boolean
}

export interface ExtensionUninstallRequest {
  extensionName: string
}

export interface ExtensionUninstallResponse {
  extensionName: string
  uninstalled: boolean
}

// ========== MIGRATION SYSTEM ==========

export interface MigrationInfo {
  id: string
  name: string
  sql: string
  appliedAt: string
  checksum: string
}

export interface ApplyMigrationRequest {
  migrationName: string
  sql: string
  description?: string
}

export interface ApplyMigrationResponse {
  success: boolean
  migrationId: string
  message: string
}

export interface MigrationRecord {
  id: number
  name: string
  appliedAt: string
  checksum?: string
}

export interface MigrationHistoryResponse {
  migrations: MigrationRecord[]
  totalCount: number
}

export interface RollbackMigrationRequest {
  migrationId: string
  targetVersion?: string
}

export interface MigrationApplyRequest {
  name: string
  query: string
  checksum?: string
}

export interface MigrationApplyResponse {
  name: string
  applied: boolean
  appliedAt: string
}

export interface MigrationRollbackRequest {
  migrationName?: string
  migrationId?: number
}

export interface MigrationRollbackResponse {
  migrationName: string
  migrationId: number
  rolledBack: boolean
  rolledBackAt: string
  note: string
}

// ========== COMMON TYPES ==========

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginationParams {
  limit?: number
  offset?: number
  page?: number
  pageSize?: number
}

export interface FilterParams {
  where?: Record<string, any>
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

// ========== AI TOOL DEFINITIONS ==========

export interface AIToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  required?: boolean
  enum?: string[]
}

export interface AIToolDefinition {
  name: string
  description: string
  parameters: Record<string, AIToolParameter>
  returns: {
    type: string
    description: string
  }
}

// ========== ERROR TYPES ==========

export class SupabaseToolsError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'SupabaseToolsError'
  }
}

export class ValidationError extends SupabaseToolsError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400)
    this.name = 'ValidationError'
  }
}

export class DatabaseError extends SupabaseToolsError {
  constructor(message: string, public originalError?: any) {
    super(message, 'DATABASE_ERROR', 500)
    this.name = 'DatabaseError'
  }
}

export class PermissionError extends SupabaseToolsError {
  constructor(message: string) {
    super(message, 'PERMISSION_ERROR', 403)
    this.name = 'PermissionError'
  }
}