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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Table, TableSchema, Column } from "@/lib/supabase";

interface EditRecordDialogProps {
  table: Table;
  databaseId: string;
  record: Record<string, any> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditRecordDialog({
  table,
  databaseId,
  record,
  open,
  onOpenChange,
  onSuccess,
}: EditRecordDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const schema = table.schema_json as TableSchema;

  // Reset form when record changes
  useEffect(() => {
    if (record) {
      setFormData({ ...record });
      setErrors({});
    }
  }, [record]);

  // Get input component based on column type
  const getInputComponent = (column: Column) => {
    const value = formData[column.name] ?? "";
    const error = errors[column.name];

    const handleChange = (newValue: any) => {
      setFormData((prev) => ({ ...prev, [column.name]: newValue }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[column.name];
        return newErrors;
      });
    };

    // Read-only for id and auto-generated timestamps
    const isReadOnly = !!(
      column.name === "id" ||
      (column.type === "uuid" && column.defaultValue) ||
      (column.name === "created_at" && column.defaultValue)
    );

    switch (column.type) {
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`field-${column.name}`}
              checked={!!value}
              onCheckedChange={handleChange}
              disabled={isReadOnly}
            />
            <Label
              htmlFor={`field-${column.name}`}
              className="cursor-pointer font-normal"
            >
              {column.name}
            </Label>
          </div>
        );

      case "number":
        return (
          <div className="space-y-2">
            <Label htmlFor={`field-${column.name}`}>
              {column.name}
              {column.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={`field-${column.name}`}
              type="number"
              value={value}
              onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
              placeholder={`Enter ${column.name}`}
              className={error ? "border-red-500" : ""}
              disabled={isReadOnly}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      case "json":
        return (
          <div className="space-y-2">
            <Label htmlFor={`field-${column.name}`}>
              {column.name}
              {column.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={`field-${column.name}`}
              value={typeof value === "string" ? value : JSON.stringify(value, null, 2)}
              onChange={(e) => handleChange(e.target.value)}
              placeholder='{"key": "value"}'
              className={`font-mono text-sm ${error ? "border-red-500" : ""}`}
              rows={4}
              disabled={isReadOnly}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      case "date":
      case "datetime":
      case "timestamp":
        const dateValue = value ? new Date(value).toISOString().slice(0, column.type === "date" ? 10 : 16) : "";
        return (
          <div className="space-y-2">
            <Label htmlFor={`field-${column.name}`}>
              {column.name}
              {column.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={`field-${column.name}`}
              type={column.type === "date" ? "date" : "datetime-local"}
              value={dateValue}
              onChange={(e) => handleChange(e.target.value)}
              className={error ? "border-red-500" : ""}
              disabled={isReadOnly}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      case "email":
        return (
          <div className="space-y-2">
            <Label htmlFor={`field-${column.name}`}>
              {column.name}
              {column.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={`field-${column.name}`}
              type="email"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="user@example.com"
              className={error ? "border-red-500" : ""}
              disabled={isReadOnly}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      case "url":
        return (
          <div className="space-y-2">
            <Label htmlFor={`field-${column.name}`}>
              {column.name}
              {column.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={`field-${column.name}`}
              type="url"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="https://example.com"
              className={error ? "border-red-500" : ""}
              disabled={isReadOnly}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={`field-${column.name}`}>
              {column.name}
              {column.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={`field-${column.name}`}
              type="text"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={`Enter ${column.name}`}
              className={error ? "border-red-500" : ""}
              disabled={isReadOnly}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            {isReadOnly && (
              <p className="text-xs text-muted-foreground">Read-only field</p>
            )}
          </div>
        );
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    schema.columns.forEach((column) => {
      const value = formData[column.name];

      if (column.required && !value) {
        newErrors[column.name] = "This field is required";
      }

      if (column.type === "json" && value) {
        try {
          JSON.parse(typeof value === "string" ? value : JSON.stringify(value));
        } catch {
          newErrors[column.name] = "Invalid JSON format";
        }
      }

      if (column.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors[column.name] = "Invalid email format";
      }

      if (column.type === "url" && value) {
        try {
          new URL(value);
        } catch {
          newErrors[column.name] = "Invalid URL format";
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm() || !record) return;

    setLoading(true);

    try {
      // Prepare data (exclude id)
      const { id, ...recordData } = formData;

      // Convert JSON strings to objects
      schema.columns.forEach((column) => {
        if (column.type === "json" && typeof recordData[column.name] === "string") {
          try {
            recordData[column.name] = JSON.parse(recordData[column.name]);
          } catch {
            // Keep as string if parse fails
          }
        }
      });

      const response = await fetch(
        `/api/database/${databaseId}/tables/${table.id}/records`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recordId: record.id,
            data: recordData,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update record");
      }

      toast({
        title: "Record updated successfully",
        description: `Updated record in ${table.name}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Failed to update record",
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Record</DialogTitle>
          <DialogDescription>
            Update the record in <strong>{table.name}</strong> table. Fields marked
            with * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid gap-4">
            {schema.columns.map((column) => (
              <div key={column.name}>{getInputComponent(column)}</div>
            ))}
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
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
