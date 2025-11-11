"use client";

import { useState, useEffect } from "react";
import { getWorkspaceDatabaseId } from "@/lib/get-current-workspace";
import { toast } from "sonner";
import { Loader2, Database as DatabaseIcon, AlertCircle, Menu, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const [showTableExplorer, setShowTableExplorer] = useState(false);
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
    // Close table explorer on mobile after selection
    if (isMobile) {
      setShowTableExplorer(false);
    }
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
    <div className="flex h-full overflow-hidden relative">
      {/* Mobile Table Explorer Toggle Button */}
      {isMobile && (
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowTableExplorer(!showTableExplorer)}
            className="bg-background border shadow-md"
          >
            {showTableExplorer ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Table Explorer - Desktop: Always visible, Mobile: Toggleable overlay */}
      {(!isMobile || showTableExplorer) && (
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
        isMobile ? "pt-16" : "" // Add top padding on mobile for the toggle button
      )}>
        <RecordViewer
          table={selectedTable}
          records={records}
          loading={loadingRecords}
          databaseId={databaseId}
          onRefresh={handleRefreshRecords}
        />
      </div>
    </div>
  );
}
