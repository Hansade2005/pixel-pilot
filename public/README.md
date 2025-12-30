# PiPilot SDK Usage Documentation

This document provides detailed usage snippets and exact response structures for the PiPilot SDK methods suitable for app implementations. Note: Some methods (delete table, query database, API key management) are excluded as they are intended for AI agent MCP server usage only.

## Installation

```bash
npm install pipilot-sdk
```

## Initialization

```javascript
const PiPilot = require('pipilot-sdk');

const pipilot = new PiPilot('your-api-key', 'your-database-id', {
    maxRetries: 3,
    retryDelay: 1000
});
```

## Methods

### 1. fetchTableRecords(tableId)

Fetches all records from a specified table.

**Parameters:**
- `tableId` (string): The ID of the table to fetch records from.

**Usage:**
```javascript
const result = await pipilot.fetchTableRecords('your-table-id');
console.log(result);
```

**Success Response Structure:**
```javascript
{
    records: [
        {
            id: "record-id",
            table_id: "table-id",
            data_json: {
                // Your record data here
                name: "John Doe",
                email: "john@example.com"
            },
            created_at: "2025-12-30T12:00:00.000Z",
            updated_at: "2025-12-30T12:00:00.000Z"
        }
    ],
    pagination: {
        total: 50,
        limit: 100,
        offset: 0,
        has_more: false
    }
}
```

**Failure Response Structure:**
```javascript
{
    error: "Table not found"
}
```

### 2. insertTableRecord(tableId, data)

Inserts a new record into the specified table.

**Parameters:**
- `tableId` (string): The ID of the table to insert into.
- `data` (object): The data to insert.

**Usage:**
```javascript
const result = await pipilot.insertTableRecord('your-table-id', {
    name: 'John Doe',
    email: 'john@example.com'
});
console.log(result);
```

**Success Response Structure:**
```javascript
{
    record: {
        id: "new-record-id",
        table_id: "table-id",
        data_json: {
            name: "John Doe",
            email: "john@example.com"
        },
        created_at: "2025-12-30T12:00:00.000Z",
        updated_at: "2025-12-30T12:00:00.000Z"
    }
}
```

**Failure Response Structure:**
```javascript
{
    error: "Table not found"
}
```

### 3. updateTableRecord(tableId, recordId, data)

Updates an existing record in the specified table.

**Parameters:**
- `tableId` (string): The ID of the table.
- `recordId` (string): The ID of the record to update.
- `data` (object): The updated data.

**Usage:**
```javascript
const result = await pipilot.updateTableRecord('your-table-id', 'record-id', {
    name: 'Jane Doe',
    email: 'jane@example.com'
});
console.log(result);
```

**Success Response Structure:**
```javascript
{
    record: {
        id: "record-id",
        table_id: "table-id",
        data_json: {
            name: "Jane Doe",
            email: "jane@example.com"
        },
        created_at: "2025-12-30T12:00:00.000Z",
        updated_at: "2025-12-30T12:00:00.000Z"
    }
}
```

**Failure Response Structure:**
```javascript
{
    error: "Failed to update record"
}
```

### 4. deleteTableRecord(tableId, recordId)

Deletes a record from the specified table.

**Parameters:**
- `tableId` (string): The ID of the table.
- `recordId` (string): The ID of the record to delete.

**Usage:**
```javascript
const result = await pipilot.deleteTableRecord('your-table-id', 'record-id');
console.log(result);
```

**Success Response Structure:**
```javascript
{
    message: "Record deleted successfully"
}
```

**Failure Response Structure:**
```javascript
{
    error: "Failed to delete record"
}
```

### 5. signup(email, password, fullName)

Signs up a new user.

**Parameters:**
- `email` (string): User's email.
- `password` (string): User's password.
- `fullName` (string): User's full name.

**Usage:**
```javascript
const result = await pipilot.signup('user@example.com', 'password123', 'John Doe');
console.log(result);
```

