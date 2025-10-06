import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/database/[id]/tables/[tableId]/import
 * Imports records from CSV or JSON data
 * 
 * Body: { data: string, format: 'csv' | 'json', skipValidation?: boolean }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const body = await request.json();
    const { data, format = 'json', skipValidation = false } = body;

    if (!data) {
      return NextResponse.json(
        { error: 'No data provided' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user session
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();
    
    if (sessionError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Get table and verify ownership
    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('*, databases!inner(*)')
      .eq('id', params.tableId)
      .eq('database_id', params.id)
      .eq('databases.user_id', userId)
      .single();

    if (tableError || !table) {
      return NextResponse.json(
        { error: 'Table not found or access denied' },
        { status: 404 }
      );
    }

    const schema = table.schema_json;

    // Parse data based on format
    let records: any[] = [];
    
    if (format === 'csv') {
      records = csvToJSON(data, schema.columns);
    } else if (format === 'json') {
      try {
        const parsed = JSON.parse(data);
        records = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid JSON format' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported format. Use "csv" or "json"' },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'No records to import' },
        { status: 400 }
      );
    }

    // Prepare records for insertion
    const importResults = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const processedData: any = {};

      try {
        // Validate and process each field
        for (const column of schema.columns) {
          const value = record[column.name];

          // Handle required fields
          if (column.required && (value === null || value === undefined || value === '')) {
            if (!column.defaultValue) {
              throw new Error(`Required field '${column.name}' is missing`);
            }
          }

          // Handle defaults
          if ((value === null || value === undefined || value === '') && column.defaultValue) {
            if (column.type === 'uuid' || column.defaultValue === 'gen_random_uuid()') {
              processedData[column.name] = crypto.randomUUID();
            } else if (column.type === 'timestamp' || column.type === 'datetime' || column.defaultValue === 'NOW()') {
              processedData[column.name] = new Date().toISOString();
            } else {
              processedData[column.name] = column.defaultValue;
            }
            continue;
          }

          // Skip if no value and not required
          if (value === null || value === undefined || value === '') {
            continue;
          }

          // Type validation
          if (!skipValidation) {
            if (column.type === 'number') {
              const numValue = Number(value);
              if (isNaN(numValue)) {
                throw new Error(`Field '${column.name}' must be a number`);
              }
              if (column.min !== undefined && numValue < column.min) {
                throw new Error(`Field '${column.name}' must be at least ${column.min}`);
              }
              if (column.max !== undefined && numValue > column.max) {
                throw new Error(`Field '${column.name}' must be at most ${column.max}`);
              }
              processedData[column.name] = numValue;
            } else if (column.type === 'boolean') {
              processedData[column.name] = Boolean(value);
            } else if (column.type === 'json') {
              if (typeof value === 'string') {
                try {
                  processedData[column.name] = JSON.parse(value);
                } catch (e) {
                  throw new Error(`Field '${column.name}' contains invalid JSON`);
                }
              } else {
                processedData[column.name] = value;
              }
            } else {
              // String validation
              const stringValue = String(value);
              
              if (column.minLength && stringValue.length < column.minLength) {
                throw new Error(`Field '${column.name}' must be at least ${column.minLength} characters`);
              }
              if (column.maxLength && stringValue.length > column.maxLength) {
                throw new Error(`Field '${column.name}' must be at most ${column.maxLength} characters`);
              }
              if (column.pattern) {
                const regex = new RegExp(column.pattern);
                if (!regex.test(stringValue)) {
                  throw new Error(`Field '${column.name}' does not match required pattern`);
                }
              }
              if (column.enum && column.enum.length > 0) {
                if (!column.enum.includes(stringValue)) {
                  throw new Error(`Field '${column.name}' must be one of: ${column.enum.join(', ')}`);
                }
              }
              
              processedData[column.name] = stringValue;
            }
          } else {
            processedData[column.name] = value;
          }
        }

        // Check unique constraints if not skipping validation
        if (!skipValidation) {
          const uniqueColumns = schema.columns.filter((col: any) => col.unique || col.primary_key);
          for (const column of uniqueColumns) {
            const value = processedData[column.name];
            if (value !== null && value !== undefined) {
              const { data: existingRecords } = await supabase
                .from('records')
                .select('id, data_json')
                .eq('table_id', params.tableId);
                
              const duplicate = existingRecords?.find((existingRecord: any) => 
                existingRecord.data_json && existingRecord.data_json[column.name] === value
              );
              
              if (duplicate) {
                throw new Error(`Duplicate value '${value}' for unique field '${column.name}'`);
              }
            }
          }
        }

        // Insert record
        const { error: insertError } = await supabase
          .from('records')
          .insert({
            table_id: params.tableId,
            data_json: processedData,
          });

        if (insertError) {
          throw new Error(insertError.message);
        }

        importResults.success++;

      } catch (error: any) {
        importResults.failed++;
        importResults.errors.push({
          row: i + 1,
          data: record,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      message: `Import completed: ${importResults.success} succeeded, ${importResults.failed} failed`,
      results: importResults,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Unexpected error in import:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to convert CSV to JSON
function csvToJSON(csv: string, columns: any[]): any[] {
  const lines = csv.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const records: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record: any = {};

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = values[j];

      // Skip system fields
      if (header === 'id' || header === 'created_at' || header === 'updated_at') {
        continue;
      }

      // Find column definition
      const column = columns.find(col => col.name === header);
      
      if (value && value.trim()) {
        // Try to parse JSON objects
        if (value.startsWith('{') || value.startsWith('[')) {
          try {
            record[header] = JSON.parse(value);
            continue;
          } catch (e) {
            // Not JSON, treat as string
          }
        }

        // Type conversion based on column type
        if (column) {
          if (column.type === 'number') {
            const num = Number(value);
            record[header] = isNaN(num) ? value : num;
          } else if (column.type === 'boolean') {
            record[header] = value.toLowerCase() === 'true';
          } else {
            record[header] = value;
          }
        } else {
          record[header] = value;
        }
      }
    }

    records.push(record);
  }

  return records;
}

// Parse a CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}
