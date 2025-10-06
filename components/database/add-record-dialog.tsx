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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Table, TableSchema, Column } from "@/lib/supabase";

interface AddRecordDialogProps {
  table: Table;
  databaseId: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export function AddRecordDialog({
  table,
  databaseId,
  onSuccess,
  children,
}: AddRecordDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const schema = table.schema_json as TableSchema;

  // Get input component based on column type
  const getInputComponent = (column: Column) => {
    const value = formData[column.name] ?? column.defaultValue ?? "";
    const error = errors[column.name];

    const handleChange = (newValue: any) => {
      setFormData((prev) => ({ ...prev, [column.name]: newValue }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[column.name];
        return newErrors;
      });
    };

    switch (column.type) {
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`field-${column.name}`}
              checked={!!value}
              onCheckedChange={handleChange}
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
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      case "date":
      case "datetime":
      case "timestamp":
        return (
          <div className="space-y-2">
            <Label htmlFor={`field-${column.name}`}>
              {column.name}
              {column.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={`field-${column.name}`}
              type={column.type === "date" ? "date" : "datetime-local"}
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              className={error ? "border-red-500" : ""}
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
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      default:
        // text, uuid, etc.
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
              disabled={!!(column.type === "uuid" && column.defaultValue)}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            {column.type === "uuid" && column.defaultValue && (
              <p className="text-xs text-muted-foreground">
                Auto-generated UUID
              </p>
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

      // Check required fields
      if (column.required && !value && !column.defaultValue) {
        newErrors[column.name] = "This field is required";
      }

      // Validate JSON
      if (column.type === "json" && value) {
        try {
          JSON.parse(typeof value === "string" ? value : JSON.stringify(value));
        } catch {
          newErrors[column.name] = "Invalid JSON format";
        }
      }

      // Validate email
      if (column.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors[column.name] = "Invalid email format";
      }

      // Validate URL
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
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Prepare data
      const recordData: Record<string, any> = {};
      schema.columns.forEach((column) => {
        let value = formData[column.name];

        // Skip fields with PostgreSQL function defaults (like gen_random_uuid(), NOW())
        // These should be handled by the database
        const isFunctionDefault = column.defaultValue && 
          (column.defaultValue.includes('(') || 
           column.defaultValue.toUpperCase() === 'NOW()' ||
           column.defaultValue.toUpperCase() === 'CURRENT_TIMESTAMP');

        // Use default value if not provided (but not function defaults)
        if (value === undefined || value === "") {
          if (isFunctionDefault) {
            // Don't include this field - let the database generate it
            return;
          } else if (column.defaultValue) {
            value = column.defaultValue;
          } else {
            // Skip fields with no value and no default
            return;
          }
        }

        // Convert JSON strings to objects
        if (column.type === "json" && typeof value === "string") {
          try {
            value = JSON.parse(value);
          } catch {
            // Keep as string if parse fails
          }
        }

        recordData[column.name] = value;
      });

      const response = await fetch(
        `/api/database/${databaseId}/tables/${table.id}/records`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data_json: recordData }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create record");
      }

      toast({
        title: "Record created successfully",
        description: `Added new record to ${table.name}`,
      });

      // Reset and close
      setFormData({});
      setErrors({});
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Failed to create record",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Record
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Record</DialogTitle>
          <DialogDescription>
            Add a new record to <strong>{table.name}</strong> table. Fields marked
            with * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Info alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Auto-generated fields (like UUID and timestamps) will be populated
              automatically if you leave them empty.
            </AlertDescription>
          </Alert>

          {/* Form fields */}
          <div className="grid gap-4">
            {schema.columns.map((column) => (
              <div key={column.name}>{getInputComponent(column)}</div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
