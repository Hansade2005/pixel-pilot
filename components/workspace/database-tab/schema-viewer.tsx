"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, Database, Check, X, Key } from "lucide-react";
import type { SchemaViewerProps } from "./types";
import type { TableSchema, Column } from "@/lib/supabase";

export function SchemaViewer({ table }: SchemaViewerProps) {
  if (!table) {
    return null;
  }

  const schema = table.schema_json as TableSchema;
  const columns = schema.columns || [];

  const getTypeColor = (type: string) => {
    const typeMap: Record<string, string> = {
      text: "bg-blue-500/10 text-blue-500",
      string: "bg-blue-500/10 text-blue-500",
      number: "bg-green-500/10 text-green-500",
      integer: "bg-green-500/10 text-green-500",
      boolean: "bg-purple-500/10 text-purple-500",
      date: "bg-orange-500/10 text-orange-500",
      datetime: "bg-orange-500/10 text-orange-500",
      json: "bg-pink-500/10 text-pink-500",
      array: "bg-cyan-500/10 text-cyan-500",
    };
    
    return typeMap[type.toLowerCase()] || "bg-gray-500/10 text-gray-500";
  };

  return (
    <div className="space-y-4">
      {/* Table Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Table Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Table Name</p>
              <p className="font-medium">{table.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Table ID</p>
              <p className="font-mono text-sm">{table.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p className="text-sm">{new Date(table.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Columns</p>
              <p className="font-medium">{columns.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Columns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Columns ({columns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {columns.map((column: Column, index: number) => (
              <Card key={index} className="border-l-4 border-l-primary/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{column.name}</h4>
                      {column.name === "id" && (
                        <span title="Primary Key">
                          <Key className="h-3 w-3 text-yellow-500" />
                        </span>
                      )}
                    </div>
                    <Badge className={getTypeColor(column.type)}>
                      {column.type}
                    </Badge>
                  </div>
                  
                  {column.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {column.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {column.required && (
                      <Badge variant="outline" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Required
                      </Badge>
                    )}
                    {column.unique && (
                      <Badge variant="outline" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Unique
                      </Badge>
                    )}
                    {!column.required && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        <X className="h-3 w-3 mr-1" />
                        Optional
                      </Badge>
                    )}
                    {column.defaultValue && (
                      <Badge variant="secondary" className="text-xs">
                        Default: {String(column.defaultValue)}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Raw Schema JSON */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Raw Schema (JSON)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
            <code>{JSON.stringify(schema, null, 2)}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
