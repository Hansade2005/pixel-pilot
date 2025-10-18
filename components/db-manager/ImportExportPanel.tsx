import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { storageManager } from '@/lib/storage-manager';

export function ImportExportPanel({ table }: { table: string | null }) {
  const [exported, setExported] = useState<string>('');
  const [importData, setImportData] = useState<string>('');

  const handleExport = async () => {
    if (!table) return;
    await storageManager.init();
    const data = await storageManager.exportTable(table);
    setExported(JSON.stringify(data, null, 2));
  };

  const handleImport = async () => {
    if (!table || !importData.trim()) return;
    await storageManager.init();
    try {
      const json = JSON.parse(importData);
      await storageManager.importTable(table, json);
      alert('Import successful!');
    } catch (err) {
      alert('Import failed: ' + err);
    }
  };

  return (
    <div className="mt-4">
      <Button className="w-full mb-2" onClick={handleExport} disabled={!table}>Export Table</Button>
      {exported && <textarea className="w-full h-32 mb-2" value={exported} readOnly />}
      <textarea className="w-full h-24 mb-2" value={importData} onChange={e => setImportData(e.target.value)} placeholder="Paste JSON to import" />
      <Button className="w-full" onClick={handleImport} disabled={!table || !importData.trim()}>Import Table</Button>
    </div>
  );
}
