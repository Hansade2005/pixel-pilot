
class PiPilot {
    constructor(apiKey, databaseId, options = {}) {
        this.apiKey = apiKey;
        this.databaseId = databaseId;
        this.apiUrl = 'https://pipilot.dev/api/v1';
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000; // Base delay in ms
        this.rateLimitRemaining = null;
        this.rateLimitReset = null;
    }

    // Documentation content for search functionality
    static API_GUIDE_CONTENT = `# 🚀 PiPilot Database API Integration Guide

## 📖 Overview

This guide demonstrates the **correct way** to interact with the PiPilot Database API based on our working implementation. Following these patterns ensures reliable data fetching, insertion, and response handling.

## 🔑 Authentication & Setup

\`\`\`javascript
// Required constants
const API_KEY = 'your-api-key-here';
const DATABASE_ID = '15'; // Your database ID

// Table IDs (get these from your database)
const TABLE_IDS = {
  products: '170',
  jobs: '171',
  events: '172',
  freelancers: '173',
  users: '46'
};
\`\`\`

## 📋 API Response Structure

All PiPilot API responses follow this exact structure:

\`\`\`javascript
{
  "records": [
    {
      "id": "unique-record-id",
      "table_id": 170,
      "data_json": {
        // Your actual data fields here
        "title": "Product Title",
        "price": 1200,
        "description": "Product description...",
        "images": ["https://..."],
        // ... other fields
      },
      "created_at": "2025-11-20T14:52:26.408842",
      "updated_at": "2025-11-20T14:52:26.408842"
    }
  ],
  "pagination": {
    "total": 6,
    "limit": 100,
    "offset": 0,
    "has_more": false
  }
}
\`\`\`

## ✅ FETCHING RECORDS (GET)

### Basic Fetch
\`\`\`javascript
async function fetchTableRecords(tableId) {
  const response = await fetch(
    \`https://pipilot.dev/api/v1/databases/\${DATABASE_ID}/tables/\${tableId}/records\`,
    {
      method: 'GET',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }

  const result = await response.json();

  // CRITICAL: Extract data from data_json field
  if (result.records && Array.isArray(result.records)) {
    const data = result.records.map(record => ({
      id: record.id,
      table_id: record.table_id,
      ...record.data_json, // Spread the actual data
      created_at: record.created_at,
      updated_at: record.updated_at
    }));

    return {
      success: true,
      data: data,
      rowCount: data.length,
      totalCount: result.pagination?.total || data.length,
      pagination: result.pagination
    };
  }

  return { success: false, data: [], rowCount: 0, totalCount: 0 };
}
\`\`\`

### Usage Examples

\`\`\`javascript
// Fetch all products
const products = await fetchTableRecords(TABLE_IDS.products);
console.log('Products:', products.data);

// Fetch all jobs
const jobs = await fetchTableRecords(TABLE_IDS.jobs);
console.log('Jobs:', jobs.data);

// Fetch all events
const events = await fetchTableRecords(TABLE_IDS.events);
console.log('Events:', events.data);
\`\`\`

## ✅ INSERTING RECORDS (POST)

### Basic Insert
\`\`\`javascript
async function insertTableRecord(tableId, data) {
  const response = await fetch(
    \`https://pipilot.dev/api/v1/databases/\${DATABASE_ID}/tables/\${tableId}/records\`,
    {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: data })
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(\`Insert failed: \${response.status} \${response.statusText} - \${JSON.stringify(errorData)}\`);
  }

  const result = await response.json();

  // CRITICAL: Extract data from data_json field
  if (result.record) {
    const insertedData = {
      id: result.record.id,
      table_id: result.record.table_id,
      ...result.record.data_json, // Spread the actual data
      created_at: result.record.created_at,
      updated_at: result.record.updated_at
    };

    return {
      success: true,
      data: insertedData,
      message: 'Record inserted successfully'
    };
  }

  return { success: false, message: 'Insert failed' };
}
\`\`\`

### Usage Examples

\`\`\`javascript
// Insert a new product
const newProduct = {
  title: 'Gaming Laptop',
  price: 1299.99,
  description: 'High-performance gaming laptop',
  category: 'Electronics',
  vendor_id: '550e8400-e29b-41d4-a716-446655440000',
  images: ['https://api.a0.dev/assets/image?text=Gaming Laptop&aspect=1:1&seed=gaming1']
};

const insertResult = await insertTableRecord(TABLE_IDS.products, newProduct);
console.log('Insert result:', insertResult);

// Insert a new job
const newJob = {
  title: 'Senior React Developer',
  description: 'Looking for experienced React developer',
  salary: 80000,
  location: 'Remote',
  skills: ['React', 'TypeScript', 'Node.js']
};

const jobResult = await insertTableRecord(TABLE_IDS.jobs, newJob);
console.log('Job insert result:', jobResult);
\`\`\`

## ✅ UPDATING RECORDS (PUT/PATCH)

### Basic Update
\`\`\`javascript
async function updateTableRecord(tableId, recordId, data) {
  const response = await fetch(
    \`https://pipilot.dev/api/v1/databases/\${DATABASE_ID}/tables/\${tableId}/records/\${recordId}\`,
    {
      method: 'PUT', // or 'PATCH'
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: data })
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(\`Update failed: \${response.status} \${response.statusText} - \${JSON.stringify(errorData)}\`);
  }

  const result = await response.json();

  // CRITICAL: Extract data from data_json field
  if (result.record) {
    const updatedData = {
      id: result.record.id,
      table_id: result.record.table_id,
      ...result.record.data_json,
      created_at: result.record.created_at,
      updated_at: result.record.updated_at
    };

    return {
      success: true,
      data: updatedData,
      message: 'Record updated successfully'
    };
  }

  return { success: false, message: 'Update failed' };
}
\`\`\`

## ✅ DELETING RECORDS (DELETE)

### Basic Delete
\`\`\`javascript
async function deleteTableRecord(tableId, recordId) {
  const response = await fetch(
    \`https://pipilot.dev/api/v1/databases/\${DATABASE_ID}/tables/\${tableId}/records/\${recordId}\`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(\`Delete failed: \${response.status} \${response.statusText} - \${JSON.stringify(errorData)}\`);
  }

  const result = await response.json();

  return {
    success: true,
    message: 'Record deleted successfully',
    deleted_id: recordId
  };
}
\`\`\`

## 🧪 COMPLETE WORKING EXAMPLE

Here's a complete test script that demonstrates all operations:

\`\`\`javascript
// test-pipilot-api.js - Complete working example
async function testPiPilotAPI() {
  const API_KEY = 'your-api-key-here';
  const DATABASE_ID = '15';
  const TABLE_IDS = {
    products: '170',
    jobs: '171',
    events: '172'
  };

  try {
    console.log('🧪 Testing PiPilot Database API...\\n');

    // 1. FETCH PRODUCTS
    console.log('📦 1. Fetching products...');
    const products = await fetchTableRecords(TABLE_IDS.products);
    console.log(\`✅ Found \${products.data.length} products\`);
    products.data.forEach(p => console.log(\`  - \${p.title}: $\${p.price}\`));

    // 2. FETCH JOBS
    console.log('\\n💼 2. Fetching jobs...');
    const jobs = await fetchTableRecords(TABLE_IDS.jobs);
    console.log(\`✅ Found \${jobs.data.length} jobs\`);
    jobs.data.forEach(j => console.log(\`  - \${j.title}: $\${j.salary}\`));

    // 3. INSERT NEW PRODUCT
    console.log('\\n➕ 3. Inserting new product...');
    const newProduct = {
      title: 'Wireless Earbuds',
      price: 79.99,
      description: 'High-quality wireless earbuds with noise cancellation',
      category: 'Electronics',
      vendor_id: '550e8400-e29b-41d4-a716-446655440000',
      images: ['https://api.a0.dev/assets/image?text=Wireless Earbuds&aspect=1:1&seed=audio1']
    };

    const insertResult = await insertTableRecord(TABLE_IDS.products, newProduct);
    console.log('✅ Product inserted:', insertResult.data.title);

    // 4. VERIFY INSERTION
    console.log('\\n🔍 4. Verifying insertion...');
    const updatedProducts = await fetchTableRecords(TABLE_IDS.products);
    console.log(\`✅ Now have \${updatedProducts.data.length} products (was \${products.data.length})\`);

    // 5. INSERT NEW JOB
    console.log('\\n💼 5. Inserting new job...');
    const newJob = {
      title: 'UI/UX Designer',
      description: 'Creative UI/UX designer needed for mobile app',
      salary: 65000,
      location: 'San Francisco, CA',
      skills: ['Figma', 'Sketch', 'Adobe XD', 'Prototyping']
    };

    const jobResult = await insertTableRecord(TABLE_IDS.jobs, newJob);
    console.log('✅ Job inserted:', jobResult.data.title);

    console.log('\\n🎉 All tests passed! PiPilot API is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Helper functions (same as above)
async function fetchTableRecords(tableId) { /* ... */ }
async function insertTableRecord(tableId, data) { /* ... */ }

// Run the test
testPiPilotAPI();
\`\`\`

## ⚠️ CRITICAL MISTAKES TO AVOID

### ❌ WRONG: Looking for \`result.data\`
\`\`\`javascript
// DON'T DO THIS
const result = await response.json();
const data = result.data; // ❌ This field doesn't exist!
\`\`\`

### ✅ CORRECT: Use \`result.records\`
\`\`\`javascript
// DO THIS INSTEAD
const result = await response.json();
const data = result.records.map(record => ({
  ...record.data_json // ✅ Correct extraction
}));
\`\`\`

### ❌ WRONG: Direct data access
\`\`\`javascript
// DON'T DO THIS
const products = await fetch(url);
const productList = products.data; // ❌ Wrong field
\`\`\`

### ✅ CORRECT: Proper data extraction
\`\`\`javascript
// DO THIS INSTEAD
const result = await fetch(url).then(r => r.json());
const productList = result.records.map(r => ({
  ...r.data_json // ✅ Correct extraction
}));
\`\`\`

## 🔍 DEBUGGING TIPS

### 1. Always check response structure first
\`\`\`javascript
const response = await fetch(url);
const result = await response.json();
console.log('Full response:', JSON.stringify(result, null, 2));
// Check if result.records exists, not result.data
\`\`\`

### 2. Verify data extraction
\`\`\`javascript
if (result.records) {
  console.log('Records found:', result.records.length);
  console.log('First record data_json:', result.records[0].data_json);
}
\`\`\`

### 3. Check for authentication issues
\`\`\`javascript
if (!response.ok) {
  console.log('Status:', response.status);
  console.log('StatusText:', response.statusText);
  const error = await response.json();
  console.log('Error details:', error);
}
\`\`\`

## 📚 COMPLETE API REFERENCE

| Method | Endpoint | Purpose |
|--------|----------|---------|
| \`GET\` | \`/databases/{db}/tables/{table}/records\` | Fetch all records |
| \`POST\` | \`/databases/{db}/tables/{table}/records\` | Create new record |
| \`PUT\` | \`/databases/{db}/tables/{table}/records/{id}\` | Update record |
| \`DELETE\` | \`/databases/{db}/tables/{table}/records/{id}\` | Delete record |

## 🎯 BEST PRACTICES

1. **Always check \`response.ok\`** before processing
2. **Always extract data from \`record.data_json\`**
3. **Handle pagination** for large datasets
4. **Use proper error handling** with try/catch
5. **Validate data types** before insertion
6. **Log responses** during development for debugging
7. **Use consistent table IDs** across your application

## 🚀 PRODUCTION READY

This implementation is production-ready and handles:
- ✅ Authentication
- ✅ Error handling
- ✅ Response parsing
- ✅ Data validation
- ✅ CRUD operations

Follow this guide exactly and you'll have reliable PiPilot database integration! 🎉`;

