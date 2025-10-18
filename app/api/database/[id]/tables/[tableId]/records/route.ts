import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/database/[id]/tables/[tableId]/records
 * Creates a new record in the table
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const { data_json } = await request.json();

    if (!data_json || typeof data_json !== 'object') {
      return NextResponse.json(
        { error: 'Record data is required' },
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

    // Verify table ownership
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

    // Process default values and validate against schema
    const schema = table.schema_json;
    const processedData = { ...data_json };
    const tableIdInt = parseInt(params.tableId, 10); // Parse once at top level
    
    if (schema && schema.columns) {
      // First pass: Handle defaults and check required fields
      for (const column of schema.columns) {
        // Check if field is missing
        if (!processedData.hasOwnProperty(column.name) || processedData[column.name] === undefined || processedData[column.name] === '') {
          // Handle default values
          if (column.defaultValue) {
            const defaultVal = column.defaultValue;
            
            // Generate UUID for gen_random_uuid()
            if (defaultVal === 'gen_random_uuid()' || defaultVal.toLowerCase().includes('uuid')) {
              processedData[column.name] = crypto.randomUUID();
            }
            // Generate timestamp for NOW() or CURRENT_TIMESTAMP
            else if (defaultVal === 'NOW()' || defaultVal === 'CURRENT_TIMESTAMP' || defaultVal.toLowerCase().includes('now')) {
              processedData[column.name] = new Date().toISOString();
            }
            // Use literal default value
            else {
              processedData[column.name] = defaultVal;
            }
          }
          // Check if field is required
          else if (column.required && !column.primary_key) {
            return NextResponse.json(
              { error: `Required field '${column.name}' is missing` },
              { status: 400 }
            );
          }
        }
      }

      // Second pass: Validate data types and constraints
      for (const column of schema.columns) {
        // Skip validation for 'id' field as it's the database primary key
        if (column.name === 'id') continue;

        const value = processedData[column.name];
        if (value === null || value === undefined) continue;

        // Type-specific validation
        if (column.type === 'number') {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            return NextResponse.json(
              { error: `Field '${column.name}' must be a valid number` },
              { status: 400 }
            );
          }
          // Check min/max constraints
          if (column.min !== undefined && numValue < column.min) {
            return NextResponse.json(
              { error: `Field '${column.name}' must be at least ${column.min}` },
              { status: 400 }
            );
          }
          if (column.max !== undefined && numValue > column.max) {
            return NextResponse.json(
              { error: `Field '${column.name}' must be at most ${column.max}` },
              { status: 400 }
            );
          }
        }

        // String length validation
        if (column.type === 'text' && typeof value === 'string') {
          if (column.minLength && value.length < column.minLength) {
            return NextResponse.json(
              { error: `Field '${column.name}' must be at least ${column.minLength} characters` },
              { status: 400 }
            );
          }
          if (column.maxLength && value.length > column.maxLength) {
            return NextResponse.json(
              { error: `Field '${column.name}' must be at most ${column.maxLength} characters` },
              { status: 400 }
            );
          }
          // Pattern validation
          if (column.pattern) {
            const regex = new RegExp(column.pattern);
            if (!regex.test(value)) {
              return NextResponse.json(
                { error: `Field '${column.name}' does not match the required pattern` },
                { status: 400 }
              );
            }
          }
        }

        // Enum validation
        if (column.enum && column.enum.length > 0) {
          if (!column.enum.includes(value)) {
            return NextResponse.json(
              { error: `Field '${column.name}' must be one of: ${column.enum.join(', ')}` },
              { status: 400 }
            );
          }
        }
      }

      // Third pass: Check unique constraints (prevent duplicates)
      const uniqueColumns = schema.columns.filter((col: any) => col.unique || col.primary_key);
      for (const column of uniqueColumns) {
        // Skip 'id' field as it's the database primary key
        if (column.name === 'id') continue;

        const value = processedData[column.name];
        if (value === null || value === undefined) continue;

        // Query existing records to check for duplicates
        const { data: existingRecords, error: queryError } = await supabase
          .from('records')
          .select('id, data_json')
          .eq('table_id', tableIdInt);

        if (queryError) {
          console.error('Error checking uniqueness:', queryError);
          continue; // Don't fail the request, but log the error
        }

        // Check if value already exists
        const duplicate = existingRecords?.find((record: any) => 
          record.data_json && record.data_json[column.name] === value
        );

        if (duplicate) {
          return NextResponse.json(
            { error: `A record with ${column.name} '${value}' already exists. This field must be unique.` },
            { status: 409 } // 409 Conflict
          );
        }
      }

      // Fourth pass: Validate foreign key references
      for (const column of schema.columns) {
        // Skip 'id' field as it's the database primary key
        if (column.name === 'id') continue;

        if (column.references && processedData[column.name]) {
          const referencedValue = processedData[column.name];
          const { table: refTableName, column: refColumnName } = column.references;

          // Find the referenced table in the same database
          const { data: refTable, error: refTableError } = await supabase
            .from('tables')
            .select('id, schema_json')
            .eq('database_id', params.id)
            .eq('name', refTableName)
            .single();

          if (refTableError || !refTable) {
            return NextResponse.json(
              { error: `Referenced table '${refTableName}' not found` },
              { status: 400 }
            );
          }

          const refTableIdInt = refTable.id;

          // Check if the referenced record exists
          const { data: refRecords, error: refQueryError } = await supabase
            .from('records')
            .select('id, data_json')
            .eq('table_id', refTableIdInt);

          if (refQueryError) {
            console.error('Error checking foreign key reference:', refQueryError);
            return NextResponse.json(
              { error: `Failed to validate foreign key reference for '${column.name}'` },
              { status: 500 }
            );
          }

          // Check if any record has the referenced value
          const refRecordExists = refRecords?.some((record: any) => 
            record.data_json && record.data_json[refColumnName] === referencedValue
          );

          if (!refRecordExists) {
            return NextResponse.json(
              { error: `Referenced record with ${refColumnName} '${referencedValue}' not found in table '${refTableName}'` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Insert record
    // Note: table_id is integer type
    const { data: record, error: recordError } = await supabase
      .from('records')
      .insert({
        table_id: tableIdInt,
        data_json: processedData
      })
      .select()
      .single();

    if (recordError) {
      console.error('Error creating record:', recordError);
      return NextResponse.json(
        { error: `Failed to create record: ${recordError.message}` },
        { status: 500 }
      );
    }

    // Transform record: flatten data_json into top-level properties
    // Exclude 'id' from data_json to avoid overriding the database primary key
    const { id: _, ...dataWithoutId } = record.data_json || {};
    const transformedRecord = {
      id: record.id,
      created_at: record.created_at,
      updated_at: record.updated_at,
      ...dataWithoutId,
    };

    return NextResponse.json({
      success: true,
      record: transformedRecord,
      message: 'Record created successfully'
    });

  } catch (error: any) {
    console.error('Unexpected error in create record:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/database/[id]/tables/[tableId]/records
 * Gets all records from the table with pagination
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // Verify table ownership
    const { data: table } = await supabase
      .from('tables')
      .select('*, databases!inner(*)')
      .eq('id', params.tableId)
      .eq('databases.user_id', userId)
      .single();

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found or access denied' },
        { status: 404 }
      );
    }

    // Get records with pagination
    // Note: table_id is integer, not UUID
    const tableIdInt = parseInt(params.tableId, 10);
    
    const { data: records, error: recordsError, count } = await supabase
      .from('records')
      .select('*', { count: 'exact' })
      .eq('table_id', tableIdInt)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (recordsError) {
      return NextResponse.json(
        { error: 'Failed to fetch records' },
        { status: 500 }
      );
    }

    // Transform records: flatten data_json into top-level properties
    // Exclude 'id' from data_json to avoid overriding the database primary key
    const transformedRecords = (records || []).map((record: any) => {
      const { id: _, ...dataWithoutId } = record.data_json || {};
      return {
        id: record.id,
        created_at: record.created_at,
        updated_at: record.updated_at,
        ...dataWithoutId, // Spread data_json fields except id
      };
    });

    return NextResponse.json({
      success: true,
      records: transformedRecords,
      total: count || 0,
      limit,
      offset
    });

  } catch (error: any) {
    console.error('Unexpected error in get records:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/database/[id]/tables/[tableId]/records?recordId=123
 * Updates a specific record
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');
    const { data_json } = await request.json();

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    if (!data_json || typeof data_json !== 'object') {
      return NextResponse.json(
        { error: 'Record data is required' },
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

    // Verify ownership
    const { data: table } = await supabase
      .from('tables')
      .select('*, databases!inner(*)')
      .eq('id', params.tableId)
      .eq('databases.user_id', userId)
      .single();

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found or access denied' },
        { status: 404 }
      );
    }

    // Validate and process data
    const schema = table.schema_json;
    const processedData = { ...data_json };
    const tableIdInt = parseInt(params.tableId, 10); // Parse once at top level

    if (schema && schema.columns) {
      // Validate data types and constraints
      for (const column of schema.columns) {
        // Skip validation for 'id' field as it's the database primary key
        if (column.name === 'id') continue;

        const value = processedData[column.name];
        if (value === null || value === undefined) {
          // Check if required field is being removed
          if (column.required && !column.primary_key) {
            return NextResponse.json(
              { error: `Required field '${column.name}' cannot be empty` },
              { status: 400 }
            );
          }
          continue;
        }

        // Type-specific validation
        if (column.type === 'number') {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            return NextResponse.json(
              { error: `Field '${column.name}' must be a valid number` },
              { status: 400 }
            );
          }
          if (column.min !== undefined && numValue < column.min) {
            return NextResponse.json(
              { error: `Field '${column.name}' must be at least ${column.min}` },
              { status: 400 }
            );
          }
          if (column.max !== undefined && numValue > column.max) {
            return NextResponse.json(
              { error: `Field '${column.name}' must be at most ${column.max}` },
              { status: 400 }
            );
          }
        }

        // String length validation
        if (column.type === 'text' && typeof value === 'string') {
          if (column.minLength && value.length < column.minLength) {
            return NextResponse.json(
              { error: `Field '${column.name}' must be at least ${column.minLength} characters` },
              { status: 400 }
            );
          }
          if (column.maxLength && value.length > column.maxLength) {
            return NextResponse.json(
              { error: `Field '${column.name}' must be at most ${column.maxLength} characters` },
              { status: 400 }
            );
          }
          if (column.pattern) {
            const regex = new RegExp(column.pattern);
            if (!regex.test(value)) {
              return NextResponse.json(
                { error: `Field '${column.name}' does not match the required pattern` },
                { status: 400 }
              );
            }
          }
        }

        // Enum validation
        if (column.enum && column.enum.length > 0) {
          if (!column.enum.includes(value)) {
            return NextResponse.json(
              { error: `Field '${column.name}' must be one of: ${column.enum.join(', ')}` },
              { status: 400 }
            );
          }
        }
      }

      // Check unique constraints (excluding the current record)
      const uniqueColumns = schema.columns.filter((col: any) => col.unique || col.primary_key);
      for (const column of uniqueColumns) {
        // Skip 'id' field as it's the database primary key
        if (column.name === 'id') continue;

        const value = processedData[column.name];
        if (value === null || value === undefined) continue;

        const { data: existingRecords, error: queryError } = await supabase
          .from('records')
          .select('id, data_json')
          .eq('table_id', tableIdInt)
          .neq('id', recordId); // Exclude current record

        if (queryError) {
          console.error('Error checking uniqueness:', queryError);
          continue;
        }

        const duplicate = existingRecords?.find((record: any) => 
          record.data_json && record.data_json[column.name] === value
        );

        if (duplicate) {
          return NextResponse.json(
            { error: `A record with ${column.name} '${value}' already exists. This field must be unique.` },
            { status: 409 }
          );
        }
      }

      // Validate foreign key references
      for (const column of schema.columns) {
        // Skip 'id' field as it's the database primary key
        if (column.name === 'id') continue;

        if (column.references && processedData[column.name]) {
          const referencedValue = processedData[column.name];
          const { table: refTableName, column: refColumnName } = column.references;

          // Find the referenced table
          const { data: refTable, error: refTableError } = await supabase
            .from('tables')
            .select('id, schema_json')
            .eq('database_id', params.id)
            .eq('name', refTableName)
            .single();

          if (refTableError || !refTable) {
            return NextResponse.json(
              { error: `Referenced table '${refTableName}' not found` },
              { status: 400 }
            );
          }

          const refTableIdInt = refTable.id;

          // Check if the referenced record exists
          const { data: refRecords, error: refQueryError } = await supabase
            .from('records')
            .select('id, data_json')
            .eq('table_id', refTableIdInt);

          if (refQueryError) {
            console.error('Error checking foreign key reference:', refQueryError);
            return NextResponse.json(
              { error: `Failed to validate foreign key reference for '${column.name}'` },
              { status: 500 }
            );
          }

          const refRecordExists = refRecords?.some((record: any) => 
            record.data_json && record.data_json[refColumnName] === referencedValue
          );

          if (!refRecordExists) {
            return NextResponse.json(
              { error: `Referenced record with ${refColumnName} '${referencedValue}' not found in table '${refTableName}'` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Update record
    // Note: table_id is integer, records.id is UUID
    const { data: record, error: updateError } = await supabase
      .from('records')
      .update({ data_json: processedData })
      .eq('id', recordId)
      .eq('table_id', tableIdInt)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update record' },
        { status: 500 }
      );
    }

    // Transform record: flatten data_json into top-level properties
    // Exclude 'id' from data_json to avoid overriding the database primary key
    const { id: _, ...dataWithoutId } = record.data_json || {};
    const transformedRecord = {
      id: record.id,
      created_at: record.created_at,
      updated_at: record.updated_at,
      ...dataWithoutId,
    };

    return NextResponse.json({
      success: true,
      record: transformedRecord,
      message: 'Record updated successfully'
    });

  } catch (error: any) {
    console.error('Unexpected error in update record:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/database/[id]/tables/[tableId]/records?recordId=123
 * Deletes a specific record
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');

    if (!recordId) {
      console.error('DELETE failed: No recordId provided');
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user session
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !user) {
      console.error('DELETE failed: Unauthorized', sessionError);
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log(`DELETE: userId=${userId}, databaseId=${params.id}, tableId=${params.tableId}, recordId=${recordId}`);

    // Verify database ownership
    const { data: database, error: dbError } = await supabase
      .from('databases')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();

    if (dbError || !database) {
      console.error('DELETE failed: Database not found or access denied', dbError);
      return NextResponse.json(
        { error: 'Database not found or access denied' },
        { status: 404 }
      );
    }

    // Verify table ownership
    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('*')
      .eq('id', params.tableId)
      .eq('database_id', params.id)
      .single();

    if (tableError || !table) {
      console.error('DELETE failed: Table not found or access denied', tableError);
      return NextResponse.json(
        { error: 'Table not found or access denied' },
        { status: 404 }
      );
    }

    // Verify record exists
    // Note: records.id is UUID (text), table_id is integer
    const tableIdInt = parseInt(params.tableId, 10);
    
    // IMPORTANT: Explicitly cast id to text to handle UUID strings
    const { data: existingRecord, error: recordCheckError } = await supabase
      .from('records')
      .select('id, table_id')
      .eq('id', recordId.toString()) // Ensure string type
      .eq('table_id', tableIdInt)
      .single();

    if (recordCheckError || !existingRecord) {
      console.error('DELETE failed: Record not found', {
        error: recordCheckError,
        recordId,
        tableId: params.tableId,
        tableIdInt,
        message: recordCheckError?.message,
        code: recordCheckError?.code,
      });
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    console.log('DELETE: Record found, proceeding with deletion', {
      recordId: existingRecord.id,
      tableId: existingRecord.table_id,
    });

    // Check for foreign key constraints and handle CASCADE/RESTRICT
    const schema = table.schema_json;
    
    // Get the record data to check which values are being deleted
    const { data: recordToDelete, error: fetchError } = await supabase
      .from('records')
      .select('data_json')
      .eq('id', recordId)
      .single();

    if (fetchError || !recordToDelete) {
      console.error('DELETE failed: Could not fetch record data', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch record data' },
        { status: 500 }
      );
    }

    // Find all tables in the same database that might reference this table
    const { data: allTables, error: tablesError } = await supabase
      .from('tables')
      .select('id, name, schema_json')
      .eq('database_id', params.id);

    if (tablesError) {
      console.error('DELETE failed: Could not fetch tables', tablesError);
    } else {
      // Check each table for foreign key references to this table
      for (const otherTable of allTables || []) {
        const otherSchema = otherTable.schema_json;
        if (!otherSchema || !otherSchema.columns) continue;

        for (const column of otherSchema.columns) {
          if (column.references && column.references.table === table.name) {
            const refColumnName = column.references.column;
            const referencedValue = recordToDelete.data_json[refColumnName];

            if (!referencedValue) continue;

            // Find records that reference this record
            const otherTableIdInt = otherTable.id;
            const { data: referencingRecords, error: refQueryError } = await supabase
              .from('records')
              .select('id, data_json')
              .eq('table_id', otherTableIdInt);

            if (refQueryError) {
              console.error('DELETE failed: Could not check references', refQueryError);
              continue;
            }

            const affectedRecords = referencingRecords?.filter((rec: any) => 
              rec.data_json && rec.data_json[column.name] === referencedValue
            );

            if (affectedRecords && affectedRecords.length > 0) {
              const onDelete = column.references.onDelete || 'RESTRICT';

              if (onDelete === 'RESTRICT') {
                // Prevent deletion
                return NextResponse.json(
                  { error: `Cannot delete record: ${affectedRecords.length} record(s) in table '${otherTable.name}' reference this record` },
                  { status: 409 }
                );
              } else if (onDelete === 'CASCADE') {
                // Delete referencing records
                for (const refRecord of affectedRecords) {
                  await supabase
                    .from('records')
                    .delete()
                    .eq('id', refRecord.id)
                    .eq('table_id', otherTableIdInt);
                }
                console.log(`DELETE: Cascaded deletion of ${affectedRecords.length} records in ${otherTable.name}`);
              } else if (onDelete === 'SET NULL') {
                // Set foreign key to null
                for (const refRecord of affectedRecords) {
                  const updatedData = { ...refRecord.data_json };
                  updatedData[column.name] = null;
                  
                  await supabase
                    .from('records')
                    .update({ data_json: updatedData })
                    .eq('id', refRecord.id)
                    .eq('table_id', otherTableIdInt);
                }
                console.log(`DELETE: Set ${column.name} to NULL in ${affectedRecords.length} records in ${otherTable.name}`);
              }
            }
          }
        }
      }
    }

    // Delete record
    const { error: deleteError } = await supabase
      .from('records')
      .delete()
      .eq('id', recordId)
      .eq('table_id', tableIdInt);

    if (deleteError) {
      console.error('DELETE failed: Database error', {
        error: deleteError,
        code: deleteError.code,
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
      });
      return NextResponse.json(
        { error: `Failed to delete record: ${deleteError.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    console.log(`DELETE success: Deleted record ${recordId}`);


    return NextResponse.json({
      success: true,
      message: 'Record deleted successfully'
    });

  } catch (error: any) {
    console.error('Unexpected error in delete record:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
