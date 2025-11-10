"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table as TableIcon,
  Search,
  RefreshCw,
  Database,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateTableDialog } from "@/components/database/create-table-dialog";
import type { TableExplorerProps } from "./types";

export function TableExplorer({
  tables,
  selectedTable,
  onTableSelect,
  loading,
  databaseId,
  onRefresh,
}: TableExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTables = tables.filter((table) =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Tables</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 w-8"
            title="Refresh tables"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Create Table Button */}
        <CreateTableDialog
          databaseId={databaseId}
          onSuccess={onRefresh}
        >
          <Button className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Table
          </Button>
        </CreateTableDialog>
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <TableIcon className="h-12 w-12 text-muted-foreground mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "No tables match your search"
                : "No tables yet. Create one to get started."}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTables.map((table) => (
              <Card
                key={table.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-accent",
                  selectedTable?.id === table.id && "bg-accent border-primary"
                )}
                onClick={() => onTableSelect(table)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <TableIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {table.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {table.recordCount} record{table.recordCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      {(table.schema_json as any).columns?.length || 0} cols
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          {filteredTables.length} of {tables.length} table
          {tables.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
