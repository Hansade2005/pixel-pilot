# 🔗 Foreign Key Enforcement System

Complete implementation of foreign key relationships with CASCADE, RESTRICT, and SET NULL operations for data integrity.

## 📚 Overview

The foreign key enforcement system validates and maintains referential integrity between tables. It ensures that:
- Referenced records exist before creating/updating relationships
- Deletions handle dependent records according to configured rules
- Invalid references are rejected with clear error messages

## 🏗️ Architecture

### Column Schema Extension
```typescript
interface Column {
  name: string;
  type: string;
  references?: {
    table: string;          // Referenced table name
    column: string;         // Referenced column name
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';  // Delete behavior
    onUpdate?: 'CASCADE';   // Update behavior (future)
  };
}
```

### Example Schema:
```json
{
  "columns": [
    {
      "name": "user_id",
      "type": "uuid",
      "required": true,
      "references": {
        "table": "users",
        "column": "id",
        "onDelete": "CASCADE"
      }
    },
    {
      "name": "category_id",
      "type": "number",
      "references": {
        "table": "categories",
        "column": "id",
        "onDelete": "SET NULL"
      }
    }
  ]
}
```

## 🎯 Enforcement Points

### 1. **CREATE (POST)** - Reference Validation
When creating a record with foreign key references:

**Checks:**
- Referenced table exists
- Referenced record exists with matching value
- Rejects creation if reference is invalid

**Example:**
```typescript
// Creating a post with user_id reference
POST /api/database/1/tables/2/records
{
  "data_json": {
    "title": "My Post",
    "user_id": "123e4567-e89b-12d3-a456-426614174000"
  }
}

// ✓ Success if user with id exists
// ✗ 400 Error: "Referenced record with id '...' not found in table 'users'"
```

### 2. **UPDATE (PUT)** - Reference Validation
When updating a record's foreign key values:

**Checks:**
- New referenced table exists
- New referenced record exists
- Rejects update if new reference is invalid

**Example:**
```typescript
// Changing user_id reference
PUT /api/database/1/tables/2/records?recordId=abc-123
{
  "data_json": {
    "user_id": "new-user-id"
  }
}

// ✓ Success if new user exists
// ✗ 400 Error: "Referenced record with id 'new-user-id' not found in table 'users'"
```

### 3. **DELETE** - Cascade Operations
When deleting a record that other records reference:

**Behaviors:**

| onDelete | Behavior | Use Case |
|----------|----------|----------|
| `RESTRICT` (default) | Prevent deletion | Protect important data |
| `CASCADE` | Delete dependent records | Clean up related data |
| `SET NULL` | Set foreign key to null | Soft disconnect |

**Examples:**

**RESTRICT (Default):**
```typescript
DELETE /api/database/1/tables/2/records?recordId=user-123

// If posts reference this user:
// ✗ 409 Conflict: "Cannot delete record: 5 record(s) in table 'posts' reference this record"
```

**CASCADE:**
```typescript
// Schema: posts.user_id references users.id with onDelete: CASCADE
DELETE /api/database/1/tables/2/records?recordId=user-123

// ✓ Success
// → Also deletes all posts by this user
// → Log: "Cascaded deletion of 5 records in posts"
```

**SET NULL:**
```typescript
// Schema: posts.category_id references categories.id with onDelete: SET NULL
DELETE /api/database/1/tables/3/records?recordId=category-5

// ✓ Success
// → Sets category_id to null in all posts
// → Log: "Set category_id to NULL in 12 records in posts"
```

## 🔍 Validation Flow

### CREATE/UPDATE Flow:
```
1. Parse foreign key columns from schema
2. For each column with references:
   a. Find referenced table by name
   b. Query referenced table's records
   c. Check if any record has matching value in referenced column
   d. If not found → Return 400 error
3. Proceed with create/update if all references valid
```

### DELETE Flow:
```
1. Fetch record to be deleted
2. Get all tables in database
3. For each table:
   a. Check schema for columns referencing current table
   b. Query for records with matching foreign key values
   c. If references found:
      - RESTRICT: Return 409 error, prevent deletion
      - CASCADE: Delete all referencing records recursively
      - SET NULL: Update foreign key to null
4. Delete the original record
```

## 📊 Error Handling

### Validation Errors (400):
```json
{
  "error": "Referenced table 'users' not found"
}
```
```json
{
  "error": "Referenced record with id '123' not found in table 'users'"
}
```

### Constraint Violations (409):
```json
{
  "error": "Cannot delete record: 5 record(s) in table 'posts' reference this record"
}
```

