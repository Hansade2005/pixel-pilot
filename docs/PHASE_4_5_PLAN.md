# 🤖 Phase 4 & 5: AI-Powered Database Features

## 🎯 Overview

**Phase 4**: AI Schema Generation with Codestral  
**Phase 5**: SQL Panel with AI Assistance

These phases add powerful AI capabilities to your database management system, transforming it into an intelligent development platform.

---

## 📋 Phase 4: AI Schema Generation

### 🎨 Features Delivered

#### 1. Natural Language Schema Generation
- **Input**: Plain English description (e.g., "Create a blog with posts, authors, and comments")
- **AI Model**: Codestral (specialized for code/schema generation)
- **Output**: Validated table schema with columns, types, constraints, defaults

#### 2. Schema Refinement UI
- Visual editor for AI-generated schemas
- Add/remove/edit columns
- Modify types, constraints, defaults
- Regenerate with refined prompt
- One-click table creation

#### 3. Sample Data Generation
- AI-powered realistic sample data
- Schema-aware data types
- Batch generation (1-100 records)
- Smart defaults for each column type

#### 4. Quick-Start Templates
- Pre-written schema examples
- Common use cases (blog, e-commerce, CRM, task management)
- One-click population of AI prompt

---

## 📋 Phase 5: SQL Panel with AI Assistance

### 🎨 Features Delivered

#### 1. Advanced SQL Editor
- Monaco Editor with SQL syntax highlighting
- Line numbers and code folding
- Autocomplete for table/column names
- Keyboard shortcuts (Ctrl+Enter to execute)
- Multi-query support

#### 2. Natural Language to SQL
- **Input**: Plain English query (e.g., "Show all products under $100")
- **AI Model**: Codestral with schema context
- **Output**: Valid SQL with explanation
- Safety checks (prevent dangerous operations)

#### 3. Query Execution & Results
- Execute SQL directly in browser
- Beautiful results grid (TanStack Table)
- Export results (CSV, JSON)
- Execution metadata (time, rows affected)
- Error handling with line numbers

#### 4. Query History
- Auto-save all executed queries
- Recent queries list (last 50)
- Search and filter
- Click to load into editor
- Execution time tracking

#### 5. Saved Queries
- Name and save favorite queries
- Description and tags
- Quick access panel
- Favorites section

#### 6. AI Query Optimization
- Analyze query performance
- Suggest indexes
- Rewrite queries for efficiency
- Performance tips

#### 7. AI Error Assistant
- Plain English error explanations
- Suggested fixes
- Inline error highlighting
- Auto-fix option

---

## 🏗️ Technical Architecture

### AI Model Selection

**Why Codestral?**
- Specialized for code and schema generation
- Superior understanding of database structures
- Fast inference via OpenAI-compatible endpoint
- Available in your ai-providers.ts configuration

```typescript
// Already configured in ai-providers.ts
const codestral = createOpenAICompatible({
  name: 'codestral',
  baseURL: 'https://codestral.mistral.ai/v1',
  apiKey: process.env.CODESTRAL_API_KEY || 'DXfXAjwNIZcAv1ESKtoDwWZZF98lJxho',
});
```

### API Endpoints

#### Phase 4 Endpoints

```typescript
// 1. AI Schema Generation
POST /api/database/[id]/ai-schema
Request: { description: string, refinementPrompt?: string }
Response: { schema: Column[], explanation: string }

// 2. Sample Data Generation
POST /api/database/[id]/tables/[tableId]/generate-data
Request: { count: number }
Response: { records: Record[], generated: number }
```

#### Phase 5 Endpoints

```typescript
// 1. SQL Execution
POST /api/database/[id]/sql/execute
Request: { query: string }
Response: { rows: any[], rowCount: number, executionTime: number }

// 2. Natural Language to SQL
POST /api/database/[id]/sql/generate
Request: { description: string, databaseSchema: Schema }
Response: { sql: string, explanation: string }

// 3. Query History
GET/POST/DELETE /api/database/[id]/sql/history
CRUD operations for query history

// 4. Query Optimization
POST /api/database/[id]/sql/analyze
Request: { query: string }
Response: { suggestions: Suggestion[], indexes: string[] }

// 5. Error Explanation
POST /api/database/[id]/sql/explain-error
Request: { error: string, query: string }
Response: { explanation: string, suggestedFix: string }
```

---

## 🎨 UI Components

### Phase 4 Components