    static SDK_README_CONTENT = `# PiPilot SDK

A JavaScript/TypeScript SDK for the PiPilot Database and Storage API with full type safety support.

## Installation

To install the PiPilot SDK, run the following command in your terminal:

\`\`\`bash
npm install pipilot-sdk
\`\`\`

## TypeScript Support

The SDK comes with full TypeScript definitions out of the box! 🎉

### ESM Import (Recommended for TypeScript)
\`\`\`typescript
import PiPilot, { TableRecord, QueryOptions, AuthResponse } from 'pipilot-sdk';

// Fully typed initialization
const pipilot = new PiPilot('your-api-key', 'your-database-id', {
  maxRetries: 3,
  retryDelay: 1000
});

// Type-safe operations
const response = await pipilot.fetchTableRecords('your-table-id');
// response.data is properly typed as TableRecord[]
\`\`\`

### Custom Data Types

Define your own interfaces for type safety:

\`\`\`typescript
interface Product {
  name: string;
  price: number;
  description: string;
  category: string;
  in_stock: boolean;
  tags: string[];
}

interface User {
  email: string;
  full_name: string;
  role: 'admin' | 'user' | 'moderator';
  created_at: string;
}

// Use with generic TableRecord type
const products: TableRecord<Product>[] = await pipilot.fetchTableRecords('170');
const users: TableRecord<User>[] = await pipilot.fetchTableRecords('46');
\`\`\`

### Type-Safe Operations

\`\`\`typescript
// Insert with type safety
const newProduct: Product = {
  name: 'Gaming Laptop',
  price: 1299.99,
  description: 'High-performance gaming laptop',
  category: 'electronics',
  in_stock: true,
  tags: ['gaming', 'laptop', 'high-performance']
};

const insertResponse = await pipilot.insertTableRecord('170', newProduct);
// insertResponse.data is TableRecord<Product>

// Update with type safety
const updateResponse = await pipilot.updateTableRecord('170', 'record-id', {
  price: 1399.99,
  in_stock: false
});
// TypeScript ensures only valid Product properties are used
\`\`\`

### Advanced Querying with Types

\`\`\`typescript
import { QueryOptions } from 'pipilot-sdk';

const queryOptions: QueryOptions = {
  select: ['name', 'price', 'category'], // Type-safe field selection
  where: {
    category: 'electronics',
    in_stock: true
  },
  whereConditions: [
    { field: 'price', operator: 'gte', value: 100 },
    { field: 'price', operator: 'lte', value: 2000 }
  ],
  orderBy: {
    field: 'price',
    direction: 'DESC'
  },
  limit: 20,
  offset: 0,
  search: 'gaming'
};

const result = await pipilot.queryTable('170', queryOptions);
// result.data is TableRecord<Product>[]
\`\`\`

### Authentication Types

\`\`\`typescript
import { AuthResponse } from 'pipilot-sdk';

// Signup
const signupResponse: AuthResponse = await pipilot.signup(
  'user@example.com',
  'SecurePass123!',
  'John Doe'
);

// Login
const loginResponse: AuthResponse = await pipilot.login('user@example.com', 'SecurePass123!');

// Token verification
if (loginResponse.success && loginResponse.access_token) {
  const verifyResponse = await pipilot.verify(loginResponse.access_token);
  // verifyResponse.user is fully typed
}
\`\`\`

### File Upload Types

\`\`\`typescript
import { FileUploadResponse } from 'pipilot-sdk';

// Browser environment
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const file = fileInput.files?.[0];

if (file) {
  const uploadResponse: FileUploadResponse = await pipilot.uploadFile(file, true, {
    category: 'product-image',
    alt_text: 'Product showcase image'
  });

  // uploadResponse.url, uploadResponse.size, etc. are all typed
}
\`\`\`

### Rate Limiting Awareness

\`\`\`typescript
import { RateLimitStatus } from 'pipilot-sdk';

// Monitor rate limits
const status: RateLimitStatus = pipilot.getRateLimitStatus();
console.log(\`Remaining requests: \${status.remaining}\`);
console.log(\`Resets at: \${status.resetAt}\`);

// TypeScript knows the exact structure
if (status.remaining && parseInt(status.remaining) < 10) {
  console.warn('Approaching rate limit!');
}
\`\`\`

### Table Management Types

\`\`\`typescript
import { TableInfo, ListTablesOptions, ReadTableOptions } from 'pipilot-sdk';

// List tables with options
const listOptions: ListTablesOptions = {
  includeSchema: true,
  includeRecordCount: true
};

const tablesResponse = await pipilot.listTables(listOptions);
// tablesResponse.tables is TableInfo[]

// Read specific table
const readOptions: ReadTableOptions = {
  includeRecordCount: true
};

const tableResponse = await pipilot.readTable('170', readOptions);
// tableResponse.table is TableInfo
\`\`\`

### Error Handling with Types

\`\`\`typescript
try {
  const response = await pipilot.fetchTableRecords('170');
  if (response.success) {
    // response.data is TableRecord[]
    response.data.forEach(record => {
      console.log(record.id, record.data_json);
    });
  }
} catch (error) {
  // TypeScript knows error is unknown
  if (error instanceof Error) {
    console.error('Operation failed:', error.message);
  }
}
\`\`\`

### CommonJS in TypeScript (Alternative)

\`\`\`typescript
// For projects using CommonJS
const PiPilot = require('pipilot-sdk');

// Type annotations still work
const pipilot: typeof PiPilot = new PiPilot('key', 'db');
\`\`\`

### Type Definitions Reference

All available types are exported from the main module:

\`\`\`typescript
import {
  PiPilot,           // Main class
  PiPilotOptions,    // Constructor options
  RateLimitStatus,   // Rate limit info
  TableRecord,       // Generic table record
  TableInfo,         // Table metadata
  QueryOptions,      // Query configuration
  ListTablesOptions, // List tables options
  ReadTableOptions,  // Read table options
  AuthResponse,      // Authentication response
  FileUploadResponse // File upload response
} from 'pipilot-sdk';
\`\`\`

## Initialization

To use the SDK, you first need to initialize it with your API key and database ID.

\`\`\`javascript
const PiPilot = require('pipilot-sdk');

// Replace with your actual API key and database ID
const apiKey = 'your-api-key-here';
const databaseId = 'your-database-id-here';

// Optional configuration for rate limiting and retries
const options = {
  maxRetries: 3,        // Maximum retry attempts for rate limit errors (default: 3)
  retryDelay: 1000      // Base delay between retries in ms (default: 1000)
};

const pipilot = new PiPilot(apiKey, databaseId, options);
\`\`\`

### Rate Limiting & Error Handling

The SDK automatically handles API rate limits with intelligent retry logic:

- **Default Limits**: 10,000 requests per hour (increased from 1,000)
- **Automatic Retries**: Failed requests due to rate limits are retried with exponential backoff
- **Rate Limit Tracking**: Monitor your usage with \`getRateLimitStatus()\`

\`\`\`javascript
// Check current rate limit status
const status = pipilot.getRateLimitStatus();
console.log(\`Remaining requests: \${status.remaining}\`);
console.log(\`Resets at: \${status.resetAt}\`);
\`\`\`

**Rate Limit Response**: When limits are exceeded, the SDK will automatically retry. If all retries fail, you'll receive an error like:
\`\`\`
Rate limit exceeded after 3 retries. Reset in: 1 hour. Limit: 10000, Usage: 10001
\`\`\`

---

## TypeScript Usage

For TypeScript projects, the SDK provides complete type safety:

### ESM Import (Recommended)
\`\`\`typescript
import PiPilot, { TableRecord, QueryOptions, AuthResponse } from 'pipilot-sdk';

const pipilot = new PiPilot('your-api-key', 'your-database-id');

// Fully typed responses
const response = await pipilot.fetchTableRecords('170');
if (response.success) {
  // response.data is TableRecord[]
  response.data.forEach(record => {
    console.log(record.id, record.created_at); // Type-safe access
  });
}
\`\`\`

### Custom Types
\`\`\`typescript
interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

// Type-safe operations
const products = await pipilot.fetchTableRecords('170');
const typedProducts: Product[] = products.data as Product[];
\`\`\`

### Advanced Querying with Types
\`\`\`typescript
const queryOptions: QueryOptions = {
  select: ['name', 'price'],
  where: { in_stock: true },
  orderBy: { field: 'price', direction: 'DESC' },
  limit: 10
};

const result = await pipilot.queryTable('170', queryOptions);
// result.data is TableRecord[] with proper typing
\`\`\`

### Authentication Types
\`\`\`typescript
const authResponse: AuthResponse = await pipilot.login('user@example.com', 'password');
// authResponse.access_token, authResponse.user, etc. are all typed
\`\`\`

---

## Database API

The Database API allows you to perform CRUD (Create, Read, Update, Delete) operations on your tables.

### \`fetchTableRecords(tableId)\`

Fetches all records from a specified table.

- **\`tableId\`** (string): The ID of the table to fetch records from.

**Returns:** An object containing the fetched data, row count, total count, and pagination information.

**Example:**
\`\`\`javascript
async function getProducts() {
  try {
    const { success, data, rowCount } = await pipilot.fetchTableRecords('170'); // Assuming '170' is the products table ID
    if (success) {
      console.log(\`Successfully fetched \${rowCount} products:\`, data);
    }
  } catch (error) {
    console.error('Error fetching products:', error.message);
  }
}
\`\`\`

### \`insertTableRecord(tableId, data)\`

Inserts a new record into a specified table.

- **\`tableId\`** (string): The ID of the table.
- **\`data\`** (object): The data to be inserted.

**Returns:** An object containing the inserted data and a success message.

**Example:**
\`\`\`javascript
async function addProduct() {
  const newProduct = {
    title: 'Gaming Laptop',
    price: 1299.99,
    description: 'High-performance gaming laptop',
  };

  try {
    const { success, data } = await pipilot.insertTableRecord('170', newProduct);
    if (success) {
      console.log('Product added successfully:', data);
    }
  } catch (error) {
    console.error('Error adding product:', error.message);
  }
}
\`\`\`

### \`updateTableRecord(tableId, recordId, data)\`

Updates an existing record in a specified table.

- **\`tableId\`** (string): The ID of the table.
- **\`recordId\`** (string): The ID of the record to update.
- **\`data\`** (object): The new data.

**Returns:** An object containing the updated data and a success message.

**Example:**
\`\`\`javascript
async function updateProductPrice(recordId) {
  try {
    const { success, data } = await pipilot.updateTableRecord('170', recordId, { price: 1399.99 });
    if (success) {
      console.log('Product price updated:', data);
    }
  } catch (error) {
    console.error('Error updating product:', error.message);
  }
}
\`\`\`

### \`deleteTableRecord(tableId, recordId)\`

Deletes a record from a specified table.

- **\`tableId\`** (string): The ID of the table.
- **\`recordId\`** (string): The ID of the record to delete.

**Returns:** An object with a success message and the ID of the deleted record.

**Example:**
\`\`\`javascript
async function removeProduct(recordId) {
  try {
    const { success, deleted_id } = await pipilot.deleteTableRecord('170', recordId);
    if (success) {
      console.log(\`Product with ID \${deleted_id} has been removed.\`);
    }
  } catch (error)
}
\`\`\`
---

## Table Management API

The Table Management API allows you to create, list, read, delete, and query database tables programmatically.

### \`listTables(options)\`

Lists all tables in the database with optional schema and record count information.

- **\`options\`** (object, optional): Configuration options
  - **\`includeSchema\`** (boolean, default: true): Include detailed schema information
  - **\`includeRecordCount\`** (boolean, default: true): Include record count for each table

**Returns:** An object containing the list of tables and total count.

**Example:**
\`\`\`javascript
async function getAllTables() {
  try {
    const { success, tables, total } = await pipilot.listTables({
      includeSchema: true,
      includeRecordCount: true
    });
    if (success) {
      console.log(\`Found \${total} tables:\`);
      tables.forEach(table => {
        console.log(\`- \${table.name} (\${table.record_count} records)\`);
      });
    }
  } catch (error) {
    console.error('Error listing tables:', error.message);
  }
}
\`\`\`

### \`createTable(name, schema)\`

Creates a new table in the database.

- **\`name\`** (string): The name of the table to create
- **\`schema\`** (object): The table schema definition
  - **\`columns\`** (array): Array of column definitions
  - **\`indexes\`** (array, optional): Array of index definitions
  - **\`constraints\`** (array, optional): Array of constraint definitions

**Returns:** An object containing the created table information.

**Example:**
\`\`\`javascript
async function createProductsTable() {
  const schema = {
    columns: [
      {
        name: "title",
        type: "text",
        required: true,
        description: "Product title"
      },
      {
        name: "price",
        type: "number",
        required: true,
        defaultValue: 0
      },
      {
        name: "category",
        type: "text",
        required: false
      }
    ]
  };

  try {
    const { success, table } = await pipilot.createTable('products', schema);
    if (success) {
      console.log('Table created:', table.name);
    }
  } catch (error) {
    console.error('Error creating table:', error.message);
  }
}
\`\`\`

### \`readTable(tableId, options)\`

Gets detailed information about a specific table.

- **\`tableId\`** (string): The ID of the table to read
- **\`options\`** (object, optional): Configuration options
  - **\`includeRecordCount\`** (boolean, default: true): Include total record count

**Returns:** An object containing detailed table information.

**Example:**
\`\`\`javascript
async function getTableInfo(tableId) {
  try {
    const { success, table } = await pipilot.readTable(tableId);
    if (success) {
      console.log(\`Table: \${table.name}\`);
      console.log(\`Columns: \${table.schema.column_count}\`);
      console.log(\`Records: \${table.record_count}\`);
    }
  } catch (error) {
    console.error('Error reading table:', error.message);
  }
}
\`\`\`

### \`deleteTable(tableId)\`

Deletes a table and all its records from the database.

- **\`tableId\`** (string): The ID of the table to delete

**Returns:** An object containing deletion confirmation and record count.

**Example:**
\`\`\`javascript
async function removeTable(tableId) {
  try {
    const { success, table_name, deleted_records } = await pipilot.deleteTable(tableId);
    if (success) {
      console.log(\`Table "\${table_name}" deleted with \${deleted_records} records\`);
    }
  } catch (error) {
    console.error('Error deleting table:', error.message);
  }
}
\`\`\`

### \`queryTable(tableId, options)\`

Performs advanced querying on a table with filtering, sorting, and pagination.

- **\`tableId\`** (string): The ID of the table to query
- **\`options\`** (object, optional): Query options
  - **\`select\`** (array): Columns to select (default: all)
  - **\`where\`** (object): Single WHERE condition
  - **\`whereConditions\`** (array): Multiple WHERE conditions
  - **\`orderBy\`** (object): Sort options with field and direction
  - **\`limit\`** (number, default: 100): Maximum records to return
  - **\`offset\`** (number, default: 0): Records to skip
  - **\`search\`** (string): Full-text search term
  - **\`includeCount\`** (boolean, default: true): Include total count

**Returns:** An object containing query results and pagination info.

**Example:**
\`\`\`javascript
async function queryProducts() {
  try {
    // Simple query with filtering
    const { success, data, total } = await pipilot.queryTable('170', {
      where: {
        field: 'price',
        operator: '>',
        value: 100
      },
      orderBy: {
        field: 'price',
        direction: 'DESC'
      },
      limit: 10
    });

    if (success) {
      console.log(\`Found \${total} products:\`);
      data.forEach(product => {
        console.log(\`- \${product.title}: $\${product.price}\`);
      });
    }
  } catch (error) {
    console.error('Error querying table:', error.message);
  }
}

// Advanced query with multiple conditions
async function advancedQuery() {
  const result = await pipilot.queryTable('170', {
    select: ['title', 'price', 'category'],
    whereConditions: [
      {
        field: 'price',
        operator: '>=',
        value: 50
      },
      {
        field: 'category',
        operator: '=',
        value: 'Electronics',
        logic: 'AND'
      }
    ],
    orderBy: { field: 'price', direction: 'ASC' },
    limit: 20,
    search: 'laptop' // Full-text search
  });
}
\`\`\`

---

## Error Handling

All SDK methods include comprehensive error handling:

### Automatic Rate Limit Handling
- **429 Errors**: Automatically retried with exponential backoff
- **Retry Logic**: Configurable retry attempts (default: 3)
- **Rate Tracking**: Monitor usage with \`getRateLimitStatus()\`

### Error Response Format
\`\`\`javascript
try {
  const result = await pipilot.fetchTableRecords('170');
  // Handle success
} catch (error) {
  console.error('Operation failed:', error.message);
  // Error messages include detailed information about:
  // - HTTP status codes
  // - Rate limit details (when applicable)
  // - API error messages
}
\`\`\`

### Common Error Types
- **Rate Limit Exceeded**: \`Rate limit exceeded after X retries. Reset in: Y. Limit: Z, Usage: W\`
- **Authentication Failed**: \`HTTP error! status: 401\`
- **Not Found**: \`HTTP error! status: 404\`
- **Validation Error**: \`HTTP error! status: 400 - {"error": "Invalid data format"}\`

---

## Authentication API
The Authentication API provides methods for user signup, login, and token management.

### \`signup(email, password, fullName)\`
Creates a new user account.
- **\`email\`** (string): The user\'s email address.
- **\`password\`** (string): The user\'s password.
- **\`fullName\`** (string): The user\'s full name.
**Returns:** An object containing the new user\'s data.
**Example:**
\`\`\`javascript
async function registerUser() {
  try {
    const newUser = await pipilot.signup('test@example.com', 'a-strong-password', 'Test User');
    console.log('User registered successfully:', newUser);
  } catch (error) {
    console.error('Signup failed:', error.message);
  }
}
\`\`\`
### \`login(email, password)\`
Logs in a user and returns access and refresh tokens.
- **\`email\`** (string): The user\'s email address.
- **\`password\`** (string): The user\'s password.
**Returns:** An object containing \`access_token\` and \`refresh_token\`.
**Example:**
\`\`\`javascript
async function loginUser() {
  try {
    const { tokens } = await pipilot.login('test@example.com', 'a-strong-password');
    console.log('Login successful! Access Token:', tokens.access_token);
    // Store tokens securely
  } catch (error) {
    console.error('Login failed:', error.message);
  }
}
\`\`\`
### \`verify(token)\`
Verifies the validity of an access token.
- **\`token\`** (string): The access token to verify.
**Returns:** An object confirming the token\'s validity.
**Example:**
\`\`\`javascript
async function verifyToken(accessToken) {
  try {
    const verificationResult = await pipilot.verify(accessToken);
    console.log('Token is valid:', verificationResult);
  } catch (error) {
    console.error('Token verification failed:', error.message);
  }
}
\`\`\`
### \`refresh(refreshToken)\`
Refreshes an expired access token using a refresh token.
- **\`refreshToken\`** (string): The refresh token.
**Returns:** A new set of access and refresh tokens.
**Example:**
\`\`\`javascript
async function refreshToken(refreshToken) {
  try {
    const { tokens } = await pipilot.refresh(refreshToken);
    console.log('Tokens refreshed! New Access Token:', tokens.access_token);
    // Store new tokens securely
  } catch (error) {
    console.error('Token refresh failed:', error.message);
  }
}
\`\`\`
---
## Storage API
The Storage API allows you to upload files to your PiPilot storage bucket.
### \`uploadFile(file, isPublic, metadata)\`
Uploads a file.
- **\`file\`** (File): The file object to upload (e.g., from an HTML file input).
- **\`isPublic\`** (boolean, optional): Whether the file should be publicly accessible. Defaults to \`true\`.
- **\`metadata\`** (object, optional): Custom metadata to attach to the file.
**Returns:** An object containing the uploaded file\'s details, including its public URL.
**Example:**
\`\`\`javascript
// Assuming 'fileInput' is an HTML <input type="file"> element
const fileInput = document.getElementById('fileInput');
const file = fileInput.files[0];

async function uploadProfilePicture(file) {
  if (!file) {
    console.log('No file selected.');
    return;
  }

  try {
    const uploadedFile = await pipilot.uploadFile(file, true, { uploaded_from: 'web-app' });
    console.log('File uploaded successfully:', uploadedFile);
    // The public URL is available at uploadedFile.url
  } catch (error) {
    console.error('File upload failed:', error.message);
  }
}
\`\`\`
---
## Complete Working Example
Here is a complete example that demonstrates fetching records and adding a new one.
\`\`\`javascript
const PiPilot = require('pipilot-sdk');

async function runExample() {
  const pipilot = new PiPilot('your-api-key-here', 'your-database-id-here');
  const productsTableId = '170'; // Replace with your actual products table ID

  console.log('--- 1. Fetching all products ---');
  try {
    const { data: products } = await pipilot.fetchTableRecords(productsTableId);
    console.log(\`Found \${products.length} products.\`);
    products.forEach(p => console.log(\`- \${p.title}: $\${p.price}\`));
  } catch (error) {
    console.error('Failed to fetch products:', error.message);
  }

  console.log('\\n--- 2. Adding a new product ---');
  const newProduct = {
    title: 'Wireless Mouse',
    price: 49.99,
    description: 'An ergonomic wireless mouse.',
  };

  try {
    const { data: addedProduct } = await pipilot.insertTableRecord(productsTableId, newProduct);
    console.log('Successfully added new product:', addedProduct.title);
  } catch (error) {
    console.error('Failed to add product:', error.message);
  }

  console.log('\\n--- 3. Fetching products again ---');
  try {
    const { data: updatedProducts } = await pipilot.fetchTableRecords(productsTableId);
    console.log(\`Now we have \${updatedProducts.length} products.\`);
  } catch (error) {
    console.error('Failed to fetch updated products:', error.message);
  }
}

runExample();
\`\`\`
## More Information
For more detailed information about the API, please refer to the following documents:
- [PIPILOT_DATABASE_API_GUIDE.md](./PIPILOT_DATABASE_API_GUIDE.md)
- [STORAGE_SYSTEM_IMPLEMENTATION.md](./STORAGE_SYSTEM_IMPLEMENTATION.md)`;

