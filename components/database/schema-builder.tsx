"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  GripVertical,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { TableSchema, Column } from "@/lib/supabase";

// Available column types
const COLUMN_TYPES = [
  { value: "text", label: "Text", icon: "📝" },
  { value: "number", label: "Number", icon: "🔢" },
  { value: "boolean", label: "Boolean", icon: "✓" },
  { value: "date", label: "Date", icon: "📅" },
  { value: "datetime", label: "Date & Time", icon: "🕐" },
  { value: "email", label: "Email", icon: "📧" },
  { value: "url", label: "URL", icon: "🔗" },
  { value: "json", label: "JSON", icon: "{ }" },
  { value: "uuid", label: "UUID", icon: "🔑" },
];

// Default values for different types
const DEFAULT_VALUES: Record<string, string> = {
  text: "",
  number: "0",
  boolean: "false",
  date: "NOW()",
  datetime: "NOW()",
  timestamp: "NOW()",
  email: "",
  url: "",
  json: "{}",
  uuid: "gen_random_uuid()",
};

interface SchemaBuilderProps {
  schema: TableSchema;
  onChange: (schema: TableSchema) => void;
  readonly?: boolean;
}

export function SchemaBuilder({
  schema,
  onChange,
  readonly = false,
}: SchemaBuilderProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate column
  const validateColumn = (column: Column, index: number): string | null => {
    if (!column.name.trim()) {
      return "Column name is required";
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column.name)) {
      return "Column name must start with letter/underscore and contain only letters, numbers, underscores";
    }
    // Check for duplicates
    const duplicates = schema.columns.filter(
      (col, i) => i !== index && col.name === column.name
    );
    if (duplicates.length > 0) {
      return "Column name must be unique";
    }
    return null;
  };

  // Add new column
  const addColumn = () => {
    const newColumn: Column = {
      name: `column_${schema.columns.length + 1}`,
      type: "text",
      required: false,
      unique: false,
      defaultValue: "",
    };
    onChange({ ...schema, columns: [...schema.columns, newColumn] });
  };

  // Update column
  const updateColumn = (index: number, updates: Partial<Column>) => {
    const newColumns = [...schema.columns];
    newColumns[index] = { ...newColumns[index], ...updates };
    
    // If type changed, update default value
    if (updates.type) {
      newColumns[index].defaultValue = DEFAULT_VALUES[updates.type] || "";
    }

    onChange({ ...schema, columns: newColumns });

    // Validate
    const error = validateColumn(newColumns[index], index);
    setErrors((prev) => ({
      ...prev,
      [index]: error || "",
    }));
  };

  // Remove column
  const removeColumn = (index: number) => {
    const newColumns = schema.columns.filter((_, i) => i !== index);
    onChange({ ...schema, columns: newColumns });
    
    // Clear error for this column
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newColumns = [...schema.columns];
    const draggedColumn = newColumns[draggedIndex];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedColumn);

    onChange({ ...schema, columns: newColumns });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Check if schema is valid
  const isValid = schema.columns.length > 0 && 
    Object.values(errors).every((err) => !err) &&
    schema.columns.every((col) => col.name.trim() !== "");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Table Schema</h3>
          <p className="text-sm text-muted-foreground">
            Define columns for your table. Drag to reorder.
          </p>
        </div>
        {!readonly && (
          <Button onClick={addColumn} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Column
          </Button>
        )}
      </div>

      {/* Validation summary */}
      {schema.columns.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Add at least one column to create a table.
          </AlertDescription>
        </Alert>
      )}

      {/* Columns list */}
      <div className="space-y-2">
        {schema.columns.map((column, index) => (
          <Card
            key={index}
            className={`transition-all ${
              draggedIndex === index ? "opacity-50" : ""
            } ${errors[index] ? "border-red-500" : ""}`}
            draggable={!readonly}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Drag handle */}
                {!readonly && (
                  <div className="cursor-move pt-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                {/* Column configuration */}
                <div className="flex-1 space-y-3">
                  {/* Row 1: Name and Type */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`col-name-${index}`}>Column Name</Label>
                      <Input
                        id={`col-name-${index}`}
                        value={column.name}
                        onChange={(e) =>
                          updateColumn(index, { name: e.target.value })
                        }
                        placeholder="column_name"
                        disabled={readonly}
                        className={errors[index] ? "border-red-500" : ""}
                      />
                      {errors[index] && (
                        <p className="text-xs text-red-500">{errors[index]}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`col-type-${index}`}>Type</Label>
                      <Select
                        value={column.type}
                        onValueChange={(value) =>
                          updateColumn(index, { type: value as Column["type"] })
                        }
                        disabled={readonly}
                      >
                        <SelectTrigger id={`col-type-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COLUMN_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <span className="flex items-center gap-2">
                                <span>{type.icon}</span>
                                <span>{type.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Row 2: Default Value */}
                  <div className="space-y-1">
                    <Label htmlFor={`col-default-${index}`}>
                      Default Value (optional)
                    </Label>
                    <Input
                      id={`col-default-${index}`}
                      value={column.defaultValue || ""}
                      onChange={(e) =>
                        updateColumn(index, { defaultValue: e.target.value })
                      }
                      placeholder={DEFAULT_VALUES[column.type] || "No default"}
                      disabled={readonly}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use NOW() for current timestamp or gen_random_uuid() for UUID
                    </p>
                  </div>

                  {/* Row 3: Constraints */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`col-required-${index}`}
                        checked={column.required}
                        onCheckedChange={(checked) =>
                          updateColumn(index, { required: !!checked })
                        }
                        disabled={readonly}
                      />
                      <Label
                        htmlFor={`col-required-${index}`}
                        className="cursor-pointer font-normal"
                      >
                        Required
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`col-unique-${index}`}
                        checked={column.unique}
                        onCheckedChange={(checked) =>
                          updateColumn(index, { unique: !!checked })
                        }
                        disabled={readonly}
                      />
                      <Label
                        htmlFor={`col-unique-${index}`}
                        className="cursor-pointer font-normal"
                      >
                        Unique
                      </Label>
                    </div>

                    {/* Badges for constraints */}
                    <div className="ml-auto flex items-center gap-2">
                      {column.required && (
                        <Badge variant="secondary" className="text-xs">
                          Required
                        </Badge>
                      )}
                      {column.unique && (
                        <Badge variant="secondary" className="text-xs">
                          Unique
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete button */}
                {!readonly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeColumn(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Schema validation status */}
      {schema.columns.length > 0 && (
        <div className="flex items-center gap-2">
          {isValid ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">
                Schema is valid ({schema.columns.length} column
                {schema.columns.length !== 1 ? "s" : ""})
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-600">
                Please fix validation errors
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
