"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table as TableIcon,
  Database,
  Plus,
  RefreshCw,
  Download,
  FileJson,
  FileText,
  Trash2,
  Edit,
  Code,
} from "lucide-react";
import { DataGrid } from "@/components/database/data-grid";
import { AddRecordDialog } from "@/components/database/add-record-dialog";
import { EditRecordDialog } from "@/components/database/edit-record-dialog";
import { DeleteRecordDialog } from "@/components/database/delete-record-dialog";
import { EditTableDialog } from "@/components/database/edit-table-dialog";
import { DeleteTableDialog } from "@/components/database/delete-table-dialog";
import { SchemaViewer } from "./schema-viewer";
import { toast } from "sonner";
import type { RecordViewerProps, RecordData } from "./types";
import type { TableSchema } from "@/lib/supabase";

export function RecordViewer({
  table,
  records,
  loading,
  databaseId,
  onRefresh,
}: RecordViewerProps) {
  const [editingRecord, setEditingRecord] = useState<RecordData | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<RecordData | null>(null);
  const [editingTable, setEditingTable] = useState(false);
  const [deletingTable, setDeletingTable] = useState(false);
  const [activeTab, setActiveTab] = useState<"records" | "schema">("records");

  if (!table) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Database className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
        <h3 className="text-lg font-medium mb-2">No Table Selected</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Select a table from the left panel to view and manage its records.
        </p>
      </div>
    );
  }

  const schema = table.schema_json as TableSchema;

  // Export functions
  const exportTableData = async (format: "json" | "csv") => {
    try {
      const response = await fetch(
        `/api/database/${databaseId}/tables/${table.id}/export?format=${format}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${table.name}_export.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Data exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <TableIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <h2 className="text-xl font-bold truncate">{table.name}</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {records.length} record{records.length !== 1 ? "s" : ""} •{" "}
              {schema.columns?.length || 0} columns
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditingTable(true)}
              title="Edit table schema"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeletingTable(true)}
              title="Delete table"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Records</p>
                  <p className="text-2xl font-bold">{records.length}</p>
                </div>
                <Database className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Columns</p>
                  <p className="text-2xl font-bold">{schema.columns?.length || 0}</p>
                </div>
                <TableIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Table ID</p>
                  <p className="text-sm font-medium">{table.id}</p>
                </div>
                <Code className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="records">
                <Database className="h-4 w-4 mr-2" />
                Records
              </TabsTrigger>
              <TabsTrigger value="schema">
                <Code className="h-4 w-4 mr-2" />
                Schema
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportTableData("json")}
              title="Export as JSON"
            >
              <FileJson className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportTableData("csv")}
              title="Export as CSV"
            >
              <FileText className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh records"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <AddRecordDialog
              table={table}
              databaseId={databaseId}
              onSuccess={onRefresh}
            >
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </AddRecordDialog>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "records" ? (
          <Card>
            <CardContent className="p-0">
              <DataGrid
                table={table}
                records={records}
                loading={loading}
                onEdit={setEditingRecord}
                onDelete={setDeletingRecord}
                onRefresh={onRefresh}
              />
            </CardContent>
          </Card>
        ) : (
          <SchemaViewer table={table} />
        )}
      </div>

      {/* Dialogs */}
      {editingRecord && (
        <EditRecordDialog
          table={table}
          databaseId={databaseId}
          record={editingRecord}
          open={!!editingRecord}
          onOpenChange={(open) => !open && setEditingRecord(null)}
          onSuccess={() => {
            onRefresh();
            setEditingRecord(null);
          }}
        />
      )}

      {deletingRecord && (
        <DeleteRecordDialog
          table={table}
          databaseId={databaseId}
          record={deletingRecord}
          open={!!deletingRecord}
          onOpenChange={(open) => !open && setDeletingRecord(null)}
          onSuccess={() => {
            onRefresh();
            setDeletingRecord(null);
          }}
        />
      )}

      {editingTable && (
        <EditTableDialog
          table={table}
          databaseId={databaseId}
          open={editingTable}
          onOpenChange={setEditingTable}
          onSuccess={() => {
            onRefresh();
            setEditingTable(false);
          }}
        />
      )}

      {deletingTable && (
        <DeleteTableDialog
          table={table}
          databaseId={databaseId}
          open={deletingTable}
          onOpenChange={setDeletingTable}
          onSuccess={() => {
            onRefresh();
            setDeletingTable(false);
          }}
        />
      )}
    </div>
  );
}
