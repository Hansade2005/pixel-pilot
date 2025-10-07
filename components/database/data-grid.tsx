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
  Download,
  Trash,
  X,
  FileJson,
  FileText,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
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
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

  // Export selected records to CSV
  const exportToCSV = () => {
    const rowsToExport = selectedRows.length > 0 ? selectedRows : reactTable.getFilteredRowModel().rows;
    
    if (rowsToExport.length === 0) {
      toast.error("No records to export");
      return;
    }

    const headers = schema.columns.map(col => col.name);
    const csvRows = [
      headers.join(','),
      ...rowsToExport.map(row => 
        headers.map(header => {
          const value = row.original[header];
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = value === null || value === undefined ? '' : String(value);
          return stringValue.includes(',') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
        }).join(',')
      )
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${table.name}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${rowsToExport.length} record(s) to CSV`);
  };

  // Export selected records to JSON
  const exportToJSON = () => {
    const rowsToExport = selectedRows.length > 0 ? selectedRows : reactTable.getFilteredRowModel().rows;
    
    if (rowsToExport.length === 0) {
      toast.error("No records to export");
      return;
    }

    const data = rowsToExport.map(row => row.original);
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${table.name}_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${rowsToExport.length} record(s) to JSON`);
  };

  // Bulk delete selected records
  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;

    setIsBulkDeleting(true);
    
    try {
      const recordIds = selectedRows.map(row => row.original.id);
      
      // Delete each record (you can optimize this with a bulk API endpoint)
      let successCount = 0;
      let failCount = 0;

      for (const id of recordIds) {
        try {
          const response = await fetch(
            `/api/database/${table.database_id}/tables/${table.id}/records/${id}`,
            { method: 'DELETE' }
          );
          
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} record(s)`);
        setRowSelection({});
        onRefresh?.();
      }
      
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} record(s)`);
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete records');
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar - Shows when rows are selected */}
      {selectedRows.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRowSelection({})}
              className="h-8 px-2"
            >
              <X className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {selectedRows.length} record{selectedRows.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToJSON}>
                  <FileJson className="h-4 w-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bulk Delete */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
              className="h-8"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

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

        {/* Export All Button - Shows when no rows are selected */}
        {selectedRows.length === 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToCSV}>
                <FileText className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToJSON}>
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
