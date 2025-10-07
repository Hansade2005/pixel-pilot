"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table as TableIcon,
  Edit,
  Trash2,
  Database,
  Calendar,
  Hash,
} from "lucide-react";
import type { Table, TableSchema } from "@/lib/supabase";

interface TableDetailsViewProps {
  table: Table & { recordCount?: number };
  onEdit?: () => void;
  onDelete?: () => void;
  onViewRecords?: () => void;
}

export function TableDetailsView({
  table,
  onEdit,
  onDelete,
  onViewRecords,
}: TableDetailsViewProps) {
  const params = useParams();
  const router = useRouter();
  const schema = table.schema_json as TableSchema;

  const handleViewRecords = () => {
    if (onViewRecords) {
      onViewRecords();
    } else {
      // Navigate to records page
      const workspaceId = params.id;
      router.push(`/workspace/${workspaceId}/database/tables/${table.id}`);
    }
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      text: "📝",
      number: "🔢",
      boolean: "✓",
      date: "📅",
      datetime: "🕐",
      email: "📧",
      url: "🔗",
      json: "{ }",
      uuid: "🔑",
    };
    return icons[type] || "•";
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 flex-shrink-0">
              <TableIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl truncate">{table.name}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <Hash className="h-3 w-3" />
                  {schema.columns.length} columns
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <Database className="h-3 w-3" />
                  {table.recordCount ?? 0} records
                </span>
                <span className="hidden sm:flex items-center gap-1 whitespace-nowrap">
                  <Calendar className="h-3 w-3" />
                  {formatDate(table.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            )}
            <Button variant="default" size="sm" onClick={handleViewRecords}>
              <Database className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">View Records</span>
            </Button>
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Schema columns */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Schema</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {schema.columns.map((column, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getTypeIcon(column.type)}</span>
                  <div>
                    <span className="font-mono text-sm font-medium">
                      {column.name}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        {column.type}
                      </Badge>
                      {column.required && (
                        <Badge
                          variant="outline"
                          className="text-xs px-1 py-0 border-orange-500 text-orange-600"
                        >
                          Required
                        </Badge>
                      )}
                      {column.unique && (
                        <Badge
                          variant="outline"
                          className="text-xs px-1 py-0 border-blue-500 text-blue-600"
                        >
                          Unique
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {column.defaultValue && (
                  <span className="text-xs text-muted-foreground font-mono">
                    = {column.defaultValue}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Statistics */}
        {table.recordCount !== undefined && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {schema.columns.length}
                </p>
                <p className="text-xs text-muted-foreground">Columns</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {table.recordCount}
                </p>
                <p className="text-xs text-muted-foreground">Records</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {schema.columns.filter((c) => c.required).length}
                </p>
                <p className="text-xs text-muted-foreground">Required Fields</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
