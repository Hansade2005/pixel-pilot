"use client"

/**
 * Table Explorer Component - Displays list of database tables
 */

import { useState } from "react"
import { Table, RefreshCw, Search, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DatabaseTable } from "./types"
import { cn } from "@/lib/utils"

interface TableExplorerProps {
  tables: DatabaseTable[]
  selectedTable: DatabaseTable | null
  isLoading: boolean
  onSelectTable: (tableId: string) => void
  onRefresh: () => void
}

export function TableExplorer({ 
  tables, 
  selectedTable, 
  isLoading, 
  onSelectTable, 
  onRefresh 
}: TableExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter tables by search query
  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Format bytes to human-readable size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Header */}
      <div className="p-3 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Table className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Tables</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-7 w-7 p-0"
            title="Refresh tables"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Table List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading && tables.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Loading tables...</p>
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="text-center py-8">
              <Table className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No tables found" : "No tables yet"}
              </p>
              {!searchQuery && (
                <p className="text-xs text-muted-foreground mt-1">
                  Use the AI chat to create tables
                </p>
              )}
            </div>
          ) : (
            filteredTables.map((table) => (
              <button
                key={table.id}
                onClick={() => onSelectTable(table.id)}
                className={cn(
                  "w-full text-left p-2 rounded-md transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  selectedTable?.id === table.id && "bg-accent text-accent-foreground font-medium"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <Table className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="text-sm truncate">{table.name}</span>
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{table.row_count} rows</span>
                  <span>{formatSize(table.size_bytes)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="p-3 border-t border-border bg-card">
        <div className="text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Total Tables:</span>
            <span className="font-medium">{tables.length}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Total Rows:</span>
            <span className="font-medium">
              {tables.reduce((sum, t) => sum + t.row_count, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
