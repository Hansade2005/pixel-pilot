"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, AlertCircle, Eye } from "lucide-react";
import { SchemaBuilder } from "./schema-builder";
import { useToast } from "@/hooks/use-toast";
import type { TableSchema } from "@/lib/supabase";

interface CreateTableDialogProps {
  databaseId: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export function CreateTableDialog({
  databaseId,
  onSuccess,
  children,
}: CreateTableDialogProps) {
  const [open, setOpen] = useState(false);
  const [tableName, setTableName] = useState("");
  const [schema, setSchema] = useState<TableSchema>({
    columns: [
      {
        name: "id",
        type: "uuid",
        required: true,
        unique: true,
        defaultValue: "gen_random_uuid()",
      },
      {
        name: "created_at",
        type: "datetime",
        required: true,
        unique: false,
        defaultValue: "NOW()",
      },
    ],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
    // Reserved names
    const reserved = ["users", "databases", "tables", "records"];
    if (reserved.includes(name.toLowerCase())) {
      return `'${name}' is a reserved table name`;
    }
    return null;
  };

  // Check if form is valid
  const isValid =
    !validateTableName(tableName) &&
    schema.columns.length > 0 &&
    schema.columns.every((col) => col.name.trim() !== "");

  // Handle create table
  const handleCreateTable = async () => {
    // Validate
    const nameError = validateTableName(tableName);
    if (nameError) {
      setError(nameError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/database/${databaseId}/tables/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tableName.trim(),
          schema_json: schema,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create table");
      }

      toast({
        title: "Table created successfully",
        description: `Table '${tableName}' with ${schema.columns.length} columns`,
      });

      // Reset and close
      setTableName("");
      setSchema({
        columns: [
          {
            name: "id",
            type: "uuid",
            required: true,
            unique: true,
            defaultValue: "gen_random_uuid()",
          },
          {
            name: "created_at",
            type: "datetime",
            required: true,
            unique: false,
            defaultValue: "NOW()",
          },
        ],
      });
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Failed to create table",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate preview SQL (simplified)
  const generatePreviewSQL = (): string => {
    let sql = `-- This is a preview. Actual storage uses JSONB.\n\n`;
    sql += `Table: ${tableName || "table_name"}\n\n`;
    sql += `Columns:\n`;
    schema.columns.forEach((col) => {
      sql += `  - ${col.name} (${col.type})`;
      if (col.required) sql += ` NOT NULL`;
      if (col.unique) sql += ` UNIQUE`;
      if (col.defaultValue) sql += ` DEFAULT ${col.defaultValue}`;
      sql += `\n`;
    });
    return sql;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Table
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Table</DialogTitle>
          <DialogDescription>
            Design your table schema with columns, types, and constraints. You can
            always modify it later.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="builder" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="builder">Schema Builder</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-4 mt-4">
            {/* Table name */}
            <div className="space-y-2">
              <Label htmlFor="table-name">Table Name</Label>
              <Input
                id="table-name"
                value={tableName}
                onChange={(e) => {
                  setTableName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g., products, customers, orders"
                className={error ? "border-red-500" : ""}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <p className="text-xs text-muted-foreground">
                Use lowercase letters, numbers, and underscores. Must start with a
                letter.
              </p>
            </div>

            {/* Schema builder */}
            <SchemaBuilder schema={schema} onChange={setSchema} />

            {/* Tips */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Pro tips:</strong> Add an 'id' column with UUID type for
                unique identifiers. Use 'created_at' and 'updated_at' with datetime
                type for timestamps.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <div className="rounded-lg border bg-slate-950 p-4">
              <pre className="text-sm text-slate-50 overflow-x-auto">
                {generatePreviewSQL()}
              </pre>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This is a conceptual preview. Data is stored as JSONB in a single table
              with flexible schema.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreateTable} disabled={!isValid || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
