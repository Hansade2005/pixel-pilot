import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { storageManager } from '@/lib/storage-manager';

export function SchemaExplorer({ table }: { table: string }) {
  const [schema, setSchema] = useState<any>(null);

  useEffect(() => {
    async function fetchSchema() {
      await storageManager.init();
      const sch = await storageManager.getTableSchema(table);
      setSchema(sch);
    }
    fetchSchema();
  }, [table]);

  return (
    <Card className="mt-4">
      <div className="font-semibold mb-2">Schema for {table}</div>
      <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(schema, null, 2)}</pre>
    </Card>
  );
}
