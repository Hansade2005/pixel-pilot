"use client"

import { Info, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { TableColumn, DatabaseTable } from "./types"
import { useState } from "react"

interface SchemaViewerProps {
  table: DatabaseTable
  columns: TableColumn[]
}

export function SchemaViewer({ table, columns }: SchemaViewerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const primaryKeys = columns.filter(col => col.is_primary_key)
  const foreignKeys = columns.filter(col => col.is_foreign_key)
  const requiredFields = columns.filter(col => !col.nullable && !col.default_value)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5" />
            <span>Table Schema</span>
            <Badge variant="secondary" className="text-xs">
              {columns.length} columns
            </Badge>
          </div>
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2">
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          {/* Table Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Table Information</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <span className="ml-2 font-mono">{table.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Schema:</span>
                <span className="ml-2 font-mono">{table.schema}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Rows:</span>
                <span className="ml-2">{table.row_count.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Size:</span>
                <span className="ml-2">
                  {(table.size_bytes / 1024).toFixed(2)} KB
                </span>
              </div>
            </div>
          </div>

          {/* Keys Summary */}
          {(primaryKeys.length > 0 || foreignKeys.length > 0) && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Keys</h4>
              <div className="space-y-1 text-xs">
                {primaryKeys.length > 0 && (
                  <div>
                    <Badge variant="default" className="text-xs mr-2">Primary Key</Badge>
                    {primaryKeys.map(k => k.name).join(', ')}
                  </div>
                )}
                {foreignKeys.length > 0 && (
                  <div>
                    <Badge variant="secondary" className="text-xs mr-2">Foreign Keys</Badge>
                    {foreignKeys.map(k => (
                      <span key={k.name} className="mr-2">
                        {k.name}
                        {k.foreign_key_ref && ` → ${k.foreign_key_ref.table}.${k.foreign_key_ref.column}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Required Fields */}
          {requiredFields.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Required Fields</h4>
              <div className="text-xs text-muted-foreground">
                {requiredFields.map(f => f.name).join(', ')}
              </div>
            </div>
          )}

          {/* All Columns */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Columns</h4>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {columns.map((col) => (
                  <div
                    key={col.name}
                    className="border rounded p-2 bg-card text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-medium">{col.name}</span>
                      <div className="flex gap-1">
                        {col.is_primary_key && (
                          <Badge variant="default" className="text-xs px-1 py-0">PK</Badge>
                        )}
                        {col.is_foreign_key && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">FK</Badge>
                        )}
                        {!col.nullable && (
                          <Badge variant="destructive" className="text-xs px-1 py-0">Required</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-muted-foreground">
                      Type: <span className="font-mono">{col.type}</span>
                    </div>
                    {col.default_value && (
                      <div className="text-muted-foreground">
                        Default: <span className="font-mono">{col.default_value}</span>
                      </div>
                    )}
                    {col.foreign_key_ref && (
                      <div className="text-purple-600 dark:text-purple-400">
                        References: <span className="font-mono">
                          {col.foreign_key_ref.table}.{col.foreign_key_ref.column}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
