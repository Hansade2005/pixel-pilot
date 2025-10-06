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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Table } from "@/lib/supabase";

interface DeleteTableDialogProps {
  table: Table & { recordCount?: number };
  databaseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteTableDialog({
  table,
  databaseId,
  open,
  onOpenChange,
  onSuccess,
}: DeleteTableDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const expectedConfirmText = table.name;
  const isConfirmed = confirmText === expectedConfirmText;

  // Handle delete table
  const handleDeleteTable = async () => {
    if (!isConfirmed) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/database/${databaseId}/tables/${table.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete table");
      }

      toast({
        title: "Table deleted successfully",
        description: `Table '${table.name}' and all its records have been deleted`,
      });

      setConfirmText("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Failed to delete table",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Table: {table.name}
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the table and
            all its records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Warning alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> You are about to delete this table and{" "}
              <strong>{table.recordCount ?? 0} records</strong>. This action is
              irreversible.
            </AlertDescription>
          </Alert>

          {/* Table info */}
          <div className="rounded-lg border bg-muted p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Table Name:</span>
              <span className="font-mono">{table.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Records:</span>
              <span className="font-bold text-red-600">
                {table.recordCount ?? 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Created:</span>
              <span>
                {new Date(table.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Confirmation input */}
          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              Type <strong>{table.name}</strong> to confirm deletion
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expectedConfirmText}
              className="font-mono"
            />
            {confirmText && !isConfirmed && (
              <p className="text-xs text-red-500">
                Text doesn't match. Please type exactly: {expectedConfirmText}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setConfirmText("");
              onOpenChange(false);
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteTable}
            disabled={!isConfirmed || loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
