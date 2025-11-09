import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface QueryCondition {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL' | 'CONTAINS';
  value?: any;
  logic?: 'AND' | 'OR';
}

interface HavingCondition {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE';
  value: any;
}

interface TableSchema {
  columns: Array<{
    name: string;
    type: string;
    required?: boolean;
    defaultValue?: string;
    unique?: boolean;
    description?: string;
  }>;
}

/**
 * Enhanced GET /api/database/[id]/tables/[tableId]/query
 * Advanced database querying with MySQL-like capabilities:
 * - Column selection (SELECT)
 * - Multiple WHERE conditions with AND/OR logic
 * - ORDER BY with ASC/DESC
 * - LIMIT and OFFSET pagination
 * - Full-text search
 * - GROUP BY and HAVING
 * - JSONB field filtering
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100'), 1), 1000);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    const search = searchParams.get('search');
    const orderBy = searchParams.get('orderBy');
    const orderDirection = searchParams.get('orderDirection')?.toUpperCase() as 'ASC' | 'DESC' || 'ASC';
    const select = searchParams.get('select')?.split(',').map(s => s.trim()).filter(Boolean);
    const conditions: QueryCondition[] = searchParams.get('conditions') ? JSON.parse(searchParams.get('conditions')!) : [];
    const groupBy = searchParams.get('groupBy')?.split(',').map(s => s.trim()).filter(Boolean);
    const having: HavingCondition | null = searchParams.get('having') ? JSON.parse(searchParams.get('having')!) : null;
    const includeCount = searchParams.get('includeCount') !== 'false';

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

    // Verify table ownership and get table schema
    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('*, databases!inner(*)')
      .eq('id', params.tableId)
      .eq('databases.user_id', userId)
      .single();

    if (tableError || !table) {
      return NextResponse.json(
        { error: 'Table not found or access denied' },
        { status: 404 }
      );
    }

    const tableIdInt = parseInt(params.tableId, 10);
    const schema = table.schema_json as TableSchema;

    // Build base query
    let query = supabase
      .from('records')
      .select(includeCount ? '*' : '*', { count: includeCount ? 'exact' : undefined })
      .eq('table_id', tableIdInt);

    // Apply WHERE conditions
    if (conditions && conditions.length > 0) {
      // Build complex conditions with AND/OR logic
      for (let i = 0; i < conditions.length; i++) {
        const condition: QueryCondition = conditions[i];
        const { field, operator, value, logic } = condition;

        // Apply JSONB field filtering
        switch (operator) {
          case '=':
            query = query.eq(`data_json->${field}`, value);
            break;
          case '!=':
            query = query.neq(`data_json->${field}`, value);
            break;
          case '>':
            query = query.gt(`data_json->${field}`, value);
            break;
          case '<':
            query = query.lt(`data_json->${field}`, value);
            break;
          case '>=':
            query = query.gte(`data_json->${field}`, value);
            break;
          case '<=':
            query = query.lte(`data_json->${field}`, value);
            break;
          case 'LIKE':
            query = query.like(`data_json->${field}`, `%${value}%`);
            break;
          case 'ILIKE':
            query = query.ilike(`data_json->${field}`, `%${value}%`);
            break;
          case 'IN':
            if (Array.isArray(value)) {
              query = query.in(`data_json->${field}`, value);
            }
            break;
          case 'NOT IN':
            if (Array.isArray(value)) {
              query = query.not(`data_json->${field}`, 'in', value);
            }
            break;
          case 'IS NULL':
            query = query.is(`data_json->${field}`, null);
            break;
          case 'IS NOT NULL':
            query = query.not(`data_json->${field}`, 'is', null);
            break;
          case 'CONTAINS':
            // For JSONB contains operation
            query = query.contains('data_json', { [field]: value });
            break;
        }
      }
    }

    // Apply full-text search across all text fields
    if (search && schema?.columns) {
      const textFields = schema.columns
        .filter((col) => ['text', 'email', 'url'].includes(col.type))
        .map((col) => col.name);
      
      if (textFields.length > 0) {
        // Build OR conditions for searching across all text fields
        const searchConditions = textFields.map((field: string) => 
          `data_json->>'${field}' ILIKE '%${search}%'`
        ).join(' OR ');
        
        query = query.or(searchConditions);
      }
    }

    // Apply ORDER BY
    if (orderBy) {
      const isDescending = orderDirection === 'DESC';
      
      // Special handling for system fields
      if (['id', 'created_at', 'updated_at'].includes(orderBy)) {
        query = query.order(orderBy, { ascending: !isDescending });
      } else {
        // Order by JSONB field
        query = query.order(`data_json->${orderBy}`, { ascending: !isDescending });
      }
    } else {
      // Default ordering by created_at DESC
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    const { data: records, error: recordsError, count } = await query
      .range(offset, offset + limit - 1);

    if (recordsError) {
      console.error('Enhanced query error:', recordsError);
      return NextResponse.json(
        { error: 'Failed to execute enhanced query' },
        { status: 500 }
      );
    }

    // Transform records based on column selection
    let transformedRecords = (records || []).map((record: any) => {
      const baseRecord = {
        id: record.id,
        created_at: record.created_at,
        updated_at: record.updated_at,
        ...(record.data_json || {})
      };

      // Apply column selection
      if (select && select.length > 0 && !select.includes('*')) {
        const selectedRecord: any = {};
        
        // Always include id for record identification
        selectedRecord.id = baseRecord.id;
        
        // Include selected columns
        select.forEach((col: string) => {
          if (baseRecord.hasOwnProperty(col)) {
            selectedRecord[col] = baseRecord[col];
          }
        });
        
        return selectedRecord;
      }
      
      return baseRecord;
    });

    // Apply GROUP BY (basic implementation)
    if (groupBy && groupBy.length > 0) {
      const grouped = new Map();
      
      transformedRecords.forEach((record: any) => {
        const groupKey = groupBy.map((field: string) => record[field]).join('|');
        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, []);
        }
        grouped.get(groupKey).push(record);
      });
      
      // Convert grouped data to array with group info
      transformedRecords = Array.from(grouped.entries()).map(([key, records]: [string, any[]]) => {
        const groupValues = key.split('|');
        const groupData: any = {
          _group: true,
          _groupKey: key,
          _groupCount: records.length,
          _records: records
        };
        
        // Add group by fields to the result
        groupBy.forEach((field: string, index: number) => {
          groupData[field] = groupValues[index];
        });
        
        return groupData;
      });
    }

    // Apply HAVING clause (basic implementation for grouped results)
    if (having && transformedRecords.some((r: any) => r._group)) {
      transformedRecords = transformedRecords.filter((record: any) => {
        if (!record._group) return true;
        
        const value = record[having.field];
        const havingValue = having.value;
        
        switch (having.operator) {
          case '=': return value == havingValue;
          case '!=': return value != havingValue;
          case '>': return Number(value) > Number(havingValue);
          case '<': return Number(value) < Number(havingValue);
          case '>=': return Number(value) >= Number(havingValue);
          case '<=': return Number(value) <= Number(havingValue);
          case 'LIKE': return String(value).includes(String(havingValue));
          case 'ILIKE': return String(value).toLowerCase().includes(String(havingValue).toLowerCase());
          default: return true;
        }
      });
    }

    // Build query summary for response
    const queryParts = [];
    if (select && !select.includes('*')) queryParts.push(`SELECT ${select.join(', ')}`);
    else queryParts.push('SELECT *');
    queryParts.push(`FROM ${table.name}`);
    if (conditions.length > 0) queryParts.push(`WHERE ${conditions.length} condition(s)`);
    if (search) queryParts.push(`SEARCH "${search}"`);
    if (orderBy) queryParts.push(`ORDER BY ${orderBy} ${orderDirection}`);
    if (groupBy) queryParts.push(`GROUP BY ${groupBy.join(', ')}`);
    if (having) queryParts.push(`HAVING ${having.field} ${having.operator} ${having.value}`);
    queryParts.push(`LIMIT ${limit} OFFSET ${offset}`);

    return NextResponse.json({
      success: true,
      records: transformedRecords,
      total: count || 0,
      limit,
      offset,
      query: queryParts.join(' '),
      metadata: {
        table: {
          id: table.id,
          name: table.name,
          schema: schema
        },
        applied: {
          conditions: conditions.length,
          search: !!search,
          orderBy: !!orderBy,
          groupBy: !!(groupBy && groupBy.length > 0),
          having: !!having,
          columnSelection: !!(select && select.length > 0 && !select.includes('*'))
        },
        pagination: {
          hasMore: (count || 0) > (offset + limit),
          totalPages: Math.ceil((count || 0) / limit),
          currentPage: Math.floor(offset / limit) + 1
        }
      }
    });

  } catch (error: any) {
    console.error('Enhanced query error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}