**Success Response Structure:**
```javascript
{
    message: "User registered successfully",
    user: {
        id: "user-id",
        email: "user@example.com",
        full_name: "John Doe",
        avatar_url: null,
        created_at: "2025-12-30T12:00:00.000Z",
        updated_at: "2025-12-30T12:00:00.000Z"
    },
    tokens: {
        access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        expires_in: 86400,
        token_type: "Bearer"
    }
}
```

**Failure Response Structure:**
```javascript
{
    error: "User with this email already exists"
}
```

### 6. login(email, password)

Logs in an existing user.

**Parameters:**
- `email` (string): User's email.
- `password` (string): User's password.

**Usage:**
```javascript
const result = await pipilot.login('user@example.com', 'password123');
console.log(result);
```

**Success Response Structure:**
```javascript
{
    message: "Login successful",
    user: {
        id: "user-id",
        email: "user@example.com",
        full_name: "John Doe",
        avatar_url: null,
        created_at: "2025-12-30T12:00:00.000Z",
        updated_at: "2025-12-30T12:00:00.000Z",
        last_login: "2025-12-30T12:30:00.000Z"
    },
    tokens: {
        access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        expires_in: 86400,
        token_type: "Bearer"
    }
}
```

**Failure Response Structure:**
```javascript
{
    error: "Invalid email or password"
}
```

### 7. verify(token)

Verifies a user session token.

**Parameters:**
- `token` (string): The token to verify.

**Usage:**
```javascript
const result = await pipilot.verify('your-token');
console.log(result);
```

**Success Response Structure:**
```javascript
{
    valid: true,
    user: {
        id: "user-id",
        email: "user@example.com",
        full_name: "John Doe",
        avatar_url: null,
        created_at: "2025-12-30T12:00:00.000Z",
        updated_at: "2025-12-30T12:00:00.000Z",
        last_login: "2025-12-30T12:30:00.000Z"
    },
    payload: {
        userId: "user-id",
        email: "user@example.com",
        databaseId: "database-id",
        iat: 1735560000,
        exp: 1735646400
    }
}
```

**Failure Response Structure:**
```javascript
{
    error: "Invalid or expired token"
}
```

### 8. refresh(refreshToken)

Refreshes an access token using a refresh token.

**Parameters:**
- `refreshToken` (string): The refresh token.

**Usage:**
```javascript
const result = await pipilot.refresh('your-refresh-token');
console.log(result);
```

**Success Response Structure:**
```javascript
{
    message: "Token refreshed successfully",
    user: {
        id: "user-id",
        email: "user@example.com",
        full_name: "John Doe",
        avatar_url: null,
        created_at: "2025-12-30T12:00:00.000Z",
        updated_at: "2025-12-30T12:00:00.000Z",
        last_login: "2025-12-30T12:30:00.000Z"
    },
    tokens: {
        access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        expires_in: 86400,
        token_type: "Bearer"
    }
}
```

**Failure Response Structure:**
```javascript
{
    error: "Invalid or expired refresh token"
}
```

### 9. uploadFile(file, isPublic, metadata)

Uploads a file to storage.

**Parameters:**
- `file` (File): The file to upload.
- `isPublic` (boolean, default: true): Whether the file is public.
- `metadata` (object, optional): Additional metadata.

**Usage:**
```javascript
const fileInput = document.getElementById('file-input');
const file = fileInput.files[0];
const result = await pipilot.uploadFile(file, true, { description: 'User avatar' });
console.log(result);
```

**Success Response Structure:**
```javascript
{
    id: "file-id",
    url: "https://example.com/file-url",
    name: "filename.jpg",
    size: 12345,
    mime_type: "image/jpeg",
    is_public: true,
    metadata: { description: "User avatar" },
    created_at: "timestamp"
}
```

**Failure:** Throws an error with message.

## Error Handling

All methods may throw errors for network issues, authentication failures, or API errors. Always wrap calls in try-catch blocks.

```javascript
try {
    const result = await pipilot.fetchTableRecords('table-id');
    if (result.success) {
        // Handle success
    } else {
        // Handle API-level failure
    }
} catch (error) {
    // Handle network or other errors
    console.error(error.message);
}
```

## Rate Limiting

The SDK handles rate limiting automatically with retries.