"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table as TableIcon,
  Search,
  RefreshCw,
  Database,
  Plus,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateTableDialog } from "@/components/database/create-table-dialog";
import { AISchemaGenerator } from "@/components/database/ai-schema-generator";
import type { TableExplorerProps } from "./types";
import { toast } from "sonner";

export function TableExplorer({
  tables,
  selectedTable,
  onTableSelect,
  loading,
  databaseId,
  onRefresh,
  onToggleExplorer,
  showExplorer,
}: TableExplorerProps & {
  onToggleExplorer?: () => void;
  showExplorer?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  // Handle AI-generated table creation
  const handleAICreateTable = async (schema: any) => {
    try {
      const response = await fetch(`/api/database/${databaseId}/tables/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: schema.tableName,
          schema_json: {
            columns: schema.columns,
            indexes: schema.indexes || [],
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create table");
      }

      toast.success(`Table '${schema.tableName}' created successfully`);
    } catch (error: any) {
      console.error("Error creating table:", error);
      toast.error(error.message || "Failed to create table");
      throw error; // Re-throw so AISchemaGenerator knows it failed
    }
  };

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
          <div className="flex items-center gap-1">
            {onToggleExplorer && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleExplorer}
                className="h-8 w-8"
                title={showExplorer ? "Hide table explorer" : "Show table explorer"}
              >
                {showExplorer ? <X className="h-3 w-3" /> : <Menu className="h-3 w-3" />}
              </Button>
            )}
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

        {/* Create Table Buttons */}
        <div className="space-y-2">
          <CreateTableDialog
            databaseId={databaseId}
            onSuccess={onRefresh}
          >
            <Button className="w-full" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Table
            </Button>
          </CreateTableDialog>

          <AISchemaGenerator
            databaseId={databaseId}
            onCreateTable={handleAICreateTable}
            onSuccess={onRefresh}
          >
            <Button className="w-full" size="sm" variant="outline">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Schema Generator
            </Button>
          </AISchemaGenerator>
        </div>
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
              <Button
                key={table.id}
                variant={selectedTable?.id === table.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-8 px-3 text-left",
                  selectedTable?.id === table.id && "bg-accent border-primary"
                )}
                onClick={() => onTableSelect(table)}
              >
                <TableIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                <span className="truncate flex-1 text-xs">{table.name}</span>
                <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                  {table.recordCount}
                </span>
              </Button>
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
