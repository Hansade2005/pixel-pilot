import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { storageManager } from '@/lib/storage-manager';

export function QueryRunner({ table }: { table: string }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runQuery = async () => {
    setError(null);
    try {
      await storageManager.init();
      const res = await storageManager.runQuery(table, query);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Query failed');
    }
  };

  return (
    <Card className="mt-4 p-4">
      <div className="font-semibold mb-2">Run Query on {table}</div>
      <div className="flex gap-2 mb-2">
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. key=123 or name='foo'" />
        <Button onClick={runQuery}>Run</Button>
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {result && <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>}
    </Card>
  );
}
