"use client"

/**
 * Database Tab - Main container for database management interface
 */

import { useState, useEffect } from "react"
import { Database } from "lucide-react"
import { DatabaseState } from "./types"
import { useToast } from "@/hooks/use-toast"

// Components will be imported below after they are defined
import { TableExplorer } from "@/components/workspace/database-tab/table-explorer"
import { RecordViewer } from "@/components/workspace/database-tab/record-viewer"

interface DatabaseTabProps {
  projectId: string
  databaseId: string | number | null
}

export function DatabaseTab({ projectId, databaseId }: DatabaseTabProps) {
  const { toast } = useToast()
  
  const [state, setState] = useState<DatabaseState>({
    databaseId,
    tables: [],
    selectedTable: null,
    columns: [],
    records: [],
    pagination: {
      page: 1,
      pageSize: 50,
      totalRecords: 0,
      totalPages: 0,
    },
    isLoading: false,
    error: null,
    searchQuery: "",
    sortColumn: null,
    sortDirection: 'asc',
  })

  // Load tables when database ID is available
  useEffect(() => {
    if (databaseId) {
      loadTables()
    }
  }, [databaseId])

  const loadTables = async () => {
    if (!databaseId) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch(`/api/database/${databaseId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load tables: ${response.statusText}`)
      }

      const data = await response.json()
      
      setState(prev => ({
        ...prev,
        tables: data.tables || [],
        isLoading: false,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tables'
      console.error('[DatabaseTab] Error loading tables:', error)
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))

      toast({
        title: "Error Loading Tables",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const selectTable = async (tableId: string) => {
    const table = state.tables.find(t => t.id === tableId)
    if (!table) return

    setState(prev => ({ ...prev, selectedTable: table, isLoading: true }))

    try {
      // Load table structure and initial data
      const [structureRes, dataRes] = await Promise.all([
        fetch(`/api/database/${databaseId}/tables/${table.name}/structure`),
        fetch(`/api/database/${databaseId}/tables/${table.name}/data?page=1&pageSize=${state.pagination.pageSize}`)
      ])

      if (!structureRes.ok || !dataRes.ok) {
        throw new Error('Failed to load table data')
      }

      const structure = await structureRes.json()
      const data = await dataRes.json()

      setState(prev => ({
        ...prev,
        columns: structure.columns || [],
        records: data.rows || [],
        pagination: {
          ...prev.pagination,
          page: 1,
          totalRecords: data.total || 0,
          totalPages: Math.ceil((data.total || 0) / prev.pagination.pageSize),
        },
        isLoading: false,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load table data'
      console.error('[DatabaseTab] Error loading table data:', error)
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))

      toast({
        title: "Error Loading Table",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const refreshData = () => {
    if (state.selectedTable) {
      selectTable(state.selectedTable.id)
    } else {
      loadTables()
    }
  }

  // Show empty state if no database
  if (!databaseId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Database className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">No Database Connected</h3>
            <p className="text-sm text-muted-foreground mt-2">
              This project doesn't have a database yet.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Left Panel - Table Explorer */}
      <div className="w-64 border-r border-border flex-shrink-0">
        <TableExplorer
          tables={state.tables}
          selectedTable={state.selectedTable}
          isLoading={state.isLoading}
          onSelectTable={selectTable}
          onRefresh={loadTables}
        />
      </div>

      {/* Right Panel - Record Viewer */}
      <div className="flex-1">
        <RecordViewer
          table={state.selectedTable}
          columns={state.columns}
          records={state.records}
          pagination={state.pagination}
          isLoading={state.isLoading}
          searchQuery={state.searchQuery}
          sortColumn={state.sortColumn}
          sortDirection={state.sortDirection}
          databaseId={databaseId || ''}
          onRefresh={refreshData}
          onSearch={(query) => setState(prev => ({ ...prev, searchQuery: query }))}
          onSort={(column, direction) => setState(prev => ({ 
            ...prev, 
            sortColumn: column, 
            sortDirection: direction 
          }))}
          onPageChange={(page) => setState(prev => ({
            ...prev,
            pagination: { ...prev.pagination, page }
          }))}
        />
      </div>
    </div>
  )
}
