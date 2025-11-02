# Built-in Database System - Comprehensive Planning Document

## 🎯 Vision Overview

Build a **Lovable Cloud-inspired** database system where users can:
- Create a database for each project with one click
- Manage tables, records, and perform admin operations visually
- Use AI to generate database schemas from natural language
- Get automatic authentication (user table included by default)
- Build fullstack apps without touching backend code or external services

**Key Principle:** Just like Lovable Cloud - "describe what you want, and it's built for you"

---

## 📊 Architecture Strategy

### Option 1: Single Shared Postgres (Recommended for MVP)

```
┌─────────────────────────────────────────────────────┐
│           Centralized Postgres Database             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────┐     │
│  │         Core System Tables                │     │
│  ├──────────────────────────────────────────┤     │
│  │ • users (platform users)                 │     │
│  │ • projects (user's projects)             │     │
│  │ • project_databases (db metadata)        │     │
│  │ • project_tables (table definitions)     │     │
│  │ • project_data (JSONB - actual records)  │     │
│  └──────────────────────────────────────────┘     │
│                                                     │
│  Multi-tenancy: project_id + table_name isolation  │
│  Security: Row-Level Security (RLS) policies       │
└─────────────────────────────────────────────────────┘
```

**Pros:**
- ✅ Simple to implement and maintain
- ✅ Free tier friendly (500 MB = ~50,000+ users)
- ✅ No need to manage multiple databases
- ✅ Easy backups and migrations
- ✅ Perfect for MVP and scaling to 1,000-10,000 users

**Cons:**
- ⚠️ All data in one DB (mitigated by RLS)
- ⚠️ Eventually need sharding at very large scale

### Option 2: Database-per-Project (Future Scaling)

Only consider this when you hit 100,000+ users or regulatory requirements.

---

## 🗄️ Database Schema Design

### Core System Tables

```sql
-- Platform users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Database metadata for each project
CREATE TABLE project_databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'main',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id) -- One database per project
);

-- Table definitions (schema storage)
CREATE TABLE project_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES project_databases(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  schema_json JSONB NOT NULL, -- Column definitions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(database_id, table_name)
);

-- Actual data storage (flexible JSONB)
CREATE TABLE project_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES project_tables(id) ON DELETE CASCADE,
  data JSONB NOT NULL, -- Actual record data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_project_data_table_id ON project_data(table_id);
CREATE INDEX idx_project_data_data ON project_data USING GIN(data);
CREATE INDEX idx_project_tables_database_id ON project_tables(database_id);
```

### Auto-Generated User Table Schema

Every database automatically gets a `users` table:

```json
{
  "table_name": "users",
  "columns": [
    {
      "name": "id",
      "type": "uuid",
      "primary_key": true,
      "default": "gen_random_uuid()"
    },
    {
      "name": "email",
      "type": "text",
      "unique": true,
      "required": true
    },
    {
      "name": "password_hash",
      "type": "text",
      "required": true
    },
    {
      "name": "full_name",
      "type": "text",
      "required": false
    },
    {
      "name": "avatar_url",
      "type": "text",
      "required": false
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "default": "NOW()"
    },
    {
      "name": "updated_at",
      "type": "timestamptz",
      "default": "NOW()"
    }
  ]
}
```

---

## 🔒 Security Model - Row Level Security (RLS)

### Multi-Tenancy Isolation

```sql
-- Enable RLS on all project tables
ALTER TABLE project_databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_data ENABLE ROW LEVEL SECURITY;

-- Users can only access their own projects
CREATE POLICY user_databases ON project_databases
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_databases.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can only access tables in their databases
CREATE POLICY user_tables ON project_tables
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_databases pd
      JOIN projects p ON pd.project_id = p.id
      WHERE pd.id = project_tables.database_id
      AND p.user_id = auth.uid()
    )
  );

-- Users can only access data in their tables
CREATE POLICY user_data ON project_data
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_tables pt
      JOIN project_databases pd ON pt.database_id = pd.id
      JOIN projects p ON pd.project_id = p.id
      WHERE pt.id = project_data.table_id
      AND p.user_id = auth.uid()
    )
  );
```

---

## 🤖 AI Schema Generation with Codestral

### Prompt Engineering for Schema Generation

```typescript
// Example: AI generates schema from natural language
const prompt = `
Generate a database schema for: "A blog application with posts, comments, and categories"

