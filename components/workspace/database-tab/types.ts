/**
 * Type definitions for Database Tab components
 */

export interface DatabaseTable {
  id: string
  name: string
  schema: string
  row_count: number
  size_bytes: number
  created_at: string
  updated_at: string
}

export interface TableColumn {
  name: string
  type: string
  nullable: boolean
  default_value: string | null
  is_primary_key: boolean
  is_foreign_key: boolean
  foreign_key_ref?: {
    table: string
    column: string
  }
}

export interface TableRecord {
  [key: string]: any
}

export interface PaginationState {
  page: number
  pageSize: number
  totalRecords: number
  totalPages: number
}

export interface DatabaseState {
  databaseId: string | number | null
  tables: DatabaseTable[]
  selectedTable: DatabaseTable | null
  columns: TableColumn[]
  records: TableRecord[]
  pagination: PaginationState
  isLoading: boolean
  error: string | null
  searchQuery: string
  sortColumn: string | null
  sortDirection: 'asc' | 'desc'
}
