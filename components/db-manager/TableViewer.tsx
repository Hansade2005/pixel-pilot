import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { storageManager } from '@/lib/storage-manager';

export function TableViewer({ table }: { table: string }) {
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    async function fetchEntries() {
      await storageManager.init();
      const rows = await storageManager.getAllEntries(table);
      setEntries(rows);
    }
    fetchEntries();
  }, [table]);

  return (
    <Card className="mt-4">
      <div className="font-semibold mb-2">Entries in {table}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              {entries[0] && Object.keys(entries[0]).map(key => (
                <th key={key} className="px-2 py-1 border-b">{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={idx}>
                {Object.values(entry).map((val, i) => (
                  <td key={i} className="px-2 py-1 border-b">{JSON.stringify(val)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && <div className="text-gray-500 py-4">No entries found.</div>}
      </div>
    </Card>
  );
}
