"use client"

/**
 * Record Viewer Component - Displays table data in a grid with pagination
 */

import { useState } from "react"
import { 
  Table as TableIcon, 
  RefreshCw, 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Database,
  FileDown,
  Plus,
  Edit,
  Trash2,
  Filter,
  X,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DatabaseTable, TableColumn, TableRecord, PaginationState } from "./types"
import { RecordForm } from "./record-form"
import { SchemaViewer } from "./schema-viewer"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface RecordViewerProps {
  table: DatabaseTable | null
  columns: TableColumn[]
  records: TableRecord[]
  pagination: PaginationState
  isLoading: boolean
  searchQuery: string
  sortColumn: string | null
  sortDirection: 'asc' | 'desc'
  databaseId: string | number
  onRefresh: () => void
  onSearch: (query: string) => void
  onSort: (column: string, direction: 'asc' | 'desc') => void
  onPageChange: (page: number) => void
}

export function RecordViewer({
  table,
  columns,
  records,
  pagination,
  isLoading,
  searchQuery,
  sortColumn,
  sortDirection,
  databaseId,
  onRefresh,
  onSearch,
  onSort,
  onPageChange,
}: RecordViewerProps) {
  const { toast } = useToast()
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set())
  const [recordFormOpen, setRecordFormOpen] = useState(false)
  const [recordFormMode, setRecordFormMode] = useState<'create' | 'edit'>('create')
  const [editingRecord, setEditingRecord] = useState<TableRecord | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingRecord, setDeletingRecord] = useState<TableRecord | null>(null)
  const [filterColumn, setFilterColumn] = useState<string | null>(null)
  const [filterValue, setFilterValue] = useState('')

  // Handle search submission
  const handleSearch = () => {
    onSearch(localSearchQuery)
  }

  // Handle sort toggle
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      onSort(column, sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Default to ascending for new column
      onSort(column, 'asc')
    }
  }

  // Format cell value for display
  const formatCellValue = (value: any): string => {
    if (value === null) return 'NULL'
    if (value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value)
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    return String(value)
  }

  // Handle record selection
  const toggleRecordSelection = (index: number) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set())
    } else {
      setSelectedRecords(new Set(records.map((_, i) => i)))
    }
  }

  // Handle create record
  const handleCreateRecord = () => {
    setRecordFormMode('create')
    setEditingRecord(undefined)
    setRecordFormOpen(true)
  }

  // Handle edit record
  const handleEditRecord = (record: TableRecord) => {
    setRecordFormMode('edit')
    setEditingRecord(record)
    setRecordFormOpen(true)
  }

  // Handle delete record
  const handleDeleteRecord = (record: TableRecord) => {
    setDeletingRecord(record)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingRecord || !table) return

    try {
      const response = await fetch(
        `/api/database/${databaseId}/tables/${table.name}/records`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ record: deletingRecord }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete record')
      }

      toast({
        title: "Success",
        description: "Record deleted successfully",
      })

      onRefresh()
      setDeleteDialogOpen(false)
      setDeletingRecord(null)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete record',
        variant: "destructive",
      })
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedRecords.size === 0 || !table) return

    const recordsToDelete = Array.from(selectedRecords).map(i => records[i])

    try {
      const response = await fetch(
        `/api/database/${databaseId}/tables/${table.name}/records/bulk`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: recordsToDelete }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete records')
      }

      toast({
        title: "Success",
        description: `${selectedRecords.size} records deleted successfully`,
      })

      setSelectedRecords(new Set())
      onRefresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete records',
        variant: "destructive",
      })
    }
  }

  // Export selected or all records
  const exportRecords = (selectedOnly = false) => {
    if (!table) return

    const recordsToExport = selectedOnly 
      ? Array.from(selectedRecords).map(i => records[i])
      : records

    if (recordsToExport.length === 0) return

    // Create CSV header
    const header = columns.map(col => col.name).join(',')
    
    // Create CSV rows
    const rows = recordsToExport.map(record => 
      columns.map(col => {
        const value = formatCellValue(record[col.name])
        return value.includes(',') || value.includes('\n') 
          ? `"${value.replace(/"/g, '""')}"` 
          : value
      }).join(',')
    )

    // Download
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${table.name}${selectedOnly ? '_selected' : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Empty state when no table is selected
  if (!table) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/10">
        <div className="text-center space-y-4">
          <Database className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">No Table Selected</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Select a table from the left panel to view its data
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TableIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{table.name}</h3>
            <span className="text-xs text-muted-foreground">
              ({pagination.totalRecords.toLocaleString()} rows)
            </span>
            {selectedRecords.size > 0 && (
              <span className="text-xs text-blue-600 dark:text-blue-400">
                • {selectedRecords.size} selected
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {selectedRecords.size > 0 ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportRecords(true)}
                  className="h-7"
                >
                  <FileDown className="h-3.5 w-3.5 mr-1" />
                  Export Selected
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="h-7"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete ({selectedRecords.size})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRecords(new Set())}
                  className="h-7"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCreateRecord}
                  className="h-7"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Record
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7">
                      <FileDown className="h-3.5 w-3.5 mr-1" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportRecords(false)}>
                      <FileDown className="h-3.5 w-3.5 mr-2" />
                      Export All Records
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => exportRecords(true)}
                      disabled={selectedRecords.size === 0}
                    >
                      <Check className="h-3.5 w-3.5 mr-2" />
                      Export Selected Only
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="h-7"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Schema Viewer */}
        <SchemaViewer table={table} columns={columns} />

        {/* Search & Filter Bar */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleSearch}
            className="h-8"
          >
            Search
          </Button>
          {localSearchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLocalSearchQuery('')
                onSearch('')
              }}
              className="h-8"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <TableIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No records found</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedRecords.size === records.length && records.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                {columns.map((column) => (
                  <TableHead 
                    key={column.name}
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort(column.name)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.name}</span>
                      {column.is_primary_key && (
                        <span className="text-xs text-blue-500" title="Primary Key">PK</span>
                      )}
                      {sortColumn === column.name && (
                        sortDirection === 'asc' 
                          ? <ArrowUp className="h-3 w-3" />
                          : <ArrowDown className="h-3 w-3" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {column.type}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record, index) => (
                <TableRow 
                  key={index}
                  className={cn(
                    selectedRecords.has(index) && "bg-muted/50"
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedRecords.has(index)}
                      onCheckedChange={() => toggleRecordSelection(index)}
                    />
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell 
                      key={column.name}
                      className={cn(
                        "font-mono text-xs",
                        record[column.name] === null && "text-muted-foreground italic"
                      )}
                    >
                      {formatCellValue(record[column.name])}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRecord(record)}
                        className="h-7 w-7 p-0"
                        title="Edit record"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRecord(record)}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        title="Delete record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>

      {/* Pagination Footer */}
      {pagination.totalPages > 0 && (
        <div className="p-3 border-t border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
              <span className="ml-2">
                ({((pagination.page - 1) * pagination.pageSize + 1).toLocaleString()} - {Math.min(pagination.page * pagination.pageSize, pagination.totalRecords).toLocaleString()} of {pagination.totalRecords.toLocaleString()})
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || isLoading}
                className="h-7"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages || isLoading}
                className="h-7"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Record Form Dialog */}
      {table && (
        <RecordForm
          mode={recordFormMode}
          isOpen={recordFormOpen}
          onClose={() => {
            setRecordFormOpen(false)
            setEditingRecord(undefined)
          }}
          columns={columns}
          record={editingRecord}
          tableName={table.name}
          databaseId={databaseId}
          onSuccess={() => {
            onRefresh()
            setSelectedRecords(new Set())
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
