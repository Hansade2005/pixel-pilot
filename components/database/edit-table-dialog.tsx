"use client";

import React, { useState, useEffect } from "react";
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
import { Loader2, AlertCircle, Save } from "lucide-react";
import { SchemaBuilder } from "./schema-builder";
import { useToast } from "@/hooks/use-toast";
import type { Table, TableSchema } from "@/lib/supabase";

interface EditTableDialogProps {
  table: Table;
  databaseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditTableDialog({
  table,
  databaseId,
  open,
  onOpenChange,
  onSuccess,
}: EditTableDialogProps) {
  const [tableName, setTableName] = useState(table.name);
  const [schema, setSchema] = useState<TableSchema>(
    table.schema_json as TableSchema
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset when table changes
  useEffect(() => {
    setTableName(table.name);
    setSchema(table.schema_json as TableSchema);
    setError(null);
  }, [table]);

  // Validate table name
  const validateTableName = (name: string): string | null => {
    if (!name.trim()) {
      return "Table name is required";
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return "Table name must start with letter/underscore and contain only letters, numbers, underscores";
    }
    if (name.length > 63) {
      return "Table name must be 63 characters or less";
    }
    return null;
  };

  // Check if form is valid
  const isValid =
    !validateTableName(tableName) &&
    schema.columns.length > 0 &&
    schema.columns.every((col) => col.name.trim() !== "");

  // Check if anything changed
  const hasChanges =
    tableName !== table.name ||
    JSON.stringify(schema) !== JSON.stringify(table.schema_json);

  // Handle update table
  const handleUpdateTable = async () => {
    // Validate
    const nameError = validateTableName(tableName);
    if (nameError) {
      setError(nameError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Update table metadata (name and schema)
      const response = await fetch(
        `/api/database/${databaseId}/tables/${table.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: tableName.trim(),
            schema,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update table");
      }

      toast({
        title: "Table updated successfully",
        description: `Table '${tableName}' has been updated`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Failed to update table",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Table: {table.name}</DialogTitle>
          <DialogDescription>
            Modify your table schema. Be careful when changing schema for tables with
            existing records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Warning for existing records */}
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Changing the schema may affect existing
              records. Removing required columns or changing types can cause data loss
              or validation errors.
            </AlertDescription>
          </Alert>

          {/* Table name */}
          <div className="space-y-2">
            <Label htmlFor="edit-table-name">Table Name</Label>
            <Input
              id="edit-table-name"
              value={tableName}
              onChange={(e) => {
                setTableName(e.target.value);
                setError(null);
              }}
              placeholder="e.g., products, customers, orders"
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* Schema builder */}
          <SchemaBuilder schema={schema} onChange={setSchema} />
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
            onClick={handleUpdateTable}
            disabled={!isValid || !hasChanges || loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
