import type { Table, TableSchema } from "@/lib/supabase";

export interface DatabaseTabProps {
  workspaceId: string;
}

export interface TableWithCount extends Table {
  recordCount: number;
}

export interface RecordData {
  id: number;
  [key: string]: any;
}

export interface TableExplorerProps {
  tables: TableWithCount[];
  selectedTable: TableWithCount | null;
  onTableSelect: (table: TableWithCount) => void;
  loading: boolean;
  databaseId: string;
  onRefresh: () => void;
}

export interface RecordViewerProps {
  table: TableWithCount | null;
  records: RecordData[];
  loading: boolean;
  databaseId: string;
  onRefresh: () => void;
}

export interface SchemaViewerProps {
  table: TableWithCount | null;
}
