import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TableList } from './TableList';
import { TableViewer } from './TableViewer';
import { ImportExportPanel } from './ImportExportPanel';
import { SchemaExplorer } from './SchemaExplorer';
import { QueryRunner } from './QueryRunner';
import { storageManager } from '@/lib/storage-manager';

export default function DBManagerDashboard() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    async function fetchTables() {
      await storageManager.init();
      const tbls = await storageManager.listTables();
      setTables(tbls);
    }
    fetchTables();
  }, [refresh]);

  return (
    <Card className="w-full max-w-5xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>IndexedDB Management Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-8">
          <div className="w-1/4">
            <TableList tables={tables} onSelect={setSelectedTable} selected={selectedTable} />
            <Button className="mt-4 w-full" onClick={() => setRefresh(r => r + 1)}>Refresh Tables</Button>
            <ImportExportPanel table={selectedTable} />
          </div>
          <div className="flex-1">
            {selectedTable ? (
              <>
                <SchemaExplorer table={selectedTable} />
                <TableViewer table={selectedTable} />
                <QueryRunner table={selectedTable} />
              </>
            ) : (
              <div className="text-gray-500">Select a table to view details.</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
