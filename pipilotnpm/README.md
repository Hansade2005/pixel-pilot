# PiPilot JS SDK

A Javascript SDK for the PiPilot Database and Storage API.

## Installation

To install the PiPilot JS SDK, run the following command in your terminal:

```bash
npm install pipilot-sdk
```

## Initialization

To use the SDK, you first need to initialize it with your API key and database ID.

```javascript
const PiPilot = require('pipilot-sdk');

// Replace with your actual API key and database ID
const apiKey = 'your-api-key-here';
const databaseId = 'your-database-id-here';

const pipilot = new PiPilot(apiKey, databaseId);
```

---

## Database API

The Database API allows you to perform CRUD (Create, Read, Update, Delete) operations on your tables.

### `fetchTableRecords(tableId)`

Fetches all records from a specified table.

- **`tableId`** (string): The ID of the table to fetch records from.

**Returns:** An object containing the fetched data, row count, total count, and pagination information.

**Example:**
```javascript
async function getProducts() {
  try {
    const { success, data, rowCount } = await pipilot.fetchTableRecords('170'); // Assuming '170' is the products table ID
    if (success) {
      console.log(`Successfully fetched ${rowCount} products:`, data);
    }
  } catch (error) {
    console.error('Error fetching products:', error.message);
  }
}
```

### `insertTableRecord(tableId, data)`

Inserts a new record into a specified table.

- **`tableId`** (string): The ID of the table.
- **`data`** (object): The data to be inserted.

**Returns:** An object containing the inserted data and a success message.

**Example:**
```javascript
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
```

### `updateTableRecord(tableId, recordId, data)`

Updates an existing record in a specified table.

- **`tableId`** (string): The ID of the table.
- **`recordId`** (string): The ID of the record to update.
- **`data`** (object): The new data.

**Returns:** An object containing the updated data and a success message.

**Example:**
```javascript
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
```

### `deleteTableRecord(tableId, recordId)`

Deletes a record from a specified table.

- **`tableId`** (string): The ID of the table.
- **`recordId`** (string): The ID of the record to delete.

**Returns:** An object with a success message and the ID of the deleted record.

**Example:**
```javascript
async function removeProduct(recordId) {
  try {
    const { success, deleted_id } = await pipilot.deleteTableRecord('170', recordId);
    if (success) {
      console.log(`Product with ID ${deleted_id} has been removed.`);
    }
  } catch (error)
}
```
---

## Table Management API

The Table Management API allows you to create, list, read, delete, and query database tables programmatically.

### `listTables(options)`

Lists all tables in the database with optional schema and record count information.

- **`options`** (object, optional): Configuration options
  - **`includeSchema`** (boolean, default: true): Include detailed schema information
  - **`includeRecordCount`** (boolean, default: true): Include record count for each table

**Returns:** An object containing the list of tables and total count.

**Example:**
```javascript
async function getAllTables() {
  try {
    const { success, tables, total } = await pipilot.listTables({
      includeSchema: true,
      includeRecordCount: true
    });
    if (success) {
      console.log(`Found ${total} tables:`);
      tables.forEach(table => {
        console.log(`- ${table.name} (${table.record_count} records)`);
      });
    }
  } catch (error) {
    console.error('Error listing tables:', error.message);
  }
}
```

### `createTable(name, schema)`

Creates a new table in the database.

- **`name`** (string): The name of the table to create
- **`schema`** (object): The table schema definition
  - **`columns`** (array): Array of column definitions
  - **`indexes`** (array, optional): Array of index definitions
  - **`constraints`** (array, optional): Array of constraint definitions

**Returns:** An object containing the created table information.

**Example:**
```javascript
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
```

### `readTable(tableId, options)`

Gets detailed information about a specific table.

- **`tableId`** (string): The ID of the table to read
- **`options`** (object, optional): Configuration options
  - **`includeRecordCount`** (boolean, default: true): Include total record count

**Returns:** An object containing detailed table information.

**Example:**
```javascript
async function getTableInfo(tableId) {
  try {
    const { success, table } = await pipilot.readTable(tableId);
    if (success) {
      console.log(`Table: ${table.name}`);
      console.log(`Columns: ${table.schema.column_count}`);
      console.log(`Records: ${table.record_count}`);
    }
  } catch (error) {
    console.error('Error reading table:', error.message);
  }
}
```

### `deleteTable(tableId)`

Deletes a table and all its records from the database.

- **`tableId`** (string): The ID of the table to delete

**Returns:** An object containing deletion confirmation and record count.

**Example:**
```javascript
async function removeTable(tableId) {
  try {
    const { success, table_name, deleted_records } = await pipilot.deleteTable(tableId);
    if (success) {
      console.log(`Table "${table_name}" deleted with ${deleted_records} records`);
    }
  } catch (error) {
    console.error('Error deleting table:', error.message);
  }
}
```

