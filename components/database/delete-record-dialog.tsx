"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Table } from "@/lib/supabase";

interface DeleteRecordDialogProps {
  table: Table;
  databaseId: string;
  record: Record<string, any> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteRecordDialog({
  table,
  databaseId,
  record,
  open,
  onOpenChange,
  onSuccess,
}: DeleteRecordDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!record) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/database/${databaseId}/tables/${table.id}/records`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordId: record.id }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete record");
      }

      toast({
        title: "Record deleted successfully",
        description: `Removed record from ${table.name}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Failed to delete record",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Record
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> You are about to permanently delete this
              record. This action cannot be undone.
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Record Details:</p>
            <div className="text-sm space-y-1">
              {Object.entries(record).slice(0, 5).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{key}:</span>
                  <span className="truncate ml-2 max-w-[200px]">
                    {typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
