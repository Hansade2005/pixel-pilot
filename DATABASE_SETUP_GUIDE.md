# Quick Setup Guide - Database System

## 🚀 Step-by-Step Setup

### Step 1: Run SQL Schema in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "+ New Query"
5. Copy the entire contents of `supabase-schema.sql` file
6. Paste into the SQL editor
7. Click "Run" or press `Cmd/Ctrl + Enter`

**Expected Result:**
```
Success: Tables created
3 tables: databases, tables, records
Indexes created
RLS policies enabled
```

### Step 2: Verify Tables Created

1. In Supabase Dashboard, go to "Table Editor"
2. You should see 3 new tables:
   - `databases`
   - `tables`
   - `records`
3. Click each table to verify structure

### Step 3: Test Authentication

Make sure users can sign up and log in:
```bash
# Your app should already have auth setup
# Verify by logging in to your app
```

### Step 4: Test Database Creation

1. Open your app: `http://localhost:3000`
2. Log in with a test user
3. Create or open a workspace
4. Navigate to: `/workspace/[workspace-id]/database`
5. Click "Create Database" button
6. Wait for success toast
7. Verify:
   - Database appears in Supabase `databases` table
   - `users` table automatically created in `tables` table

### Step 5: Test API Endpoints

#### Test 1: Create Database
```bash
curl -X POST http://localhost:3000/api/database/create \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-workspace-123",
    "name": "test_db"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "database": {
    "id": 1,
    "user_id": "...",
    "project_id": "test-workspace-123",
    "name": "test_db",
    "created_at": "2025-10-06T..."
  },
  "usersTable": {...},
  "message": "Database created successfully with users table"
}
```

#### Test 2: Get Database Details
```bash
curl http://localhost:3000/api/database/1
```

#### Test 3: Create Custom Table
```bash
curl -X POST http://localhost:3000/api/database/1/tables/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "posts",
    "schema_json": {
      "columns": [
        {"name": "id", "type": "uuid", "primary_key": true, "required": true},
        {"name": "title", "type": "text", "required": true},
        {"name": "content", "type": "text"},
        {"name": "published", "type": "boolean", "default": false},
        {"name": "created_at", "type": "timestamp", "default": "NOW()"}
      ]
    }
  }'
```

#### Test 4: Insert Record
```bash
curl -X POST http://localhost:3000/api/database/1/tables/2/records \
  -H "Content-Type: application/json" \
  -d '{
    "data_json": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "My First Post",
      "content": "Hello World!",
      "published": true,
      "created_at": "2025-10-06T12:00:00Z"
    }
  }'
```

#### Test 5: Query Records
```bash
curl -X POST http://localhost:3000/api/database/1/query \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "posts",
    "filters": {"published": true},
    "limit": 10,
    "offset": 0
  }'
```

---

## ✅ Verification Checklist

### Backend Verification
- [ ] SQL schema runs without errors
- [ ] Tables appear in Supabase dashboard
- [ ] RLS policies are enabled
- [ ] Create database API works
- [ ] Users table auto-created
- [ ] Create table API works
- [ ] Insert record API works
- [ ] Query records API works
- [ ] Update record API works
- [ ] Delete record API works

### Frontend Verification
- [ ] Database page loads at `/workspace/[id]/database`
- [ ] "Create Database" button visible
- [ ] Clicking button creates database
- [ ] Success toast appears
- [ ] Database stats display correctly
- [ ] Tables list displays (empty at first)
- [ ] Loading states work
- [ ] Error handling works

### Security Verification
- [ ] Users can't see other users' databases
- [ ] Users can't create duplicate databases
- [ ] Schema validation rejects invalid schemas
- [ ] Data validation rejects invalid data
- [ ] RLS policies prevent unauthorized access

---

## 🐛 Troubleshooting

### Issue: "Unauthorized - Please log in"

**Cause:** Session auth not working

**Fix:**
1. Check if user is logged in
2. Verify Supabase auth is configured
3. Check `.env.local` has correct Supabase keys
4. Ensure session is being passed to API routes

### Issue: "Database already exists for this project"

**Cause:** Trying to create duplicate database

**Fix:**
This is expected behavior. Each workspace can only have one database. If you need to reset:
```sql
-- In Supabase SQL Editor
DELETE FROM databases WHERE project_id = 'your-workspace-id';
```

### Issue: "Failed to create database"

**Cause:** SQL schema not run or RLS issues

**Fix:**
1. Verify SQL schema was run successfully
2. Check Supabase logs for errors
3. Verify RLS policies are enabled
4. Check user has valid session

### Issue: "Table not found or access denied"

**Cause:** RLS policy blocking access or table doesn't exist

**Fix:**
1. Verify table was created successfully
2. Check database ID is correct
3. Verify user owns the database
4. Check Supabase logs

### Issue: Schema validation errors

**Cause:** Invalid schema structure

**Fix:**
Ensure schema follows this format:
```json
{
  "columns": [
    {
      "name": "column_name",
      "type": "text|number|boolean|timestamp|uuid|json",
      "required": true/false,
      "unique": true/false,
      "default": "value"
    }
  ]
}
```

---

## 📊 Monitoring

### Check Supabase Dashboard

1. **Table Editor** - View data in tables
2. **SQL Editor** - Run queries manually
3. **Logs** - Check for errors
4. **Auth** - Verify users
5. **API** - Check usage stats

### Check Application Logs

```bash
# Watch Next.js logs
pnpm dev

# Look for:
# - "Database created successfully"
# - "Table created successfully"
# - "Record created successfully"
# - Any error messages
```

---

## 🎯 Success Metrics

After setup, you should be able to:

1. ✅ Create a database from workspace UI
2. ✅ See database appear in Supabase
3. ✅ See auto-created users table
4. ✅ Create custom tables via API
5. ✅ Insert records via API
6. ✅ Query records via API
7. ✅ Update records via API
8. ✅ Delete records via API
9. ✅ Multiple users have isolated data
10. ✅ RLS policies prevent cross-user access

---

## 🚀 Next: Build Table Management UI

Once you've verified everything works, we can proceed to Phase 2:
- Visual table creator
- Schema builder UI
- Record management interface
- AI schema generation integration

Let me know if you encounter any issues during setup!