### Server Errors (500):
```json
{
  "error": "Failed to validate foreign key reference for 'user_id'"
}
```

## 🎨 Usage Examples

### 1. Create Table with Foreign Keys
```typescript
const schema = {
  columns: [
    {
      name: "id",
      type: "uuid",
      primary_key: true,
      defaultValue: "gen_random_uuid()"
    },
    {
      name: "user_id",
      type: "uuid",
      required: true,
      references: {
        table: "users",
        column: "id",
        onDelete: "CASCADE"  // Delete posts when user is deleted
      }
    },
    {
      name: "category_id",
      type: "number",
      references: {
        table: "categories",
        column: "id",
        onDelete: "SET NULL"  // Keep posts when category is deleted
      }
    },
    {
      name: "title",
      type: "text",
      required: true
    }
  ]
};

await fetch('/api/database/1/tables', {
  method: 'POST',
  body: JSON.stringify({ name: 'posts', schema_json: schema })
});
```

### 2. Create Record with Foreign Key
```typescript
const createPost = async () => {
  try {
    const response = await fetch('/api/database/1/tables/2/records', {
      method: 'POST',
      body: JSON.stringify({
        data_json: {
          title: 'My First Post',
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          category_id: 5
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.error.includes('not found in table')) {
        console.error('Invalid reference:', error.error);
        // Show user-friendly message
      }
    }
  } catch (error) {
    console.error('Failed to create post:', error);
  }
};
```

### 3. Delete with Cascade Handling
```typescript
const deleteUser = async (userId: string) => {
  const response = await fetch(
    `/api/database/1/tables/2/records?recordId=${userId}`,
    { method: 'DELETE' }
  );

  const result = await response.json();

  if (response.status === 409) {
    // RESTRICT prevented deletion
    console.warn('Cannot delete:', result.error);
    // Ask user to confirm force deletion
  } else if (response.ok) {
    console.log('User deleted successfully');
    // CASCADE automatically deleted related records
  }
};
```

## 🔒 Data Integrity Guarantees

### ✅ What's Enforced:
1. **Referential Integrity**: Can't create orphaned references
2. **Cascade Deletion**: Automatically clean up dependent data
3. **Null Safety**: SET NULL only for nullable columns
4. **Restrict Protection**: Prevent accidental data loss

### ⚠️ Limitations:
1. **No Circular References**: Avoid table A → B → A references
2. **Performance**: Multiple cascade deletes can be slow
3. **Transactions**: No automatic rollback (consider implementing)

## 🚀 Performance Considerations

### Query Optimization:
- Foreign key validation queries each referenced table
- DELETE with CASCADE queries all tables in database
- Consider indexing referenced columns for better performance

### Best Practices:
1. Create indexes on foreign key columns
2. Use CASCADE sparingly (can delete large amounts of data)
3. Use SET NULL for optional relationships
4. Use RESTRICT for critical data protection

### Example with Indexing:
```typescript
const schema = {
  columns: [
    {
      name: "user_id",
      type: "uuid",
      indexed: true,  // ← Index for better performance
      references: {
        table: "users",
        column: "id",
        onDelete: "CASCADE"
      }
    }
  ]
};
```

## 🐛 Troubleshooting

### Issue: "Referenced table not found"
**Cause:** Table name doesn't match exactly
**Solution:** Ensure table names are case-sensitive and exact

### Issue: "Referenced record not found"
**Cause:** Record with that value doesn't exist
**Solution:** Create referenced record first, then create dependent record

### Issue: "Cannot delete record: X records reference this"
**Cause:** RESTRICT is preventing deletion
**Solution:** 
- Change to CASCADE or SET NULL if appropriate
- Delete dependent records first manually

### Issue: Slow deletion with CASCADE
**Cause:** Many levels of cascading deletes
**Solution:**
- Create indexes on foreign key columns
- Consider batch deletion
- Use soft deletes instead

## ✅ Status: COMPLETE

Foreign key enforcement is fully implemented with:
- ✅ Reference validation on CREATE/UPDATE
- ✅ CASCADE deletion handling
- ✅ RESTRICT deletion protection
- ✅ SET NULL on delete
- ✅ Comprehensive error messages
- ✅ Multi-table relationship support

**Files Modified:**
1. `app/api/database/[id]/tables/[tableId]/records/route.ts` - All CRUD operations
2. `lib/supabase.ts` - Extended Column interface
3. `FOREIGN_KEY_ENFORCEMENT.md` - This documentation
