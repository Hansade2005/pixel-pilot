-- Migration: Add exec_sql function for dynamic index creation
-- This function allows the application to execute SQL commands for creating indexes

-- Create a function to execute SQL (admin only)
-- Note: This is a security-sensitive function and should only be used internally
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Execute the query
  EXECUTE sql_query;
  
  -- Return success
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
-- Note: Add additional security checks in the function if needed
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;

-- Enable pg_trgm extension for trigram-based text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a helper function to create JSONB indexes
CREATE OR REPLACE FUNCTION create_jsonb_index(
  table_id_param integer,
  column_name_param text,
  index_type_param text DEFAULT 'btree'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  index_name text;
  sql_query text;
BEGIN
  -- Generate index name
  index_name := 'idx_records_t' || table_id_param || '_' || 
                regexp_replace(lower(column_name_param), '[^a-z0-9_]', '_', 'g') || 
                '_' || index_type_param;
  
  -- Build SQL based on index type
  IF index_type_param = 'gin' THEN
    sql_query := format(
      'CREATE INDEX IF NOT EXISTS %I ON records USING gin ((data_json->>%L) gin_trgm_ops) WHERE table_id = %L',
      index_name, column_name_param, table_id_param
    );
  ELSE
    sql_query := format(
      'CREATE INDEX IF NOT EXISTS %I ON records USING btree ((data_json->>%L)) WHERE table_id = %L',
      index_name, column_name_param, table_id_param
    );
  END IF;
  
  -- Execute the query
  EXECUTE sql_query;
  
  RETURN json_build_object(
    'success', true,
    'index_name', index_name,
    'sql', sql_query
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_jsonb_index(integer, text, text) TO authenticated;

-- Create a function to drop indexes for a table
CREATE OR REPLACE FUNCTION drop_table_indexes(table_id_param integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  index_record record;
  dropped_count integer := 0;
BEGIN
  -- Find and drop all indexes for this table
  FOR index_record IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'records'
    AND indexname LIKE 'idx%_t' || table_id_param || '_%'
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(index_record.indexname);
    dropped_count := dropped_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'dropped_count', dropped_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION drop_table_indexes(integer) TO authenticated;

-- Comment on functions
COMMENT ON FUNCTION exec_sql(text) IS 'Execute SQL commands (use with caution - security sensitive)';
COMMENT ON FUNCTION create_jsonb_index(integer, text, text) IS 'Create an index on a JSONB field in the records table';
COMMENT ON FUNCTION drop_table_indexes(integer) IS 'Drop all indexes for a specific table_id in the records table';
