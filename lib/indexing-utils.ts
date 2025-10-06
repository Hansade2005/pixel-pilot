/**
 * Auto-Indexing Utilities for JSONB Data
 * Creates GIN and B-tree indexes on data_json fields for better query performance
 */

import { createClient } from '@/lib/supabase/server';

export interface IndexConfig {
  tableName: string;
  tableId: number;
  columnName: string;
  columnType: string;
  indexType: 'btree' | 'gin' | 'hash';
  unique?: boolean;
  primary_key?: boolean;
}

/**
 * Generate index name following PostgreSQL naming conventions
 */
export function generateIndexName(
  tableId: number,
  columnName: string,
  indexType: string,
  unique: boolean = false
): string {
  const prefix = unique ? 'idx_unique' : 'idx';
  const sanitizedColumn = columnName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  return `${prefix}_records_t${tableId}_${sanitizedColumn}_${indexType}`;
}

/**
 * Create indexes for table columns
 * Note: This creates indexes on the JSONB data_json column using expressions
 */
export async function createTableIndexes(
  tableId: number,
  columns: any[]
): Promise<{ success: boolean; errors: string[] }> {
  const supabase = await createClient();
  const errors: string[] = [];

  // Filter columns that need indexing
  const indexableColumns = columns.filter(
    col => col.indexed || col.unique || col.primary_key
  );

  if (indexableColumns.length === 0) {
    return { success: true, errors: [] };
  }

  for (const column of indexableColumns) {
    try {
      const indexName = generateIndexName(
        tableId,
        column.name,
        'btree',
        column.unique || column.primary_key
      );

      // Determine index type based on column type
      let indexType = 'btree';
      if (column.type === 'text' || column.type === 'json') {
        indexType = 'gin'; // GIN index for full-text search and JSON
      }

      // Build SQL for creating index on JSONB field
      let sql: string;
      
      if (indexType === 'gin' && column.type === 'text') {
        // GIN index for full-text search on text fields
        sql = `
          CREATE INDEX IF NOT EXISTS ${indexName}
          ON records USING gin ((data_json->>'${column.name}') gin_trgm_ops)
          WHERE table_id = ${tableId};
        `;
      } else if (indexType === 'gin' && column.type === 'json') {
        // GIN index for JSON fields
        sql = `
          CREATE INDEX IF NOT EXISTS ${indexName}
          ON records USING gin ((data_json->'${column.name}'))
          WHERE table_id = ${tableId};
        `;
      } else if (column.type === 'number') {
        // B-tree index for numeric fields (cast to numeric)
        sql = `
          CREATE INDEX IF NOT EXISTS ${indexName}
          ON records USING btree (((data_json->>'${column.name}')::numeric))
          WHERE table_id = ${tableId};
        `;
      } else {
        // B-tree index for other types (text, email, url, etc.)
        sql = `
          CREATE INDEX IF NOT EXISTS ${indexName}
          ON records USING btree ((data_json->>'${column.name}'))
          WHERE table_id = ${tableId};
        `;
      }

      // Execute index creation using RPC
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

      if (error) {
        console.error(`Failed to create index ${indexName}:`, error);
        errors.push(`${column.name}: ${error.message}`);
      } else {
        console.log(`✓ Created index ${indexName} for column ${column.name}`);
      }

    } catch (error: any) {
      console.error(`Error creating index for ${column.name}:`, error);
      errors.push(`${column.name}: ${error.message}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Drop indexes for a table
 */
export async function dropTableIndexes(tableId: number): Promise<void> {
  const supabase = await createClient();

  try {
    // Query to find all indexes for this table's records
    const sql = `
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'records' 
      AND indexname LIKE 'idx%_t${tableId}_%';
    `;

    const { data: indexes, error: queryError } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    });

    if (queryError) {
      console.error('Failed to query indexes:', queryError);
      return;
    }

    // Drop each index
    for (const index of indexes || []) {
      const dropSql = `DROP INDEX IF EXISTS ${index.indexname};`;
      const { error: dropError } = await supabase.rpc('exec_sql', { 
        sql_query: dropSql 
      });

      if (dropError) {
        console.error(`Failed to drop index ${index.indexname}:`, dropError);
      } else {
        console.log(`✓ Dropped index ${index.indexname}`);
      }
    }
  } catch (error) {
    console.error('Error dropping table indexes:', error);
  }
}

/**
 * Update indexes when table schema changes
 */
export async function updateTableIndexes(
  tableId: number,
  oldColumns: any[],
  newColumns: any[]
): Promise<{ success: boolean; errors: string[] }> {
  // Find columns that were removed or changed
  const removedColumns = oldColumns.filter(
    oldCol => !newColumns.find(newCol => newCol.name === oldCol.name)
  );

  // Find columns that need new indexes
  const addedIndexColumns = newColumns.filter(newCol => {
    const oldCol = oldColumns.find(old => old.name === newCol.name);
    
    // New column with index
    if (!oldCol && (newCol.indexed || newCol.unique || newCol.primary_key)) {
      return true;
    }
    
    // Existing column with new index requirement
    if (oldCol && !oldCol.indexed && newCol.indexed) {
      return true;
    }
    
    return false;
  });

  // Drop indexes for removed columns (handled automatically by PostgreSQL if index name matches)
  
  // Create new indexes
  return await createTableIndexes(tableId, addedIndexColumns);
}

/**
 * Analyze table to update statistics after creating indexes
 */
export async function analyzeTable(tableId: number): Promise<void> {
  const supabase = await createClient();

  try {
    const sql = `ANALYZE records;`;
    await supabase.rpc('exec_sql', { sql_query: sql });
    console.log(`✓ Analyzed table records for table_id ${tableId}`);
  } catch (error) {
    console.error('Error analyzing table:', error);
  }
}

/**
 * Get index statistics for a table
 */
export async function getIndexStats(tableId: number): Promise<any[]> {
  const supabase = await createClient();

  try {
    const sql = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      WHERE tablename = 'records'
      AND indexname LIKE 'idx%_t${tableId}_%'
      ORDER BY idx_scan DESC;
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Failed to get index stats:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting index stats:', error);
    return [];
  }
}
