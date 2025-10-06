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
        const value = processedData[column.name];
        if (value === null || value === undefined) continue;

        // Query existing records to check for duplicates
        const { data: existingRecords, error: queryError } = await supabase
          .from('records')
          .select('id, data_json')
          .eq('table_id', params.tableId);

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
        if (column.references && processedData[column.name]) {
          // TODO: Check if referenced record exists
          // This requires querying the referenced table
          // For now, we'll skip this to avoid circular dependencies
        }
      }
    }

    // Insert record
    const { data: record, error: recordError } = await supabase
      .from('records')
      .insert({
        table_id: params.tableId,
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
    const transformedRecord = {
      id: record.id,
      created_at: record.created_at,
      updated_at: record.updated_at,
      ...(record.data_json || {}),
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
    const { data: records, error: recordsError, count } = await supabase
      .from('records')
      .select('*', { count: 'exact' })
      .eq('table_id', params.tableId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (recordsError) {
      return NextResponse.json(
        { error: 'Failed to fetch records' },
        { status: 500 }
      );
    }

    // Transform records: flatten data_json into top-level properties
    const transformedRecords = (records || []).map((record: any) => ({
      id: record.id,
      created_at: record.created_at,
      updated_at: record.updated_at,
      ...(record.data_json || {}), // Spread data_json fields to top level
    }));

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

    if (schema && schema.columns) {
      // Validate data types and constraints
      for (const column of schema.columns) {
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
        const value = processedData[column.name];
        if (value === null || value === undefined) continue;

        const { data: existingRecords, error: queryError } = await supabase
          .from('records')
          .select('id, data_json')
          .eq('table_id', params.tableId)
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
    }

    // Update record
    const { data: record, error: updateError } = await supabase
      .from('records')
      .update({ data_json: processedData })
      .eq('id', recordId)
      .eq('table_id', params.tableId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update record' },
        { status: 500 }
      );
    }

    // Transform record: flatten data_json into top-level properties
    const transformedRecord = {
      id: record.id,
      created_at: record.created_at,
      updated_at: record.updated_at,
      ...(record.data_json || {}),
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
    const { data: existingRecord, error: recordCheckError } = await supabase
      .from('records')
      .select('id')
      .eq('id', recordId)
      .eq('table_id', params.tableId)
      .single();

    if (recordCheckError || !existingRecord) {
      console.error('DELETE failed: Record not found', recordCheckError);
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    // Delete record
    const { error: deleteError } = await supabase
      .from('records')
      .delete()
      .eq('id', recordId)
      .eq('table_id', params.tableId);

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
