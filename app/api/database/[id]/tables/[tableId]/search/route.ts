import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/database/[id]/tables/[tableId]/search?q=query&fields=col1,col2&fuzzy=true&page=1&limit=20
 * Full-text search across table records with fuzzy matching
 * 
 * Query Parameters:
 * - q: Search query (required)
 * - fields: Comma-separated list of fields to search (optional, searches all text fields if not provided)
 * - fuzzy: Enable fuzzy matching (optional, default: true)
 * - caseSensitive: Enable case-sensitive search (optional, default: false)
 * - page: Page number for pagination (optional, default: 1)
 * - limit: Number of results per page (optional, default: 20, max: 100)
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const fieldsParam = searchParams.get('fields');
    const fuzzy = searchParams.get('fuzzy') !== 'false'; // Default true
    const caseSensitive = searchParams.get('caseSensitive') === 'true'; // Default false
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Skip authentication - service role provides full access
    // Get current user session
    // const { data: { user }, error: sessionError } = await supabase.auth.getUser();
    
    // if (sessionError || !user) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized - Please log in' },
    //     { status: 401 }
    //   );
    // }

    // const userId = user.id;

    // Get table without ownership verification
    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('*, databases!inner(*)')
      .eq('id', params.tableId)
      .eq('database_id', params.id)
      .single();

    if (tableError || !table) {
      return NextResponse.json(
        { error: 'Table not found or access denied' },
        { status: 404 }
      );
    }

    const schema = table.schema_json;

    // Determine which fields to search
    let searchFields: string[] = [];
    if (fieldsParam) {
      searchFields = fieldsParam.split(',').map(f => f.trim()).filter(Boolean);
    } else {
      // Auto-detect text fields from schema
      searchFields = schema.columns
        .filter((col: any) => 
          col.type === 'text' || 
          col.type === 'email' || 
          col.type === 'url' ||
          col.type === 'json'
        )
        .map((col: any) => col.name);
    }

    if (searchFields.length === 0) {
      return NextResponse.json(
        { error: 'No searchable text fields found in table' },
        { status: 400 }
      );
    }

    // Fetch all records (we'll filter in-memory for flexibility)
    const { data: records, error: recordsError } = await supabase
      .from('records')
      .select('*')
      .eq('table_id', params.tableId)
      .order('created_at', { ascending: false });

    if (recordsError) {
      console.error('Search fetch error:', recordsError);
      return NextResponse.json(
        { error: 'Failed to fetch records' },
        { status: 500 }
      );
    }

    // Perform search filtering
    const searchQuery = caseSensitive ? query : query.toLowerCase();
    const matchedRecords = (records || []).filter((record: any) => {
      if (!record.data_json) return false;

      for (const field of searchFields) {
        const value = record.data_json[field];
        if (value === null || value === undefined) continue;

        const stringValue = caseSensitive ? String(value) : String(value).toLowerCase();

        if (fuzzy) {
          // Fuzzy matching: check if query is contained in value
          if (stringValue.includes(searchQuery)) {
            return true;
          }

          // Additional fuzzy logic: split query into words and check each
          const queryWords = searchQuery.split(/\s+/).filter(Boolean);
          const matchedWords = queryWords.filter(word => stringValue.includes(word));
          
          // Match if at least 60% of words are found
          if (queryWords.length > 1 && matchedWords.length / queryWords.length >= 0.6) {
            return true;
          }
        } else {
          // Exact matching: entire query must match
          if (stringValue === searchQuery) {
            return true;
          }
        }
      }

      return false;
    });

    // Calculate relevance scores for sorting
    const scoredRecords = matchedRecords.map((record: any) => {
      let score = 0;

      for (const field of searchFields) {
        const value = record.data_json[field];
        if (value === null || value === undefined) continue;

        const stringValue = caseSensitive ? String(value) : String(value).toLowerCase();

        // Exact match: highest score
        if (stringValue === searchQuery) {
          score += 100;
        }
        // Starts with query: high score
        else if (stringValue.startsWith(searchQuery)) {
          score += 50;
        }
        // Contains query: medium score
        else if (stringValue.includes(searchQuery)) {
          score += 25;
        }
        // Word match: lower score
        else {
          const queryWords = searchQuery.split(/\s+/).filter(Boolean);
          const matchedWords = queryWords.filter(word => stringValue.includes(word));
          score += matchedWords.length * 5;
        }
      }

      return { record, score };
    });

    // Sort by relevance score (descending)
    scoredRecords.sort((a, b) => b.score - a.score);

    // Pagination
    const total = scoredRecords.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedRecords = scoredRecords.slice(offset, offset + limit);

    // Transform records (flatten data_json)
    const transformedRecords = paginatedRecords.map(({ record, score }) => ({
      id: record.id,
      ...record.data_json,
      created_at: record.created_at,
      updated_at: record.updated_at,
      _search_score: score, // Include relevance score
    }));

    return NextResponse.json({
      success: true,
      query,
      searchFields,
      total,
      page,
      limit,
      totalPages,
      results: transformedRecords,
    });

  } catch (error: any) {
    console.error('Unexpected error in search:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