Return a JSON schema following this format:
{
  "tables": [
    {
      "name": "table_name",
      "columns": [
        {
          "name": "column_name",
          "type": "uuid | text | integer | boolean | timestamptz | jsonb",
          "primary_key": true/false,
          "unique": true/false,
          "required": true/false,
          "default": "default_value",
          "references": {
            "table": "referenced_table",
            "column": "referenced_column"
          }
        }
      ]
    }
  ]
}

Rules:
- Every table must have an "id" column (uuid, primary key)
- Every table should have "created_at" and "updated_at" (timestamptz)
- Use snake_case for names
- Foreign keys use "_id" suffix
`;

// Codestral API call
const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'codestral-latest',
    messages: [
      { role: 'system', content: 'You are a database schema expert. Generate clean, normalized schemas.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' }
  })
});
```

### Schema Validation

```typescript
import Ajv from 'ajv';

const schemaValidator = new Ajv();

const tableSchema = {
  type: 'object',
  required: ['name', 'columns'],
  properties: {
    name: { type: 'string', pattern: '^[a-z][a-z0-9_]*$' },
    columns: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string' },
          type: { 
            type: 'string',
            enum: ['uuid', 'text', 'integer', 'boolean', 'timestamptz', 'jsonb']
          },
          primary_key: { type: 'boolean' },
          unique: { type: 'boolean' },
          required: { type: 'boolean' },
          default: { type: 'string' },
          references: {
            type: 'object',
            properties: {
              table: { type: 'string' },
              column: { type: 'string' }
            }
          }
        }
      }
    }
  }
};

const validate = schemaValidator.compile(tableSchema);
```

---

## 🛠️ Next.js API Routes

### API Endpoint Structure

```
/api/database/
  ├── create              POST   - Create database for project
  ├── [databaseId]/
  │   ├── tables/
  │   │   ├── create      POST   - Create new table
  │   │   ├── [tableId]   GET    - Get table schema
  │   │   └── [tableId]   DELETE - Delete table
  │   ├── records/
  │   │   ├── create      POST   - Insert record
  │   │   ├── query       POST   - Query records
  │   │   └── [recordId]  PUT/DELETE - Update/delete record
  │   ├── sql             POST   - Execute AI-assisted SQL
  │   └── auth/
  │       ├── signup      POST   - User signup
  │       └── login       POST   - User login
```

### Example: Create Database

```typescript
// app/api/database/create/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-side only
);

export async function POST(request: Request) {
  const { projectId } = await request.json();
  
  // Get user from session
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if project exists and belongs to user
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Create database
  const { data: database, error } = await supabase
    .from('project_databases')
    .insert({ project_id: projectId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-create users table
  const usersTableSchema = {
    table_name: 'users',
    columns: [
      { name: 'id', type: 'uuid', primary_key: true, default: 'gen_random_uuid()' },
      { name: 'email', type: 'text', unique: true, required: true },
      { name: 'password_hash', type: 'text', required: true },
      { name: 'full_name', type: 'text' },
      { name: 'avatar_url', type: 'text' },
      { name: 'created_at', type: 'timestamptz', default: 'NOW()' },
      { name: 'updated_at', type: 'timestamptz', default: 'NOW()' }
    ]
  };

  await supabase
    .from('project_tables')
    .insert({
      database_id: database.id,
      table_name: 'users',
      schema_json: usersTableSchema
    });

  return NextResponse.json({ database, message: 'Database created with users table' });
}
```

### Example: Create Table with AI Schema

```typescript
// app/api/database/[databaseId]/tables/create/route.ts
export async function POST(
  request: Request,
  { params }: { params: { databaseId: string } }
) {
  const { description, schemaJson } = await request.json();
  
  let finalSchema = schemaJson;

  // If description provided, use AI to generate schema
  if (description && !schemaJson) {
    const aiSchema = await generateSchemaWithCodestral(description);
    finalSchema = aiSchema;
  }

  // Validate schema
  if (!validateTableSchema(finalSchema)) {
    return NextResponse.json({ error: 'Invalid schema' }, { status: 400 });
  }

  // Insert table
  const { data: table, error } = await supabase
    .from('project_tables')
    .insert({
      database_id: params.databaseId,
      table_name: finalSchema.name,
      schema_json: finalSchema
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ table });
}
```

### Example: Query Records

