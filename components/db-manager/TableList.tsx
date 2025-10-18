import React from 'react';
import { Button } from '@/components/ui/button';

export function TableList({ tables, onSelect, selected }: { tables: string[]; onSelect: (t: string) => void; selected: string | null }) {
  return (
    <div>
      <div className="font-semibold mb-2">Tables</div>
      <ul className="space-y-2">
        {tables.map(table => (
          <li key={table}>
            <Button variant={selected === table ? 'default' : 'outline'} className="w-full" onClick={() => onSelect(table)}>
              {table}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
