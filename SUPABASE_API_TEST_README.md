# Supabase Management API Test Script

This standalone JavaScript script tests the Supabase Management API functionality used in the `/api/supabase/execute-sql` route.

## Setup

1. **Get your Supabase Management API Token:**
   - Go to https://supabase.com/dashboard/account/tokens
   - Generate a new access token
   - Copy the token

2. **Find your Project ID:**
   - Go to your Supabase project dashboard
   - The project ID is in the URL: `https://supabase.com/dashboard/project/{PROJECT_ID}`

3. **Set Environment Variables:**
   ```bash
   # Windows PowerShell
   $env:SUPABASE_ACCESS_TOKEN = "your-token-here"
   $env:SUPABASE_PROJECT_ID = "your-project-id"

   # Windows Command Prompt
   set SUPABASE_ACCESS_TOKEN=your-token-here
   set SUPABASE_PROJECT_ID=your-project-id

   # Linux/macOS
   export SUPABASE_ACCESS_TOKEN="your-token-here"
   export SUPABASE_PROJECT_ID="your-project-id"
   ```

## Running the Test

```bash
node test-supabase-management-api.js
```

## What the Test Does

The script performs these operations in sequence:

1. **CREATE TABLE** - Creates a test table with various column types
2. **INSERT** - Adds test data to the table
3. **UPDATE** - Modifies the inserted data
4. **DELETE** - Removes the test data
5. **DROP TABLE** - Cleans up the test table

It also tests the security feature that blocks SELECT operations.

## Expected Output

When run with valid credentials, you should see:
```
🚀 Testing Supabase Management API...

🔧 Initializing Supabase Management API client...
✅ Client initialized successfully

📝 Test 1: Creating a test table...
✅ Table created successfully

📝 Test 2: Inserting test data...
✅ Data inserted successfully

...and so on for all tests
```

## Error Handling

The script includes comprehensive error handling for common issues:
- Invalid or expired tokens
- Permission errors
- Network issues
- SQL syntax errors

## Security Note

This script only tests CREATE, INSERT, UPDATE, DELETE operations. SELECT operations are intentionally blocked for security reasons, as implemented in the API route.