```typescript
// app/api/database/[databaseId]/records/query/route.ts
export async function POST(
  request: Request,
  { params }: { params: { databaseId: string } }
) {
  const { tableName, filters, limit = 100, offset = 0 } = await request.json();

  // Get table ID
  const { data: table } = await supabase
    .from('project_tables')
    .select('id')
    .eq('database_id', params.databaseId)
    .eq('table_name', tableName)
    .single();

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  // Query records
  let query = supabase
    .from('project_data')
    .select('*')
    .eq('table_id', table.id);

  // Apply filters (JSONB querying)
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.contains('data', { [key]: value });
    });
  }

  const { data: records, error } = await query
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ records: records.map(r => r.data) });
}
```

---

## 🎨 Frontend Components

### Database Management Page Structure

```
/projects/[projectId]/database
  ├── overview          - Database stats, connection info
  ├── tables            - List all tables
  │   └── [tableName]   - Table details, records
  ├── sql               - AI-powered SQL panel
  └── settings          - Database settings
```

### Visual Schema Builder (Drag & Drop)

```typescript
// components/database/schema-builder.tsx
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { ColumnDefinition } from './column-definition';

export function SchemaBuilder() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);

  return (
    <div className="schema-builder">
      <div className="canvas">
        {/* Drag & drop canvas for tables */}
        <DndContext>
          {columns.map(column => (
            <ColumnDefinition
              key={column.id}
              column={column}
              onUpdate={updateColumn}
              onDelete={deleteColumn}
            />
          ))}
        </DndContext>
      </div>

      <div className="sidebar">
        <h3>Add Column</h3>
        <button onClick={addTextColumn}>Text</button>
        <button onClick={addNumberColumn}>Number</button>
        <button onClick={addBooleanColumn}>Boolean</button>
        <button onClick={addDateColumn}>Date</button>
        <button onClick={addRelationColumn}>Relation</button>
        
        <h3>AI Schema Generator</h3>
        <textarea
          placeholder="Describe your table: e.g., 'A blog post with title, content, author, and tags'"
          onChange={(e) => setDescription(e.target.value)}
        />
        <button onClick={generateSchema}>Generate Schema</button>
      </div>
    </div>
  );
}
```

### SQL Panel with AI Assistance

