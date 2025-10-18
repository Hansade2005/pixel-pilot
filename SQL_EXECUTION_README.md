# SQL Execution API Setup Guide

This guide explains how to set up and use the SQL execution functionality in your PiPilot.

## Overview

The SQL execution API allows users to run SQL queries against their Supabase databases through a secure, controlled interface. It uses PostgreSQL functions to execute queries safely.

## Setup Instructions

### 1. Create the Database Functions

Run the SQL commands in `supabase-sql-functions.sql` in your Supabase SQL editor:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-sql-functions.sql`
4. Execute the SQL

This creates two functions:
- `execute_sql`: For regular users with safety restrictions
- `execute_sql_admin`: For admin operations with fewer restrictions

### 2. API Endpoint

The API endpoint is available at:
```
POST /api/database/[databaseId]/sql/execute
```

**Request Body:**
```json
{
  "query": "SELECT * FROM your_table LIMIT 10"
}
```

**Response Format:**
```json
{
  "success": true,
  "query": "SELECT * FROM your_table LIMIT 10",
  "queryType": "SELECT",
  "executionTime": 45,
  "rowCount": 10,
  "columns": ["id", "name", "email"],
  "rows": [
    {"id": 1, "name": "John", "email": "john@example.com"},
    // ... more rows
  ],
  "message": ""
}
```

## Security Features

### Query Validation
- Prevents dangerous operations (DROP, TRUNCATE, etc.) for regular users
- Requires WHERE clauses for UPDATE and DELETE operations
- Validates query syntax before execution

### User Authorization
- Verifies user authentication
- Ensures users can only query databases they own
- Uses Row Level Security (RLS) policies

### Error Handling
- Comprehensive error reporting
- Execution time tracking
- Safe error messages without exposing sensitive information

## Usage Examples

### SELECT Queries
```javascript
const response = await fetch(`/api/database/${databaseId}/sql/execute`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'SELECT id, name, created_at FROM users WHERE active = true'
  })
});

const result = await response.json();
console.log(result.rows); // Array of user objects
```

### INSERT Queries
```javascript
const response = await fetch(`/api/database/${databaseId}/sql/execute`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'INSERT INTO users (name, email) VALUES ($1, $2)',
    params: ['John Doe', 'john@example.com']
  })
});

const result = await response.json();
console.log(result.message); // "Inserted 1 row(s)"
```

### UPDATE Queries (with WHERE clause)
```javascript
const response = await fetch(`/api/database/${databaseId}/sql/execute`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'UPDATE users SET last_login = NOW() WHERE id = 123'
  })
});

const result = await response.json();
console.log(result.message); // "Updated 1 row(s)"
```

## Error Responses

### Dangerous Query Detected
```json
{
  "error": "Potentially dangerous query detected",
  "message": "This query may modify or delete data. Please review and confirm the operation.",
  "requiresConfirmation": true,
  "query": "DROP TABLE users"
}
```

### Query Execution Failed
```json
{
  "error": "Query execution failed",
  "message": "relation \"nonexistent_table\" does not exist",
  "executionTime": 12
}
```

### Authorization Error
```json
{
  "error": "Unauthorized"
}
```

## Advanced Usage

### Using Admin Functions

For admin operations that require more permissions, you can modify the API route to use `execute_sql_admin` instead of `execute_sql`. This allows operations like table creation/dropping.

### Custom Validation

You can extend the validation logic in the API route to add custom safety checks based on your application's needs.

### Query Logging

Consider adding query logging for audit purposes, especially for write operations.

## Troubleshooting

### Function Not Found Error
If you get "function execute_sql(...) does not exist", make sure you've run the SQL setup script in your Supabase database.

### Permission Denied
Ensure the functions have been granted appropriate permissions to the authenticated role.

### RLS Issues
If queries return no results when they should, check your Row Level Security policies on the affected tables.