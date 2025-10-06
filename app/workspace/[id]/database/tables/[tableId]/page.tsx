"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";
import { DataGrid } from "@/components/database/data-grid";
import { AddRecordDialog } from "@/components/database/add-record-dialog";
import { EditRecordDialog } from "@/components/database/edit-record-dialog";
import { DeleteRecordDialog } from "@/components/database/delete-record-dialog";
import type { Table } from "@/lib/supabase";

interface RecordData {
  id: number;
  [key: string]: any;
}

export default function TableRecordsPage() {
  const params = useParams();
  const router = useRouter();
  const [table, setTable] = useState<Table | null>(null);
  const [records, setRecords] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordData | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<RecordData | null>(null);

  const databaseId = params.id as string;
  const tableId = params.tableId as string;

  useEffect(() => {
    loadData();
  }, [databaseId, tableId]);

  async function loadData() {
    try {
      setLoading(true);

      // Get table details
      const tableResponse = await fetch(`/api/database/${databaseId}/tables/${tableId}`);
      const tableData = await tableResponse.json();

      if (!tableResponse.ok) {
        throw new Error(tableData.error || "Failed to load table");
      }

      setTable(tableData.table);

      // Get records
      await loadRecords();
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function loadRecords() {
    try {
      const response = await fetch(
        `/api/database/${databaseId}/tables/${tableId}/records`
      );
      const data = await response.json();

      if (response.ok) {
        setRecords(data.records || []);
      } else {
        throw new Error(data.error || "Failed to load records");
      }
    } catch (error: any) {
      console.error("Error loading records:", error);
      toast.error("Failed to load records");
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
    toast.success("Records refreshed");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!table) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Table Not Found</CardTitle>
            <CardDescription>
              Unable to load table details. Please try again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/workspace/${params.workspaceId || params.id}/database`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{table.name}</h1>
            <p className="text-muted-foreground">
              {records.length} record{records.length !== 1 ? "s" : ""} •{" "}
              {(table.schema_json as any).columns?.length || 0} columns
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <AddRecordDialog
            table={table}
            databaseId={databaseId}
            onSuccess={loadRecords}
          >
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Record
            </Button>
          </AddRecordDialog>
        </div>
      </div>

      {/* Data Grid */}
      <Card>
        <CardContent className="p-6">
          <DataGrid
            table={table}
            records={records}
            loading={refreshing}
            onEdit={setEditingRecord}
            onDelete={setDeletingRecord}
            onRefresh={loadRecords}
          />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingRecord && (
        <EditRecordDialog
          table={table}
          databaseId={databaseId}
          record={editingRecord}
          open={!!editingRecord}
          onOpenChange={(open) => !open && setEditingRecord(null)}
          onSuccess={() => {
            loadRecords();
            setEditingRecord(null);
          }}
        />
      )}

      {/* Delete Dialog */}
      {deletingRecord && (
        <DeleteRecordDialog
          table={table}
          databaseId={databaseId}
          record={deletingRecord}
          open={!!deletingRecord}
          onOpenChange={(open) => !open && setDeletingRecord(null)}
          onSuccess={() => {
            loadRecords();
            setDeletingRecord(null);
          }}
        />
      )}
    </div>
  );
}