```typescript
// components/database/sql-panel.tsx
import { Editor } from '@monaco-editor/react';

export function SqlPanel({ databaseId }: { databaseId: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const executeQuery = async () => {
    const response = await fetch(`/api/database/${databaseId}/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await response.json();
    setResults(data.results);
  };

  const askAI = async (question: string) => {
    // Convert natural language to SQL
    const response = await fetch(`/api/database/${databaseId}/sql/generate`, {
      method: 'POST',
      body: JSON.stringify({ question })
    });
    const { sql } = await response.json();
    setQuery(sql);
  };

  return (
    <div className="sql-panel">
      <div className="ai-assistant">
        <input
          placeholder="Ask AI: e.g., 'Show me all users created this month'"
          onKeyDown={(e) => e.key === 'Enter' && askAI(e.currentTarget.value)}
        />
      </div>

      <Editor
        height="300px"
        language="sql"
        value={query}
        onChange={(value) => setQuery(value || '')}
        theme="vs-dark"
      />

      <button onClick={executeQuery}>Execute Query</button>

      <div className="results">
        {results.length > 0 && (
          <table>
            <thead>
              <tr>
                {Object.keys(results[0]).map(key => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val: any, j) => (
                    <td key={j}>{String(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

---

## 📊 Scaling Analysis

### Free Tier Capacity (Supabase/Neon)

- **Storage:** 500 MB free tier
- **Row Size:** ~10 KB per record (with JSONB)
- **Capacity:** ~50,000 records
- **Users:** 1,000 users × 5 tables × 10 records = 50,000 records ✅

### Growth Strategy

| Users | Tables | Records | Storage | Tier |
|-------|--------|---------|---------|------|
| 1,000 | 5,000 | 50,000 | 500 MB | Free |
| 10,000 | 50,000 | 500,000 | 5 GB | $25/mo |
| 100,000 | 500,000 | 5M | 50 GB | $250/mo |
| 1M+ | 5M+ | 50M+ | 500 GB+ | Sharding required |

### Optimization Techniques

1. **JSONB Indexing**
   ```sql
   CREATE INDEX idx_data_email ON project_data ((data->>'email'));
   CREATE INDEX idx_data_created ON project_data ((data->>'created_at'));
   ```

2. **Partitioning** (when needed)
   ```sql
   CREATE TABLE project_data_2025 PARTITION OF project_data
     FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
   ```

3. **Read Replicas** (paid tier)
   - Supabase Pro: 2 read replicas
   - Distribute read queries across replicas

---

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- ✅ Set up Supabase project
- ✅ Create core schema (users, projects, project_databases, project_tables, project_data)
- ✅ Implement RLS policies
- ✅ Build API routes: database creation, table creation
- ✅ Test multi-tenancy isolation

### Phase 2: Basic UI (Week 2-3)
- ✅ Database overview page
- ✅ Table list and creation form
- ✅ Record viewer (read-only)
- ✅ Auto-generate users table

### Phase 3: AI Integration (Week 3-4)
- ✅ Integrate Codestral for schema generation
- ✅ Prompt engineering and validation
- ✅ Visual schema builder UI
- ✅ AI-assisted SQL panel

### Phase 4: Full CRUD (Week 4-5)
- ✅ Record insertion
- ✅ Record updating
- ✅ Record deletion
- ✅ Advanced filtering and pagination

### Phase 5: Auth System (Week 5-6)
- ✅ JWT authentication
- ✅ Signup/login API routes
- ✅ Password hashing (bcrypt)
- ✅ Session management

### Phase 6: Advanced Features (Week 6-8)
- ✅ SQL query execution
- ✅ Database export/import
- ✅ Table relationships UI
- ✅ API key generation for end-users

---

## 🔐 Security Considerations

### 1. SQL Injection Prevention
- Use parameterized queries only
- Validate all schema definitions
- Sanitize user input

### 2. Data Isolation
- RLS policies on ALL tables
- Test cross-tenant data access
- Audit logs for sensitive operations

### 3. Rate Limiting
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function middleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for');
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
}
```

### 4. Environment Variables
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx  # Keep secret!
MISTRAL_API_KEY=xxx
JWT_SECRET=xxx
```

---

## 💡 Key Design Decisions

### Why JSONB for Data Storage?

**Pros:**
- ✅ Schema flexibility (users can create any structure)
- ✅ No ALTER TABLE operations needed
- ✅ Easy to add fields dynamically
- ✅ Good performance with GIN indexes
- ✅ Native Postgres feature (battle-tested)

**Cons:**
- ⚠️ Less efficient than native columns for large datasets
- ⚠️ No foreign key constraints at data level

**Verdict:** Perfect for MVP and scales to 100K+ records per table.

### Why One Database Per Project (Logical, Not Physical)?

**Pros:**
- ✅ Simpler management
- ✅ Easy backups
- ✅ Lower cost
- ✅ Easier to implement RLS

**Cons:**
- ⚠️ All projects in one DB (mitigated by RLS)

**Verdict:** Industry standard for multi-tenant SaaS (Notion, Airtable use similar patterns).

---

## 📝 Questions for Discussion

1. **UI Design:** Should we replicate Supabase's table editor or create our own simplified version?

2. **AI Schema Generation:** Should users be able to:
   - Generate entire databases from descriptions?
   - Modify AI-generated schemas before creation?
   - Chat back-and-forth to refine schemas?

3. **Pricing Model:** 
   - Free tier: 500 MB, 1 database per project
   - Pro tier: 5 GB, unlimited databases, advanced features?

4. **Data Export:** Should users be able to export their database as:
   - SQL dump?
   - JSON?
   - CSV per table?

5. **API Access:** Should we generate REST API endpoints for user's databases so their apps can query directly?

---

## 🎯 Success Metrics

- Users can create a database in < 30 seconds
- AI generates correct schemas 90%+ of the time
- No SQL knowledge required for basic operations
- System handles 1,000 concurrent users on free tier
- 99.9% uptime for database operations

---

## 📚 Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 + React | UI and routing |
| Database | Supabase (Postgres) | Data storage |
| Auth | JWT + bcrypt | Authentication |
| AI Schema | Codestral (Mistral) | Schema generation |
| Security | RLS + Next.js middleware | Multi-tenancy |
| UI Components | Shadcn/ui + Tailwind | Visual design |
| DnD | @dnd-kit | Schema builder |
| Editor | Monaco Editor | SQL panel |

---

## 🚦 Next Steps

**Before implementing, let's decide:**

1. **Approve overall architecture?** (Shared DB + JSONB approach)
2. **Confirm AI provider?** (Codestral for schema generation)
3. **UI/UX preferences?** (Supabase-like vs custom design)
4. **Phase priorities?** (Start with Phase 1-2 or jump to AI integration?)
5. **Integration points?** (How does this tie into existing project creation flow?)

Once approved, I can start implementing Phase 1 immediately! 🚀