```
components/database/
├── ai-schema-generator.tsx      (500 lines)
│   ├── Natural language textarea
│   ├── Loading state with AI animation
│   ├── Schema preview cards
│   └── Refinement controls
│
├── schema-refinement-dialog.tsx (350 lines)
│   ├── Column editor grid
│   ├── Type selector dropdowns
│   ├── Constraint toggles
│   └── Regenerate button
│
├── ai-schema-templates.tsx      (200 lines)
│   ├── Template cards (blog, e-commerce, CRM, etc.)
│   ├── Quick-start buttons
│   └── Description previews
│
└── sample-data-generator.tsx    (250 lines)
    ├── Batch size input
    ├── Progress bar
    ├── Generated data preview
    └── Insert confirmation
```

### Phase 5 Components

```
components/database/sql/
├── sql-editor.tsx               (600 lines)
│   ├── Monaco Editor wrapper
│   ├── Syntax highlighting
│   ├── Autocomplete
│   └── Execute button
│
├── sql-results-view.tsx         (400 lines)
│   ├── Results DataGrid
│   ├── Execution metadata
│   ├── Export buttons
│   └── Error display
│
├── ai-query-assistant.tsx       (450 lines)
│   ├── Natural language input
│   ├── Generate SQL button
│   ├── Query preview
│   └── Explanation text
│
├── query-history-panel.tsx      (350 lines)
│   ├── Recent queries list
│   ├── Search/filter
│   ├── Click to load
│   └── Delete option
│
├── save-query-dialog.tsx        (200 lines)
│   ├── Name input
│   ├── Description textarea
│   ├── Tags selector
│   └── Favorite toggle
│
└── query-optimizer.tsx          (300 lines)
    ├── Optimization suggestions
    ├── Index recommendations
    ├── Performance metrics
    └── Apply fixes button
```

---

## 📁 File Structure

```
app/
├── workspace/[id]/database/
│   ├── page.tsx                 (existing - add AI generate button)
│   └── sql/
│       └── page.tsx             (NEW - SQL panel page)
│
└── api/database/[id]/
    ├── ai-schema/
    │   └── route.ts             (NEW - AI schema generation)
    ├── tables/[tableId]/
    │   └── generate-data/
    │       └── route.ts         (NEW - sample data generation)
    └── sql/
        ├── execute/
        │   └── route.ts         (NEW - SQL execution)
        ├── generate/
        │   └── route.ts         (NEW - NL to SQL)
        ├── analyze/
        │   └── route.ts         (NEW - query optimization)
        ├── explain-error/
        │   └── route.ts         (NEW - error explanation)
        └── history/
            └── route.ts         (NEW - query history CRUD)

components/database/
├── ai-schema-generator.tsx      (NEW)
├── schema-refinement-dialog.tsx (NEW)
├── ai-schema-templates.tsx      (NEW)
├── sample-data-generator.tsx    (NEW)
└── sql/
    ├── sql-editor.tsx           (NEW)
    ├── sql-results-view.tsx     (NEW)
    ├── ai-query-assistant.tsx   (NEW)
    ├── query-history-panel.tsx  (NEW)
    ├── save-query-dialog.tsx    (NEW)
    └── query-optimizer.tsx      (NEW)
```

---

## 🔒 Security Considerations

### SQL Injection Prevention
```typescript
// Use parameterized queries only
const { data, error } = await supabase.rpc('execute_safe_sql', {
  query: sanitizedQuery,
  params: queryParams
});
```

### Query Validation
```typescript
// Block dangerous operations without WHERE clause
const dangerousPatterns = [
  /DELETE\s+FROM\s+\w+\s*(?!WHERE)/i,
  /UPDATE\s+\w+\s+SET\s+.*?(?!WHERE)/i,
  /DROP\s+(TABLE|DATABASE)/i,
  /TRUNCATE\s+TABLE/i
];

function validateQuery(query: string) {
  for (const pattern of dangerousPatterns) {
    if (pattern.test(query)) {
      throw new Error('Dangerous query detected. Add WHERE clause or confirm intent.');
    }
  }
}
```

### RLS Verification
```typescript
// All SQL operations must verify workspace ownership
const { data: database } = await supabase
  .from('databases')
  .select('*')
  .eq('id', databaseId)
  .eq('workspace_id', workspaceId)
  .single();

if (!database) {
  return new Response('Unauthorized', { status: 403 });
}
```

---

## 🚀 Performance Optimization

