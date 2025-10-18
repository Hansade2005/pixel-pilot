-- SQL function to execute safe SQL queries in Supabase
-- This function should be created in your Supabase database

-- Create the execute_sql function
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result_json JSON;
    query_type TEXT;
    affected_rows INTEGER := 0;
BEGIN
    -- Basic validation - prevent dangerous operations
    IF sql_query ~* '^(DROP|TRUNCATE|DELETE|UPDATE|INSERT|ALTER|CREATE|GRANT|REVOKE|EXECUTE)' THEN
        -- For data modification queries, be more restrictive
        IF sql_query ~* '^(DROP|TRUNCATE)' THEN
            RAISE EXCEPTION 'Dangerous operation not allowed: %', sql_query;
        END IF;

        -- For DML operations, ensure they have WHERE clauses for safety
        IF sql_query ~* '^(DELETE|UPDATE).*' AND sql_query !~* '\s+WHERE\s+' THEN
            RAISE EXCEPTION 'DML operations require WHERE clause for safety';
        END IF;
    END IF;

    -- Execute the query based on type
    query_type := upper(split_part(trim(sql_query), ' ', 1));

    CASE query_type
        WHEN 'SELECT' THEN
            -- For SELECT queries, return the results as JSON
            EXECUTE 'SELECT json_agg(t) FROM (' || sql_query || ') t' INTO result_json;
            RETURN json_build_object(
                'success', true,
                'data', COALESCE(result_json, '[]'::json),
                'rowCount', json_array_length(COALESCE(result_json, '[]'::json))
            );

        WHEN 'INSERT' THEN
            -- For INSERT, return affected row count
            EXECUTE sql_query;
            GET DIAGNOSTICS affected_rows = ROW_COUNT;
            RETURN json_build_object(
                'success', true,
                'rowCount', affected_rows,
                'message', format('Inserted %s row(s)', affected_rows)
            );

        WHEN 'UPDATE' THEN
            -- For UPDATE, return affected row count
            EXECUTE sql_query;
            GET DIAGNOSTICS affected_rows = ROW_COUNT;
            RETURN json_build_object(
                'success', true,
                'rowCount', affected_rows,
                'message', format('Updated %s row(s)', affected_rows)
            );

        WHEN 'DELETE' THEN
            -- For DELETE, return affected row count
            EXECUTE sql_query;
            GET DIAGNOSTICS affected_rows = ROW_COUNT;
            RETURN json_build_object(
                'success', true,
                'rowCount', affected_rows,
                'message', format('Deleted %s row(s)', affected_rows)
            );

        ELSE
            -- For other operations (CREATE TABLE, etc.)
            EXECUTE sql_query;
            RETURN json_build_object(
                'success', true,
                'message', 'Query executed successfully'
            );
    END CASE;

EXCEPTION
    WHEN OTHERS THEN
        -- Return error details
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO authenticated;

-- Create a more permissive version for service role (admin operations)
CREATE OR REPLACE FUNCTION execute_sql_admin(sql_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result_json JSON;
    query_type TEXT;
    affected_rows INTEGER := 0;
BEGIN
    -- Execute the query based on type (less restrictive for admin)
    query_type := upper(split_part(trim(sql_query), ' ', 1));

    CASE query_type
        WHEN 'SELECT' THEN
            EXECUTE 'SELECT json_agg(t) FROM (' || sql_query || ') t' INTO result_json;
            RETURN json_build_object(
                'success', true,
                'data', COALESCE(result_json, '[]'::json),
                'rowCount', json_array_length(COALESCE(result_json, '[]'::json))
            );

        WHEN 'INSERT' THEN
            EXECUTE sql_query;
            GET DIAGNOSTICS affected_rows = ROW_COUNT;
            RETURN json_build_object(
                'success', true,
                'rowCount', affected_rows,
                'message', format('Inserted %s row(s)', affected_rows)
            );

        WHEN 'UPDATE' THEN
            EXECUTE sql_query;
            GET DIAGNOSTICS affected_rows = ROW_COUNT;
            RETURN json_build_object(
                'success', true,
                'rowCount', affected_rows,
                'message', format('Updated %s row(s)', affected_rows)
            );

        WHEN 'DELETE' THEN
            EXECUTE sql_query;
            GET DIAGNOSTICS affected_rows = ROW_COUNT;
            RETURN json_build_object(
                'success', true,
                'rowCount', affected_rows,
                'message', format('Deleted %s row(s)', affected_rows)
            );

        ELSE
            EXECUTE sql_query;
            RETURN json_build_object(
                'success', true,
                'message', 'Query executed successfully'
            );
    END CASE;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        );
END;
$$;

-- Grant execute permission to service role only
GRANT EXECUTE ON FUNCTION execute_sql_admin(TEXT) TO service_role;

-- Note: To use the admin version, you would call execute_sql_admin instead of execute_sql
-- This allows more dangerous operations when called with service role permissions