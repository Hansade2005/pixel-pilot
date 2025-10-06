"use client";

import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit,
  Trash2,
  Search,
} from "lucide-react";
import type { Table as TableType, TableSchema, Column } from "@/lib/supabase";

interface Record {
  id: number;
  [key: string]: any;
}

interface DataGridProps {
  table: TableType;
  records: Record[];
  loading?: boolean;
  onEdit?: (record: Record) => void;
  onDelete?: (record: Record) => void;
  onRefresh?: () => void;
}

export function DataGrid({
  table,
  records,
  loading = false,
  onEdit,
  onDelete,
  onRefresh,
}: DataGridProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");

  const schema = table.schema_json as TableSchema;

  // Format cell value based on column type
  const formatCellValue = (value: any, type: Column["type"]): string => {
    if (value === null || value === undefined) return "-";

    switch (type) {
      case "boolean":
        return value ? "✓ Yes" : "✗ No";
      case "date":
      case "datetime":
      case "timestamp":
        try {
          return new Date(value).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            ...(type === "datetime" || type === "timestamp"
              ? { hour: "2-digit", minute: "2-digit" }
              : {}),
          });
        } catch {
          return String(value);
        }
      case "json":
        return JSON.stringify(value, null, 2);
      case "url":
        return value;
      case "email":
        return value;
      case "number":
        return typeof value === "number" ? value.toLocaleString() : value;
      default:
        return String(value);
    }
  };

  // Get cell renderer based on type
  const getCellRenderer = (value: any, type: Column["type"]) => {
    const formatted = formatCellValue(value, type);

    switch (type) {
      case "boolean":
        return (
          <span className={value ? "text-green-600" : "text-red-600"}>
            {formatted}
          </span>
        );
      case "url":
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {formatted}
          </a>
        );
      case "email":
        return (
          <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
            {formatted}
          </a>
        );
      case "json":
        return (
          <pre className="text-xs bg-muted p-1 rounded overflow-x-auto max-w-xs">
            {formatted}
          </pre>
        );
      default:
        return <span className="truncate block max-w-xs">{formatted}</span>;
    }
  };

  // Generate columns from schema
  const columns = useMemo<ColumnDef<Record>[]>(() => {
    const schemaColumns: ColumnDef<Record>[] = schema.columns.map((col) => ({
      accessorKey: col.name,
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-muted"
          >
            <span className="font-semibold">{col.name}</span>
            {isSorted === "asc" && <ArrowUp className="ml-2 h-4 w-4" />}
            {isSorted === "desc" && <ArrowDown className="ml-2 h-4 w-4" />}
            {!isSorted && <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />}
          </Button>
        );
      },
      cell: ({ row }) => {
        const value = row.original[col.name];
        return getCellRenderer(value, col.type);
      },
      meta: {
        type: col.type,
      },
    }));

    // Add selection column at start
    const selectColumn: ColumnDef<Record> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };

    // Add actions column at end
    const actionsColumn: ColumnDef<Record> = {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(row.original)}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(row.original)}
              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    };

    return [selectColumn, ...schemaColumns, actionsColumn];
  }, [schema.columns, onEdit, onDelete]);

  // Initialize table
  const reactTable = useReactTable({
    data: records,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  const selectedRows = reactTable.getFilteredSelectedRowModel().rows;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all columns..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Selection info */}
        {selectedRows.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {selectedRows.length} of {reactTable.getFilteredRowModel().rows.length}{" "}
            row(s) selected
          </div>
        )}

        {/* Record count */}
        <div className="text-sm text-muted-foreground">
          {reactTable.getFilteredRowModel().rows.length} record(s)
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {reactTable.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : reactTable.getRowModel().rows?.length ? (
              reactTable.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Page {reactTable.getState().pagination.pageIndex + 1} of{" "}
            {reactTable.getPageCount()}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => reactTable.setPageIndex(0)}
            disabled={!reactTable.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reactTable.previousPage()}
            disabled={!reactTable.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reactTable.nextPage()}
            disabled={!reactTable.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reactTable.setPageIndex(reactTable.getPageCount() - 1)}
            disabled={!reactTable.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