### Query Caching
```typescript
// Cache AI-generated schemas for 5 minutes
const cacheKey = `schema:${databaseId}:${hash(description)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Generate and cache
const schema = await generateSchema(description);
await redis.setex(cacheKey, 300, JSON.stringify(schema));
```

### Batch Operations
```typescript
// Insert sample data in batches of 100
async function generateSampleData(count: number) {
  const batchSize = 100;
  const batches = Math.ceil(count / batchSize);
  
  for (let i = 0; i < batches; i++) {
    const records = await generateBatch(batchSize);
    await supabase.from(tableName).insert(records);
  }
}
```

### Streaming Large Results
```typescript
// Stream query results for large datasets
async function* streamQueryResults(query: string) {
  const cursor = await supabase.rpc('execute_cursor', { query });
  
  while (true) {
    const { data, done } = await cursor.fetch(1000);
    if (done) break;
    yield data;
  }
}
```

---

## 📊 AI Prompts

### Schema Generation Prompt
```typescript
const schemaPrompt = `You are a database schema expert. Generate a complete table schema based on this description:

Description: "${userDescription}"

Current database context:
- Existing tables: ${existingTables.join(', ')}
- Database type: PostgreSQL (Supabase)

Generate a JSON schema with this structure:
{
  "tableName": "descriptive_name",
  "columns": [
    {
      "name": "column_name",
      "type": "text|number|boolean|date|datetime|timestamp|uuid|json|email|url",
      "required": true|false,
      "defaultValue": "value or null",
      "unique": true|false,
      "references": { "table": "other_table", "column": "id" } // if foreign key
    }
  ],
  "indexes": ["column_name"],
  "explanation": "Brief explanation of the schema design"
}

Rules:
1. Always include an 'id' column as UUID primary key
2. Always include 'created_at' and 'updated_at' timestamps
3. Use snake_case for all names
4. Choose appropriate types for each field
5. Add foreign keys for relationships
6. Suggest useful indexes
7. Keep it simple and practical`;
```

### Natural Language to SQL Prompt
```typescript
const nlToSqlPrompt = `You are a SQL expert. Convert this natural language query to SQL:

Query: "${userQuery}"

Database schema:
${JSON.stringify(databaseSchema, null, 2)}

Rules:
1. Use standard PostgreSQL syntax
2. Always use table aliases for clarity
3. Include appropriate WHERE clauses
4. Use JOINs for related tables
5. Add LIMIT for safety (default 100)
6. Return only the SQL query, no explanation in the query itself

Also provide:
1. The SQL query
2. A brief explanation of what it does
3. Any assumptions made`;
```

### Query Optimization Prompt
```typescript
const optimizationPrompt = `You are a SQL performance expert. Analyze this query and provide optimization suggestions:

Query:
\`\`\`sql
${query}
\`\`\`

Database schema:
${JSON.stringify(databaseSchema, null, 2)}

Provide:
1. Performance analysis
2. Suggested indexes (with CREATE INDEX statements)
3. Query rewrite suggestions
4. Explanation of improvements
5. Expected performance gain`;
```

---

## 🎯 Success Criteria

### Phase 4
- ✅ AI generates valid schemas from natural language (95%+ accuracy)
- ✅ Schema refinement works for all column types
- ✅ Sample data generation creates realistic records
- ✅ Templates cover common use cases (10+ examples)
- ✅ Integration seamless with existing table creation flow

### Phase 5
- ✅ SQL editor has syntax highlighting and autocomplete
- ✅ Query execution handles all PostgreSQL syntax
- ✅ Natural language to SQL works for common queries (90%+ accuracy)
- ✅ Query history saves automatically
- ✅ Optimization suggestions are practical and correct
- ✅ Error explanations are clear and helpful
- ✅ Results display handles large datasets (10,000+ rows)

---

## 📦 Dependencies

### New Dependencies Required

```json
{
  "dependencies": {
    "@monaco-editor/react": "^4.6.0",  // SQL editor
    "sql-formatter": "^15.3.0",         // SQL formatting
    "zod": "^3.22.4"                    // Schema validation (already installed)
  }
}
```

---

## 🧪 Testing Scenarios

### Phase 4 Testing

#### Scenario 1: Blog Schema Generation
**Input**: "Create a blog with posts, authors, and comments. Posts should have title, content, publish date. Authors have name and email. Comments belong to posts and authors."

**Expected Output**:
```json
{
  "tables": [
    {
      "name": "authors",
      "columns": [
        { "name": "id", "type": "uuid", "required": true },
        { "name": "name", "type": "text", "required": true },
        { "name": "email", "type": "email", "required": true, "unique": true },
        { "name": "created_at", "type": "timestamp", "required": true }
      ]
    },
    {
      "name": "posts",
      "columns": [
        { "name": "id", "type": "uuid", "required": true },
        { "name": "title", "type": "text", "required": true },
        { "name": "content", "type": "text", "required": true },
        { "name": "author_id", "type": "uuid", "required": true, "references": { "table": "authors", "column": "id" } },
        { "name": "published_at", "type": "timestamp" },
        { "name": "created_at", "type": "timestamp", "required": true }
      ]
    },
    {
      "name": "comments",
      "columns": [
        { "name": "id", "type": "uuid", "required": true },
        { "name": "post_id", "type": "uuid", "required": true, "references": { "table": "posts", "column": "id" } },
        { "name": "author_id", "type": "uuid", "required": true, "references": { "table": "authors", "column": "id" } },
        { "name": "content", "type": "text", "required": true },
        { "name": "created_at", "type": "timestamp", "required": true }
      ]
    }
  ]
}
```

#### Scenario 2: E-commerce Schema
**Input**: "E-commerce store with products, categories, orders, and customers"

**Expected**: Products table with price, inventory, categories with relationships, orders with line items, customers with addresses

#### Scenario 3: Sample Data Generation
- Generate 50 realistic product records
- Verify column types match (numbers are numeric, dates are valid, emails are formatted)
- Check for unique constraint violations
- Validate foreign key relationships

### Phase 5 Testing

#### Scenario 1: Natural Language Queries
**Input**: "Show all products under $100 ordered by price"
**Expected SQL**: 
```sql
SELECT * FROM products WHERE price < 100 ORDER BY price ASC LIMIT 100;
```

**Input**: "Count orders by customer in the last month"
**Expected SQL**:
```sql
SELECT customer_id, COUNT(*) as order_count 
FROM orders 
WHERE created_at >= NOW() - INTERVAL '1 month'
GROUP BY customer_id
ORDER BY order_count DESC;
```

#### Scenario 2: Query Execution
- Execute SELECT queries and verify results display
- Execute INSERT and verify record creation
- Execute UPDATE with WHERE clause
- Test error handling for invalid syntax
- Test large result sets (1000+ rows) with pagination

#### Scenario 3: Query Optimization
**Input Query**:
```sql
SELECT * FROM orders o, customers c WHERE o.customer_id = c.id AND o.total > 1000;
```

**Expected Suggestions**:
- Rewrite with explicit JOIN
- Add index on `orders.customer_id`
- Add index on `orders.total`
- Use SELECT specific columns instead of *

#### Scenario 4: Error Explanation
**Input Error**: `ERROR: column "pric" does not exist`
**Expected Explanation**: "You tried to access a column named 'pric', but it doesn't exist in the table. Did you mean 'price'? Check your spelling and the table schema."

---

## 📈 Progress Tracking

```
Phase 4: AI Schema Generation       ░░░░░░░░░░░░░░░░░░░░   0%
  - AI Schema API                   ░░░░░░░░░░░░░░░░░░░░   0%
  - Schema Generator UI             ░░░░░░░░░░░░░░░░░░░░   0%
  - Refinement Dialog               ░░░░░░░░░░░░░░░░░░░░   0%
  - Sample Data Generation          ░░░░░░░░░░░░░░░░░░░░   0%
  - Templates & Integration         ░░░░░░░░░░░░░░░░░░░░   0%

Phase 5: SQL Panel                  ░░░░░░░░░░░░░░░░░░░░   0%
  - SQL Editor                      ░░░░░░░░░░░░░░░░░░░░   0%
  - Query Execution                 ░░░░░░░░░░░░░░░░░░░░   0%
  - Natural Language to SQL         ░░░░░░░░░░░░░░░░░░░░   0%
  - Query History                   ░░░░░░░░░░░░░░░░░░░░   0%
  - AI Optimization                 ░░░░░░░░░░░░░░░░░░░░   0%
  - Error Assistant                 ░░░░░░░░░░░░░░░░░░░░   0%

Overall: 0% Complete
```

---

## 🎨 UI/UX Mockups

### AI Schema Generator Flow
```
┌─────────────────────────────────────────────┐
│ 🤖 Generate Table with AI                   │
├─────────────────────────────────────────────┤
│                                             │
│ Describe your table in plain English:      │
│ ┌─────────────────────────────────────────┐│
│ │ Create a blog with posts and authors... ││
│ │                                         ││
│ │                                         ││
│ └─────────────────────────────────────────┘│
│                                             │
│ 📋 Templates:                               │
│ [Blog] [E-commerce] [CRM] [Tasks] [More]   │
│                                             │
│ [Cancel]              [✨ Generate Schema]  │
└─────────────────────────────────────────────┘

         ↓ (After generation)

┌─────────────────────────────────────────────┐
│ ✅ Schema Generated                          │
├─────────────────────────────────────────────┤
│ Table: posts                                │
│                                             │
│ Columns:                                    │
│ ┌─────────────────────────────────────────┐│
│ │ ✓ id (UUID) - Primary Key               ││
│ │ ✓ title (Text) - Required               ││
│ │ ✓ content (Text) - Required             ││
│ │ ✓ author_id (UUID) - FK → authors.id    ││
│ │   published_at (DateTime)               ││
│ │ ✓ created_at (Timestamp)                ││
│ └─────────────────────────────────────────┘│
│                                             │
│ 💡 AI Explanation:                          │
│ "This schema creates a posts table..."     │
│                                             │
│ [🔄 Regenerate] [✏️ Refine] [✅ Create]   │
└─────────────────────────────────────────────┘
```

### SQL Panel Layout
```
┌────────────────────────────────────────────────────────────────┐
│ Database: My App DB          [Tables] [SQL Panel] [Settings]   │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌───────────────────────────────┐ ┌──────────────────────────┐│
│ │ 🤖 AI Query Assistant          │ │ 📜 Query History        ││
│ ├───────────────────────────────┤ ├──────────────────────────┤│
│ │ Describe your query:          │ │ ⭐ Saved (3)            ││
│ │ ┌──────────────────────────┐  │ │ - Monthly report        ││
│ │ │ Show products under $100 │  │ │ - User analytics        ││
│ │ └──────────────────────────┘  │ │ - Top customers         ││
│ │ [Generate SQL ✨]             │ │                         ││
│ └───────────────────────────────┘ │ 🕒 Recent (10)          ││
│                                    │ - SELECT * FROM...       ││
│ ┌──────────────────────────────────┤ - INSERT INTO...        ││
│ │ 📝 SQL Editor                    │ - UPDATE users...        ││
│ ├──────────────────────────────────┤ └──────────────────────┘│
│ │ 1  SELECT * FROM products        │                         │
│ │ 2  WHERE price < 100             │                         │
│ │ 3  ORDER BY price ASC;           │                         │
│ │ 4                                │                         │
│ │                                  │                         │
│ └──────────────────────────────────┘                         │
│ [Execute (Ctrl+Enter)] [Format] [Save] [Clear]               │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 📊 Results (47 rows, 23ms)                               │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Name         | Price  | Category    | In Stock          │ │
│ │ MacBook Pro  | $99.99 | Electronics | ✓                 │ │
│ │ Keyboard     | $49.99 | Accessories | ✓                 │ │
│ │ Mouse        | $29.99 | Accessories | ✗                 │ │
│ │ ...                                                      │ │
│ └──────────────────────────────────────────────────────────┘ │
│ [Export CSV] [Export JSON] [Copy Results]                    │
└────────────────────────────────────────────────────────────────┘
```

---

## 💡 Future Enhancements (Phase 6+)

1. **Schema Versioning**
   - Track schema changes over time
   - Migration generation
   - Rollback support

2. **Visual Query Builder**
   - Drag-and-drop query construction
   - No SQL knowledge required
   - Visual JOIN builder

3. **Real-time Collaboration**
   - Multiple users editing queries simultaneously
   - Live cursor positions
   - Chat for collaboration

4. **Data Visualization**
   - Charts from query results
   - Dashboard builder
   - Export visualizations

5. **AI Data Analysis**
   - Natural language data insights
   - Trend detection
   - Anomaly detection

6. **Query Performance Monitoring**
   - Execution time tracking
   - Slow query alerts
   - Performance dashboard

---

## 🚀 Getting Started

### Prerequisites
1. Phase 3 complete ✅
2. Codestral API key configured ✅
3. Monaco Editor installed (will be added)

### Estimated Timeline
- **Phase 4**: 8-10 hours (5 components, 2 API endpoints)
- **Phase 5**: 12-15 hours (6 components, 5 API endpoints)
- **Testing**: 3-4 hours
- **Documentation**: 1-2 hours

**Total**: ~25-30 hours of development

### Next Steps
1. Install dependencies (`@monaco-editor/react`, `sql-formatter`)
2. Start with Phase 4: AI Schema Generation API
3. Build AI Schema Generator component
4. Test schema generation with examples
5. Move to Phase 5: SQL Editor and execution
6. Implement AI query assistant
7. Add query history and optimization
8. Comprehensive testing

---

**Built by**: Optima AI Agent  
**Status**: 📋 **PLANNED - Ready to implement**  
**Phases**: 4 & 5 combined for efficiency  
**AI Model**: Codestral (code-specialized)  
**Expected Lines**: ~4,000+ lines of new code  

---

### 🎊 Let's build the most intelligent database management system! 🚀✨