    // Rate limiting and retry logic
    async _makeRequest(url, options, retryCount = 0) {
        const response = await fetch(url, options);

        // Update rate limit tracking from headers
        this.rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        this.rateLimitReset = response.headers.get('X-RateLimit-Reset');

        if (response.status === 429) {
            // Rate limit exceeded
            const errorData = await response.json().catch(() => ({}));
            const resetIn = errorData.reset_in || 'unknown time';

            if (retryCount < this.maxRetries) {
                // Calculate delay with exponential backoff
                const delay = this.retryDelay * Math.pow(2, retryCount);
                console.warn(`Rate limit exceeded. Retrying in ${delay}ms. Reset in: ${resetIn}`);

                await new Promise(resolve => setTimeout(resolve, delay));
                return this._makeRequest(url, options, retryCount + 1);
            } else {
                throw new Error(`Rate limit exceeded after ${this.maxRetries} retries. Reset in: ${resetIn}. Limit: ${errorData.limit}, Usage: ${errorData.usage}`);
            }
        }

        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = `Request failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`;
            } catch (e) {
                // If we can't parse error JSON, use the basic message
            }
            throw new Error(errorMessage);
        }

        return response;
    }

    // Get current rate limit status
    getRateLimitStatus() {
        return {
            remaining: this.rateLimitRemaining,
            resetAt: this.rateLimitReset
        };
    }

    async fetchTableRecords(tableId) {
        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables/${tableId}/records`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = await response.json();

        if (result.records && Array.isArray(result.records)) {
            const data = result.records.map(record => ({
                id: record.id,
                table_id: record.table_id,
                ...record.data_json,
                created_at: record.created_at,
                updated_at: record.updated_at
            }));

            return {
                success: true,
                data: data,
                rowCount: data.length,
                totalCount: result.pagination?.total || data.length,
                pagination: result.pagination
            };
        }

        return {
            success: false,
            data: [],
            rowCount: 0,
            totalCount: 0
        };
    }

    async insertTableRecord(tableId, data) {
        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables/${tableId}/records`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: data
                })
            }
        );

        const result = await response.json();

        if (result.record) {
            const insertedData = {
                id: result.record.id,
                table_id: result.record.table_id,
                ...result.record.data_json,
                created_at: result.record.created_at,
                updated_at: result.record.updated_at
            };

            return {
                success: true,
                data: insertedData,
                message: 'Record inserted successfully'
            };
        }

        return {
            success: false,
            message: 'Insert failed'
        };
    }

    async updateTableRecord(tableId, recordId, data) {
        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables/${tableId}/records/${recordId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: data
                })
            }
        );

        const result = await response.json();

        if (result.record) {
            const updatedData = {
                id: result.record.id,
                table_id: result.record.table_id,
                ...result.record.data_json,
                created_at: result.record.created_at,
                updated_at: result.record.updated_at
            };

            return {
                success: true,
                data: updatedData,
                message: 'Record updated successfully'
            };
        }

        return {
            success: false,
            message: 'Update failed'
        };
    }

    async deleteTableRecord(tableId, recordId) {
        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables/${tableId}/records/${recordId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = await response.json();

        return {
            success: true,
            message: 'Record deleted successfully',
            deleted_id: recordId
        };
    }

    // Table Management Methods
    async listTables(options = {}) {
        const { includeSchema = true, includeRecordCount = true } = options;
        const params = new URLSearchParams({
            includeSchema: includeSchema.toString(),
            includeRecordCount: includeRecordCount.toString()
        });

        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = await response.json();

        if (result.success && result.tables) {
            return {
                success: true,
                tables: result.tables,
                total: result.total || result.tables.length,
                message: `Found ${result.tables.length} table(s)`
            };
        }

        return {
            success: false,
            tables: [],
            total: 0,
            message: 'No tables found'
        };
    }

    async createTable(name, schema) {
        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    schema: schema
                })
            }
        );

        const result = await response.json();

        if (result.success && result.table) {
            return {
                success: true,
                table: result.table,
                message: `Table "${name}" created successfully`
            };
        }

        return {
            success: false,
            message: 'Table creation failed'
        };
    }

    async readTable(tableId, options = {}) {
        const { includeRecordCount = true } = options;
        const params = new URLSearchParams({
            includeRecordCount: includeRecordCount.toString()
        });

        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables/${tableId}?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = await response.json();

        if (result.success && result.table) {
            return {
                success: true,
                table: result.table,
                message: `Table "${result.table.name}" read successfully`
            };
        }

        return {
            success: false,
            message: 'Table not found'
        };
    }

    async deleteTable(tableId) {
        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables/${tableId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = await response.json();

        if (result.success) {
            return {
                success: true,
                table_name: result.table_name,
                deleted_records: result.deleted_records,
                message: `Table "${result.table_name}" deleted successfully with ${result.deleted_records} record(s)`
            };
        }

        return {
            success: false,
            message: 'Table deletion failed'
        };
    }

    async queryTable(tableId, options = {}) {
        const {
            select,
            where,
            whereConditions,
            orderBy,
            limit = 100,
            offset = 0,
            search,
            includeCount = true
        } = options;

        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString(),
            includeCount: includeCount.toString()
        });

        if (select && select.length > 0 && !select.includes('*')) {
            params.append('select', select.join(','));
        }

        if (where) {
            params.append('conditions', JSON.stringify([where]));
        }

        if (whereConditions && whereConditions.length > 0) {
            params.append('conditions', JSON.stringify(whereConditions));
        }

        if (orderBy) {
            params.append('orderBy', orderBy.field);
            params.append('orderDirection', orderBy.direction || 'ASC');
        }

        if (search) {
            params.append('search', search);
        }

        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables/${tableId}/query?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = await response.json();

        if (result.success) {
            return {
                success: true,
                data: result.data || [],
                total: result.total || 0,
                rowCount: result.data?.length || 0,
                pagination: {
                    limit: limit,
                    offset: offset,
                    has_more: result.has_more || false
                },
                message: `Query executed successfully, returned ${result.data?.length || 0} record(s)`
            };
        }

        return {
            success: false,
            data: [],
            total: 0,
            rowCount: 0,
            message: 'Query failed'
        };
    }

    // API Key Management Methods
    async createApiKey(name) {
        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/api-keys`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            }
        );

        const result = await response.json();

        if (result.api_key) {
            return {
                success: true,
                apiKey: result.api_key,
                message: result.message || `API key "${name}" created successfully`
            };
        }

        return {
            success: false,
            message: result.error || 'API key creation failed'
        };
    }

    async listApiKeys() {
        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/api-keys`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = await response.json();

        if (result.api_keys && Array.isArray(result.api_keys)) {
            return {
                success: true,
                apiKeys: result.api_keys,
                total: result.api_keys.length,
                message: `Retrieved ${result.api_keys.length} API keys`
            };
        }

        return {
            success: false,
            apiKeys: [],
            total: 0,
            message: result.error || 'Failed to retrieve API keys'
        };
    }

    async deleteApiKey(keyId) {
        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/api-keys/${keyId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = await response.json();

        if (result.message && result.message.includes('revoked successfully')) {
            return {
                success: true,
                message: result.message
            };
        }

        return {
            success: false,
            message: result.error || 'API key deletion failed'
        };
    }

    async signup(email, password, fullName) {
        const response = await this._makeRequest(`${this.apiUrl}/databases/${this.databaseId}/auth/signup`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password,
                full_name: fullName
            })
        });

        return await response.json();
    }

    async login(email, password) {
        const response = await this._makeRequest(`${this.apiUrl}/databases/${this.databaseId}/auth/login`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        return await response.json();
    }

    async verify(token) {
        const response = await this._makeRequest(`${this.apiUrl}/databases/${this.databaseId}/auth/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token
            })
        });

        return await response.json();
    }

    async refresh(refreshToken) {
        const response = await this._makeRequest(`${this.apiUrl}/databases/${this.databaseId}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refresh_token: refreshToken
            })
        });

        return await response.json();
    }

    async uploadFile(file, isPublic = true, metadata = {}) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_public', isPublic.toString());
        formData.append('metadata', JSON.stringify(metadata));

        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/storage/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: formData,
            }
        );

        const data = await response.json();

        if (data.success) {
            return data.file;
        } else {
            throw new Error(data.error);
        }
    }

    // Search documentation method
    searchDocs(query, options = {}) {
        const {
            type = 'all',
            mode = 'basic', // 'basic' or 'advanced'
            limit = 10,
            offset = 0,
            includeFullContent = false,
            caseSensitive = false,
            exactMatch = false,
            sortBy = 'relevance' // 'relevance', 'title', 'source'
        } = options;

        let results = [];
        const lowerQuery = caseSensitive ? query : query.toLowerCase();

        // Search API guide
        if (type === 'all' || type === 'api') {
            const apiMatches = this._advancedSearch(PiPilot.API_GUIDE_CONTENT, lowerQuery, 'API Guide', mode, exactMatch, caseSensitive);
            results.push(...apiMatches);
        }

        // Search SDK readme
        if (type === 'all' || type === 'sdk') {
            const sdkMatches = this._advancedSearch(PiPilot.SDK_README_CONTENT, lowerQuery, 'SDK Documentation', mode, exactMatch, caseSensitive);
            results.push(...sdkMatches);
        }

        // Sort results
        results = this._sortResults(results, sortBy, lowerQuery);

        // Apply pagination
        const totalResults = results.length;
        const paginatedResults = results.slice(offset, offset + limit);
        const hasMore = offset + limit < totalResults;

        // Structure results
        const structuredResults = paginatedResults.map(result => ({
            id: this._generateResultId(result),
            source: result.source,
            title: result.title.trim(),
            content: includeFullContent ? result.fullContent : result.content,
            relevanceScore: result.relevanceScore || 0,
            matchCount: result.matchCount || 0,
            sectionPath: result.sectionPath || [],
            metadata: {
                query: query,
                mode: mode,
                type: type,
                searchTimestamp: new Date().toISOString(),
                contentLength: result.fullContent.length,
                previewLength: result.content.length
            }
        }));

        return {
            success: true,
            query: query,
            options: {
                type,
                mode,
                limit,
                offset,
                includeFullContent,
                caseSensitive,
                exactMatch,
                sortBy
            },
            results: structuredResults,
            pagination: {
                total: totalResults,
                limit: limit,
                offset: offset,
                hasMore: hasMore,
                currentPage: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(totalResults / limit)
            },
            statistics: {
                totalMatches: totalResults,
                resultsReturned: structuredResults.length,
                searchTime: Date.now(), // Could be enhanced with actual timing
                sourcesSearched: type === 'all' ? 2 : 1
            },
            message: `Found ${totalResults} documentation sections matching "${query}" (${structuredResults.length} returned)`
        };
    }

    // Advanced search implementation
    _advancedSearch(content, query, source, mode, exactMatch, caseSensitive) {
        const results = [];
        const sections = content.split(/^#+\s/m); // Split by headers

        sections.forEach((section, index) => {
            if (!section.trim()) return;

            let matches = [];
            let relevanceScore = 0;
            let matchCount = 0;

            if (mode === 'advanced') {
                // Advanced search with scoring
                const searchTerms = query.split(/\s+/).filter(term => term.length > 0);
                const sectionText = caseSensitive ? section : section.toLowerCase();

                searchTerms.forEach(term => {
                    const termMatches = exactMatch
                        ? (sectionText.split(term).length - 1)
                        : this._fuzzyMatchCount(sectionText, term);

                    if (termMatches > 0) {
                        matchCount += termMatches;
                        relevanceScore += termMatches * (exactMatch ? 2 : 1);
                        matches.push(term);
                    }
                });

                // Boost score for title matches
                const titleLine = section.split('\n')[0] || '';
                const titleText = caseSensitive ? titleLine : titleLine.toLowerCase();
                if (titleText.includes(query)) {
                    relevanceScore += 10;
                }

                // Boost score for code examples
                if (section.includes('```')) {
                    relevanceScore += 2;
                }

            } else {
                // Basic search
                const sectionText = caseSensitive ? section : section.toLowerCase();
                const queryText = exactMatch ? query : query;

                if (exactMatch) {
                    matchCount = (sectionText.split(queryText).length - 1);
                } else {
                    matchCount = this._fuzzyMatchCount(sectionText, queryText);
                }

                if (matchCount > 0) {
                    relevanceScore = matchCount;
                    matches = [query];
                }
            }

            if (matchCount > 0) {
                // Extract section title
                const lines = section.trim().split('\n');
                const title = lines[0] || 'Untitled Section';

                // Get a comprehensive preview of the content with context
                const preview = this._generateRichPreview(section, query, caseSensitive);

                // Build section path for breadcrumbs
                const sectionPath = this._buildSectionPath(content, index);

                // Extract additional metadata
                const metadata = this._extractSectionMetadata(section);

                results.push({
                    source: source,
                    title: title,
                    content: preview.content,
                    fullContent: section.trim(),
                    relevanceScore: relevanceScore,
                    matchCount: matchCount,
                    matches: matches,
                    sectionPath: sectionPath,
                    metadata: {
                        ...metadata,
                        contentLength: section.length,
                        previewLength: preview.content.length,
                        hasCodeExamples: section.includes('```'),
                        hasTables: section.includes('|'),
                        hasLinks: section.includes('http') || section.includes('['),
                        sectionIndex: index,
                        wordCount: section.split(/\s+/).length
                    }
                });
            }
        });

        return results;
    }

    // Fuzzy matching for basic search
    _fuzzyMatchCount(text, query) {
        const words = text.split(/\s+/);
        let count = 0;

        words.forEach(word => {
            if (word.includes(query)) {
                count++;
            }
        });

        return count;
    }

    // Sort results based on criteria
    _sortResults(results, sortBy, query) {
        return results.sort((a, b) => {
            switch (sortBy) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'source':
                    return a.source.localeCompare(b.source);
                case 'relevance':
                default:
                    return b.relevanceScore - a.relevanceScore;
            }
        });
    }

    // Generate unique result ID
    _generateResultId(result) {
        const hash = this._simpleHash(result.source + result.title + result.content);
        return `doc_${hash}`;
    }

    // Simple hash function
    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    // Build section path for breadcrumbs
    _buildSectionPath(content, sectionIndex) {
        const sections = content.split(/^#+\s/m);
        const path = [];

        // Look backwards to find parent sections
        for (let i = sectionIndex - 1; i >= 0; i--) {
            const section = sections[i];
            if (section.trim()) {
                const lines = section.trim().split('\n');
                const title = lines[0] || '';
                const level = (title.match(/^#+/) || [''])[0].length;

                if (level > 0) {
                    path.unshift(title.replace(/^#+\s/, '').trim());
                    if (level === 1) break; // Stop at top level
                }
            }
        }

        return path;
    }

    // Generate rich preview with context around matches
    _generateRichPreview(section, query, caseSensitive) {
        const maxLength = 4000; // Much longer preview
        const contextLines = 3; // Lines of context around matches

        // Find all matches with their positions
        const searchTerms = query.split(/\s+/).filter(term => term.length > 0);
        const sectionText = caseSensitive ? section : section.toLowerCase();
        const matches = [];

        searchTerms.forEach(term => {
            const termLower = caseSensitive ? term : term.toLowerCase();
            let index = sectionText.indexOf(termLower);
            while (index !== -1) {
                matches.push({
                    term: term,
                    start: index,
                    end: index + term.length
                });
                index = sectionText.indexOf(termLower, index + 1);
            }
        });

        if (matches.length === 0) {
            // No matches found, return first part of section
            return {
                content: section.substring(0, maxLength) + (section.length > maxLength ? '\n\n[... content truncated ...]' : ''),
                matchCount: 0,
                contextSnippets: []
            };
        }

        // Sort matches by position
        matches.sort((a, b) => a.start - b.start);

        // Merge overlapping matches
        const mergedMatches = [];
        let current = matches[0];
        for (let i = 1; i < matches.length; i++) {
            if (matches[i].start <= current.end + 10) { // Close matches
                current.end = Math.max(current.end, matches[i].end);
                current.term += ' ' + matches[i].term;
            } else {
                mergedMatches.push(current);
                current = matches[i];
            }
        }
        mergedMatches.push(current);

        // Generate context snippets around matches
        const contextSnippets = [];
        const lines = section.split('\n');

        mergedMatches.forEach(match => {
            // Find line containing the match
            let matchLineIndex = 0;
            let charCount = 0;
            for (let i = 0; i < lines.length; i++) {
                charCount += lines[i].length + 1; // +1 for newline
                if (charCount > match.start) {
                    matchLineIndex = i;
                    break;
                }
            }

            // Get context lines around the match
            const startLine = Math.max(0, matchLineIndex - contextLines);
            const endLine = Math.min(lines.length - 1, matchLineIndex + contextLines);
            const contextLinesText = lines.slice(startLine, endLine + 1).join('\n');

            contextSnippets.push({
                snippet: contextLinesText,
                lineNumber: matchLineIndex + 1,
                matchTerm: match.term
            });
        });

        // Generate comprehensive preview
        let preview = '';

        // Add section introduction (first 200 chars)
        const intro = section.substring(0, 200);
        if (intro.trim()) {
            preview += intro + '\n\n';
        }

        // Add context snippets
        if (contextSnippets.length > 0) {
            preview += '📍 Key Matches:\n';
            contextSnippets.slice(0, 3).forEach((snippet, index) => {
                preview += `\n${index + 1}. Around line ${snippet.lineNumber}:\n${snippet.snippet}\n`;
            });
            preview += '\n';
        }

        // Add more content if space allows
        const remainingSpace = maxLength - preview.length;
        if (remainingSpace > 200) {
            const additionalContent = section.substring(200, 200 + remainingSpace - 100);
            if (additionalContent.trim()) {
                preview += additionalContent + '\n\n[... content continues ...]';
            }
        }

        // Ensure we don't exceed max length
        if (preview.length > maxLength) {
            preview = preview.substring(0, maxLength - 50) + '\n\n[... content truncated ...]';
        }

        return {
            content: preview,
            matchCount: mergedMatches.length,
            contextSnippets: contextSnippets
        };
    }

    // Extract metadata from section content
    _extractSectionMetadata(section) {
        const lines = section.split('\n');
        const metadata = {
            hasCodeBlocks: false,
            hasTables: false,
            hasLinks: false,
            hasImages: false,
            hasLists: false,
            codeLanguages: [],
            headingLevel: 1,
            subsections: []
        };

        // Check for code blocks
        const codeBlockMatches = section.match(/```(\w+)?/g);
        if (codeBlockMatches) {
            metadata.hasCodeBlocks = true;
            metadata.codeLanguages = codeBlockMatches
                .map(match => match.replace('```', ''))
                .filter(lang => lang.length > 0);
        }

        // Check for tables
        if (section.includes('|') && section.includes('---')) {
            metadata.hasTables = true;
        }

        // Check for links
        if (section.includes('http') || section.includes('[') && section.includes('](')) {
            metadata.hasLinks = true;
        }

        // Check for images
        if (section.includes('![') && section.includes('](')) {
            metadata.hasImages = true;
        }

        // Check for lists
        if (section.includes('- ') || section.includes('* ') || section.match(/^\d+\./m)) {
            metadata.hasLists = true;
        }

        // Determine heading level
        const firstLine = lines[0] || '';
        const headingMatch = firstLine.match(/^(#+)/);
        if (headingMatch) {
            metadata.headingLevel = headingMatch[1].length;
        }

        // Find subsections
        const subsections = [];
        lines.forEach((line, index) => {
            const subHeadingMatch = line.match(/^(#{2,6})\s+(.+)/);
            if (subHeadingMatch) {
                subsections.push({
                    level: subHeadingMatch[1].length,
                    title: subHeadingMatch[2].trim(),
                    lineNumber: index + 1
                });
            }
        });
        metadata.subsections = subsections;

        return metadata;
    }

    // Get full documentation
    getFullDocs(type = 'all') {
        const docs = {};

        if (type === 'all' || type === 'api') {
            docs.api = PiPilot.API_GUIDE_CONTENT;
        }

        if (type === 'all' || type === 'sdk') {
            docs.sdk = PiPilot.SDK_README_CONTENT;
        }

        return {
            success: true,
            type: type,
            docs: docs,
            message: `Retrieved full ${type} documentation`
        };
    }
}

module.exports = PiPilot;