### `queryTable(tableId, options)`

Performs advanced querying on a table with filtering, sorting, and pagination.

- **`tableId`** (string): The ID of the table to query
- **`options`** (object, optional): Query options
  - **`select`** (array): Columns to select (default: all)
  - **`where`** (object): Single WHERE condition
  - **`whereConditions`** (array): Multiple WHERE conditions
  - **`orderBy`** (object): Sort options with field and direction
  - **`limit`** (number, default: 100): Maximum records to return
  - **`offset`** (number, default: 0): Records to skip
  - **`search`** (string): Full-text search term
  - **`includeCount`** (boolean, default: true): Include total count

**Returns:** An object containing query results and pagination info.

**Example:**
```javascript
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
      console.log(`Found ${total} products:`);
      data.forEach(product => {
        console.log(`- ${product.title}: $${product.price}`);
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
```

---
## Authentication API
The Authentication API provides methods for user signup, login, and token management.

### `signup(email, password, fullName)`
Creates a new user account.
- **`email`** (string): The user\'s email address.
- **`password`** (string): The user\'s password.
- **`fullName`** (string): The user\'s full name.
**Returns:** An object containing the new user\'s data.
**Example:**
```javascript
async function registerUser() {
  try {
    const newUser = await pipilot.signup('test@example.com', 'a-strong-password', 'Test User');
    console.log('User registered successfully:', newUser);
  } catch (error) {
    console.error('Signup failed:', error.message);
  }
}
```
### `login(email, password)`
Logs in a user and returns access and refresh tokens.
- **`email`** (string): The user\'s email address.
- **`password`** (string): The user\'s password.
**Returns:** An object containing `access_token` and `refresh_token`.
**Example:**
```javascript
async function loginUser() {
  try {
    const { tokens } = await pipilot.login('test@example.com', 'a-strong-password');
    console.log('Login successful! Access Token:', tokens.access_token);
    // Store tokens securely
  } catch (error) {
    console.error('Login failed:', error.message);
  }
}
```
### `verify(token)`
Verifies the validity of an access token.
- **`token`** (string): The access token to verify.
**Returns:** An object confirming the token\'s validity.
**Example:**
```javascript
async function verifyToken(accessToken) {
  try {
    const verificationResult = await pipilot.verify(accessToken);
    console.log('Token is valid:', verificationResult);
  } catch (error) {
    console.error('Token verification failed:', error.message);
  }
}
```
### `refresh(refreshToken)`
Refreshes an expired access token using a refresh token.
- **`refreshToken`** (string): The refresh token.
**Returns:** A new set of access and refresh tokens.
**Example:**
```javascript
async function refreshToken(refreshToken) {
  try {
    const { tokens } = await pipilot.refresh(refreshToken);
    console.log('Tokens refreshed! New Access Token:', tokens.access_token);
    // Store new tokens securely
  } catch (error) {
    console.error('Token refresh failed:', error.message);
  }
}
```
---
## Storage API
The Storage API allows you to upload files to your PiPilot storage bucket.
### `uploadFile(file, isPublic, metadata)`
Uploads a file.
- **`file`** (File): The file object to upload (e.g., from an HTML file input).
- **`isPublic`** (boolean, optional): Whether the file should be publicly accessible. Defaults to `true`.
- **`metadata`** (object, optional): Custom metadata to attach to the file.
**Returns:** An object containing the uploaded file\'s details, including its public URL.
**Example:**
```javascript
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
```
---
## Complete Working Example
Here is a complete example that demonstrates fetching records and adding a new one.
```javascript
const PiPilot = require('pipilot-sdk');

async function runExample() {
  const pipilot = new PiPilot('your-api-key-here', 'your-database-id-here');
  const productsTableId = '170'; // Replace with your actual products table ID

  console.log('--- 1. Fetching all products ---');
  try {
    const { data: products } = await pipilot.fetchTableRecords(productsTableId);
    console.log(`Found ${products.length} products.`);
    products.forEach(p => console.log(`- ${p.title}: $${p.price}`));
  } catch (error) {
    console.error('Failed to fetch products:', error.message);
  }

  console.log('\n--- 2. Adding a new product ---');
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

  console.log('\n--- 3. Fetching products again ---');
  try {
    const { data: updatedProducts } = await pipilot.fetchTableRecords(productsTableId);
    console.log(`Now we have ${updatedProducts.length} products.`);
  } catch (error) {
    console.error('Failed to fetch updated products:', error.message);
  }
}

runExample();
```
## More Information
For more detailed information about the API, please refer to the following documents:
- [PIPILOT_DATABASE_API_GUIDE.md](./PIPILOT_DATABASE_API_GUIDE.md)
- [STORAGE_SYSTEM_IMPLEMENTATION.md](./STORAGE_SYSTEM_IMPLEMENTATION.md)