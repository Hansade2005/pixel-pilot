"use client";

import { useState, useEffect } from "react";
import { getWorkspaceDatabaseId } from "@/lib/get-current-workspace";
import { toast } from "sonner";
import { Loader2, Database as DatabaseIcon, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TableExplorer } from "./table-explorer";
import { RecordViewer } from "./record-viewer";
import type { DatabaseTabProps, TableWithCount, RecordData } from "./types";

export function DatabaseTab({ workspaceId }: DatabaseTabProps) {
  const [databaseId, setDatabaseId] = useState<string | null>(null);
  const [tables, setTables] = useState<TableWithCount[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableWithCount | null>(null);
  const [records, setRecords] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

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
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>No Database Found</CardTitle>
            </div>
            <CardDescription>
              This workspace doesn't have a database yet. Create one in the Database page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel - Table Explorer */}
      <div className="w-80 border-r border-border flex-shrink-0 overflow-y-auto">
        <TableExplorer
          tables={tables}
          selectedTable={selectedTable}
          onTableSelect={handleTableSelect}
          loading={false}
          databaseId={databaseId}
          onRefresh={handleRefreshTables}
        />
      </div>

      {/* Right Panel - Record Viewer */}
      <div className="flex-1 overflow-y-auto">
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
