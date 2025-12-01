"use client";

import { useState, useEffect } from "react";
import { getWorkspaceDatabaseId } from "@/lib/get-current-workspace";
import { toast } from "sonner";
import { Loader2, Database as DatabaseIcon, AlertCircle, Download, Copy, FileJson, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { TableExplorer } from "./table-explorer";
import { RecordViewer } from "./record-viewer";
import { cn } from "@/lib/utils";
import type { DatabaseTabProps, TableWithCount, RecordData } from "./types";

export function DatabaseTab({ workspaceId }: DatabaseTabProps) {
  const [databaseId, setDatabaseId] = useState<string | null>(null);
  const [tables, setTables] = useState<TableWithCount[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableWithCount | null>(null);
  const [records, setRecords] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [showTableExplorer, setShowTableExplorer] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    initializeDatabase();
  }, [workspaceId]);

  // Auto-refresh tables every 5 seconds
  useEffect(() => {
    if (!databaseId) return;

    const interval = setInterval(() => {
      loadTables(databaseId, true); // Silent refresh
    }, 5000);

    return () => clearInterval(interval);
  }, [databaseId]);

  // Auto-refresh records every 5 seconds when a table is selected
  useEffect(() => {
    if (!databaseId || !selectedTable) return;

    const interval = setInterval(() => {
      loadRecords(databaseId, selectedTable.id.toString(), true); // Silent refresh
    }, 5000);

    return () => clearInterval(interval);
  }, [databaseId, selectedTable]);

  async function initializeDatabase() {
    try {
      setLoading(true);

      // Get database ID for this workspace
      const dbId = await getWorkspaceDatabaseId(workspaceId);
      
      if (!dbId) {
        toast.error("No database found for this workspace");
        setLoading(false);
        return;
      }

      setDatabaseId(dbId.toString());
      await loadTables(dbId.toString());
    } catch (error: any) {
      console.error("Error initializing database:", error);
      toast.error(error.message || "Failed to initialize database");
    } finally {
      setLoading(false);
    }
  }

  async function loadTables(dbId: string, silent = false) {
    try {
      const response = await fetch(`/api/database/${dbId}`);
      const data = await response.json();

      if (data.success) {
        const transformedTables = (data.tables || []).map((table: any) => ({
          ...table,
          recordCount: table.record_count || 0,
        }));
        setTables(transformedTables);

        // If a table was selected, update it with the new data
        if (selectedTable) {
          const updatedSelectedTable = transformedTables.find(
            (t: TableWithCount) => t.id === selectedTable.id
          );
          if (updatedSelectedTable) {
            setSelectedTable(updatedSelectedTable);
          } else {
            // Table was deleted
            setSelectedTable(null);
            setRecords([]);
          }
        }
      } else if (!silent) {
        toast.error(data.error || "Failed to load tables");
      }
    } catch (error) {
      if (!silent) {
        console.error("Error loading tables:", error);
        toast.error("Failed to load tables");
      }
    }
  }

  async function loadRecords(dbId: string, tableId: string, silent = false) {
    try {
      if (!silent) setLoadingRecords(true);

      const response = await fetch(`/api/database/${dbId}/tables/${tableId}/records`);
      const data = await response.json();

      if (response.ok) {
        setRecords(data.records || []);
      } else if (!silent) {
        toast.error(data.error || "Failed to load records");
      }
    } catch (error) {
      if (!silent) {
        console.error("Error loading records:", error);
        toast.error("Failed to load records");
      }
    } finally {
      if (!silent) setLoadingRecords(false);
    }
  }

  const handleTableSelect = (table: TableWithCount) => {
    setSelectedTable(table);
    if (databaseId) {
      loadRecords(databaseId, table.id.toString());
    }
    // Close table explorer after selection on both mobile and PC
    setShowTableExplorer(false);
  };

  const handleRefreshTables = () => {
    if (databaseId) {
      loadTables(databaseId);
      toast.success("Tables refreshed");
    }
  };

  const handleRefreshRecords = () => {
    if (databaseId && selectedTable) {
      loadRecords(databaseId, selectedTable.id.toString());
      toast.success("Records refreshed");
    }
  };

  // Export database schema as JSON
  const exportDatabaseSchemaJSON = () => {
    if (!databaseId || tables.length === 0) {
      toast.error("No database schema to export");
      return;
    }

    const databaseSchema = {
      databaseId,
      exportDate: new Date().toISOString(),
      tables: tables.map(table => ({
        id: table.id,
        name: table.name,
        schema: table.schema_json,
        recordCount: table.recordCount,
        created_at: table.created_at,
        updated_at: table.updated_at,
      }))
    };

    const jsonContent = JSON.stringify(databaseSchema, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `database_schema_${databaseId}_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Database schema exported as JSON (${tables.length} tables)`);
  };

  // Export database schema as SQL
  const exportDatabaseSchemaSQL = () => {
    if (!databaseId || tables.length === 0) {
      toast.error("No database schema to export");
      return;
    }

    let sqlContent = `-- Database Schema Export\n-- Database ID: ${databaseId}\n-- Export Date: ${new Date().toISOString()}\n-- Tables: ${tables.length}\n\n`;

    tables.forEach(table => {
      const schema = table.schema_json as any;
      const columns = schema.columns || [];
      
      sqlContent += `-- Table: ${table.name}\n`;
      sqlContent += `CREATE TABLE ${table.name} (\n`;
      
      columns.forEach((col: any, index: number) => {
        const type = col.type.toUpperCase();
        const nullable = col.required ? 'NOT NULL' : 'NULL';
        const defaultValue = col.defaultValue ? ` DEFAULT ${col.defaultValue}` : '';
        const comma = index < columns.length - 1 ? ',' : '';
        
        sqlContent += `  ${col.name} ${type} ${nullable}${defaultValue}${comma}\n`;
      });
      
      sqlContent += `);\n\n`;
    });

    const blob = new Blob([sqlContent], { type: 'text/plain' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `database_schema_${databaseId}_${new Date().toISOString().split('T')[0]}.sql`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Database schema exported as SQL (${tables.length} tables)`);
  };

  // Copy database schema to clipboard
  const copyDatabaseSchema = async () => {
    if (!databaseId || tables.length === 0) {
      toast.error("No database schema to copy");
      return;
    }

    const databaseSchema = {
      databaseId,
      exportDate: new Date().toISOString(),
      tables: tables.map(table => ({
        id: table.id,
        name: table.name,
        schema: table.schema_json,
        recordCount: table.recordCount,
      }))
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(databaseSchema, null, 2));
      toast.success(`Database schema copied to clipboard (${tables.length} tables)`);
    } catch (error) {
      toast.error("Failed to copy schema to clipboard");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!databaseId) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="max-w-md w-full">
          <div className="flex flex-col items-center text-center space-y-4 p-6 border border-border rounded-lg bg-background">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-destructive flex-shrink-0" />
              <div className="text-left">
                <h3 className="text-lg font-semibold text-destructive">No Database Found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This workspace doesn't have a database yet. Create one in the Database page.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => window.open('/workspace/database', '_blank')}
              className="w-full"
            >
              <DatabaseIcon className="h-4 w-4 mr-2" />
              Go to Database Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Database Schema Export Bar */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Database Schema</span>
          <Badge variant="secondary" className="text-xs">
            {tables.length} table{tables.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyDatabaseSchema}
            className="h-7 px-2 text-xs"
            title="Copy database schema to clipboard"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportDatabaseSchemaJSON}>
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportDatabaseSchemaSQL}>
                <FileText className="h-4 w-4 mr-2" />
                Export as SQL
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Table Explorer - Toggleable overlay for both mobile and PC */}
        {showTableExplorer && (
        <div className={cn(
          "border-r border-border overflow-y-auto",
          isMobile
            ? "absolute inset-y-0 left-0 w-80 bg-background shadow-lg z-20 border-r"
            : "w-80 flex-shrink-0"
        )}>
          <TableExplorer
            tables={tables}
            selectedTable={selectedTable}
            onTableSelect={handleTableSelect}
            loading={false}
            databaseId={databaseId}
            onRefresh={handleRefreshTables}
            onToggleExplorer={() => setShowTableExplorer(!showTableExplorer)}
            showExplorer={showTableExplorer}
          />
        </div>
      )}

      {/* Mobile Overlay - Click to close */}
      {isMobile && showTableExplorer && (
        <div
          className="absolute inset-0 bg-black/50 z-10"
          onClick={() => setShowTableExplorer(false)}
        />
      )}

      {/* Right Panel - Record Viewer */}
      <div className={cn(
        "flex-1 overflow-y-auto",
        isMobile ? "pt-4" : "" // Reduced padding for mobile toggle button space
      )}>
        <RecordViewer
          table={selectedTable}
          records={records}
          loading={loadingRecords}
          databaseId={databaseId}
          onRefresh={handleRefreshRecords}
          onToggleExplorer={() => setShowTableExplorer(!showTableExplorer)}
          showExplorer={showTableExplorer}
        />
      </div>
      </div>
    </div>
  );
}
