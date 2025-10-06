# Simplified Database Implementation Plan

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Your App (Client)                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  IndexedDB (Storage Manager)                            │
│  └── Projects (existing, unchanged)                     │
│                                                          │
│  Database Management UI                                 │
│  └── Uses currently selected project                    │
│                                                          │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js API Routes                         │
│  /api/database/create                                   │
│  /api/database/[id]/tables/create                       │
│  /api/database/[id]/tables/[tableId]/records            │
│  /api/database/[id]/query                               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│           Supabase (PostgreSQL)                         │
├─────────────────────────────────────────────────────────┤
│  databases  → project_id + user_id                      │
│  tables     → schema_json (JSONB)                       │
│  records    → data_json (JSONB)                         │
└─────────────────────────────────────────────────────────┘
```

## 📊 Supabase Schema (Exact Structure)

```sql
-- 1. Logical databases per project
CREATE TABLE databases (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,           -- From session auth
  project_id TEXT NOT NULL,        -- From your IndexedDB project
  name TEXT NOT NULL DEFAULT 'main',
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(project_id)               -- One database per project
);

-- 2. Tables inside logical databases
CREATE TABLE tables (
  id SERIAL PRIMARY KEY,
  database_id INT REFERENCES databases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  schema_json JSONB NOT NULL,      -- Column definitions
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(database_id, name)        -- No duplicate table names
);

-- 3. Records inside tables
CREATE TABLE records (
  id SERIAL PRIMARY KEY,
  table_id INT REFERENCES tables(id) ON DELETE CASCADE,
  data_json JSONB NOT NULL,        -- Actual row data
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_databases_user_id ON databases(user_id);
CREATE INDEX idx_databases_project_id ON databases(project_id);
CREATE INDEX idx_tables_database_id ON tables(database_id);
CREATE INDEX idx_records_table_id ON records(table_id);
CREATE INDEX idx_records_data_json ON records USING GIN(data_json);

-- Row Level Security (RLS)
ALTER TABLE databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can manage their own databases"
  ON databases FOR ALL
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage tables in their databases"
  ON tables FOR ALL
  USING (
    database_id IN (
      SELECT id FROM databases WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage records in their tables"
  ON records FOR ALL
  USING (
    table_id IN (
      SELECT t.id FROM tables t
      JOIN databases d ON t.database_id = d.id
      WHERE d.user_id = auth.uid()::text
    )
  );
```

## 🔌 Integration with Your Storage Manager

### How to Get Current Project

```typescript
// lib/get-current-project.ts
import { storageManager } from './storage-manager';

export async function getCurrentProject() {
  // Option 1: From URL (if in workspace)
  const pathname = window.location.pathname;
  const match = pathname.match(/\/workspace\/([^\/]+)/);
  if (match) {
    const projectId = match[1];
    const project = await storageManager.getProject(projectId);
    return project;
  }

  // Option 2: From localStorage (last selected project)
  const lastProjectId = localStorage.getItem('currentProjectId');
  if (lastProjectId) {
    const project = await storageManager.getProject(lastProjectId);
    return project;
  }

  // Option 3: Get first project
  const projects = await storageManager.getAllProjects();
  return projects[0] || null;
}

// Usage in components
const project = await getCurrentProject();
if (project) {
  const projectId = project.id; // Use this for database operations
}
```

### Database Status in Project

```typescript
// Add to your project type (no breaking changes)
export interface Project {
  id: string;
  name: string;
  prompt: string;
  createdAt: string;
  // ... existing fields
  
  // NEW: Optional database reference
  databaseId?: number;  // References Supabase databases.id
  hasDatabase?: boolean; // Quick check
}

// Update storage manager to store database association
export class StorageManager {
  // ... existing methods
  
  async setProjectDatabase(projectId: string, databaseId: number) {
    const project = await this.getProject(projectId);
    if (project) {
      project.databaseId = databaseId;
      project.hasDatabase = true;
      await this.updateProject(project);
    }
  }
}
```

## 🚀 Next.js API Routes

### 1. Create Database

```typescript
// app/api/database/create/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { projectId, name = 'main' } = await request.json();
    
    // Get user from session (you should already have session handling)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if database already exists for this project
    const { data: existing } = await supabase
      .from('databases')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return NextResponse.json({ 
        error: 'Database already exists for this project',
        database: existing 
      }, { status: 400 });
    }

    // Create database
    const { data: database, error } = await supabase
      .from('databases')
      .insert({
        user_id: userId,
        project_id: projectId,
        name
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-create users table with auth schema
    const usersTableSchema = {
      columns: [
        { name: 'id', type: 'uuid', primary_key: true },
        { name: 'email', type: 'text', unique: true, required: true },
        { name: 'password_hash', type: 'text', required: true },
        { name: 'full_name', type: 'text' },
        { name: 'avatar_url', type: 'text' },
        { name: 'created_at', type: 'timestamp' },
        { name: 'updated_at', type: 'timestamp' }
      ]
    };

    await supabase
      .from('tables')
      .insert({
        database_id: database.id,
        name: 'users',
        schema_json: usersTableSchema
      });

    return NextResponse.json({ 
      success: true, 
      database,
      message: 'Database created with users table'
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 2. Create Table

```typescript
// app/api/database/[databaseId]/tables/create/route.ts
export async function POST(
  request: Request,
  { params }: { params: { databaseId: string } }
) {
  try {
    const { name, schema_json, aiDescription } = await request.json();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let finalSchema = schema_json;

    // If AI description provided, generate schema
    if (aiDescription && !schema_json) {
      finalSchema = await generateSchemaWithAI(aiDescription);
    }

    // Validate schema
    if (!validateSchema(finalSchema)) {
      return NextResponse.json({ error: 'Invalid schema' }, { status: 400 });
    }

    // Verify database belongs to user
    const { data: database } = await supabase
      .from('databases')
      .select('*')
      .eq('id', params.databaseId)
      .eq('user_id', session.user.id)
      .single();

    if (!database) {
      return NextResponse.json({ error: 'Database not found' }, { status: 404 });
    }

    // Create table
    const { data: table, error } = await supabase
      .from('tables')
      .insert({
        database_id: params.databaseId,
        name,
        schema_json: finalSchema
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, table });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 3. Insert Record

```typescript
// app/api/database/[databaseId]/tables/[tableId]/records/route.ts
export async function POST(
  request: Request,
  { params }: { params: { databaseId: string; tableId: string } }
) {
  try {
    const { data_json } = await request.json();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify table belongs to user's database
    const { data: table } = await supabase
      .from('tables')
      .select('*, databases!inner(*)')
      .eq('id', params.tableId)
      .eq('database_id', params.databaseId)
      .eq('databases.user_id', session.user.id)
      .single();

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Validate data against schema
    const validation = validateDataAgainstSchema(data_json, table.schema_json);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: 'Data validation failed', 
        details: validation.errors 
      }, { status: 400 });
    }

    // Insert record
    const { data: record, error } = await supabase
      .from('records')
      .insert({
        table_id: params.tableId,
        data_json
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, record });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET records
export async function GET(
  request: Request,
  { params }: { params: { databaseId: string; tableId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: table } = await supabase
      .from('tables')
      .select('*, databases!inner(*)')
      .eq('id', params.tableId)
      .eq('databases.user_id', session.user.id)
      .single();

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Get records
    const { data: records, error, count } = await supabase
      .from('records')
      .select('*', { count: 'exact' })
      .eq('table_id', params.tableId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      records: records.map(r => ({ id: r.id, ...r.data_json })),
      total: count,
      limit,
      offset
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 4. Query with Filters

```typescript
// app/api/database/[databaseId]/query/route.ts
export async function POST(
  request: Request,
  { params }: { params: { databaseId: string } }
) {
  try {
    const { tableName, filters, limit = 100, offset = 0 } = await request.json();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get table
    const { data: table } = await supabase
      .from('tables')
      .select('*, databases!inner(*)')
      .eq('name', tableName)
      .eq('database_id', params.databaseId)
      .eq('databases.user_id', session.user.id)
      .single();

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Build query with JSONB filters
    let query = supabase
      .from('records')
      .select('*', { count: 'exact' })
      .eq('table_id', table.id);

    // Apply JSONB filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.contains('data_json', { [key]: value });
      });
    }

    const { data: records, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      records: records.map(r => ({ id: r.id, ...r.data_json })),
      total: count
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## 🎨 Frontend Integration

### Database Management Page

```typescript
// app/projects/[projectId]/database/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCurrentProject } from '@/lib/get-current-project';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DatabasePage() {
  const params = useParams();
  const [project, setProject] = useState<any>(null);
  const [database, setDatabase] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [params.projectId]);

  async function loadData() {
    try {
      // Get current project from IndexedDB
      const proj = await getCurrentProject();
      setProject(proj);

      if (!proj) {
        toast.error('Project not found');
        return;
      }

      // Check if database exists
      if (proj.databaseId) {
        await loadDatabase(proj.databaseId);
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function loadDatabase(databaseId: number) {
    const response = await fetch(`/api/database/${databaseId}`);
    const data = await response.json();
    
    if (data.success) {
      setDatabase(data.database);
      setTables(data.tables);
    }
  }

  async function createDatabase() {
    try {
      const response = await fetch('/api/database/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: project.id,
          name: project.name + '_db'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Database created!');
        
        // Update project in IndexedDB
        await storageManager.setProjectDatabase(project.id, data.database.id);
        
        setDatabase(data.database);
        await loadData();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to create database');
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!database) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Database</h1>
          <p className="text-muted-foreground mb-8">
            No database for project: {project?.name}
          </p>
          <Button onClick={createDatabase} size="lg">
            Create Database
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Database: {database.name}</h1>
      
      <div className="grid gap-6">
        {/* Database Overview */}
        <DatabaseOverview database={database} tables={tables} />
        
        {/* Tables List */}
        <TablesList tables={tables} databaseId={database.id} />
        
        {/* Create Table Button */}
        <CreateTableDialog databaseId={database.id} onSuccess={loadData} />
      </div>
    </div>
  );
}
```

### Navigation Integration

```typescript
// Add to your accounts page or project sidebar
import { getCurrentProject } from '@/lib/get-current-project';

function ProjectMenu() {
  const project = await getCurrentProject();
  
  return (
    <nav>
      <Link href={`/workspace/${project.id}`}>
        Workspace
      </Link>
      <Link href={`/projects/${project.id}/database`}>
        Database {project.hasDatabase ? '✓' : ''}
      </Link>
    </nav>
  );
}
```

## 🔧 Helper Functions

### Schema Validation

```typescript
// lib/validate-schema.ts
export function validateSchema(schema: any): boolean {
  if (!schema || !schema.columns || !Array.isArray(schema.columns)) {
    return false;
  }

  const validTypes = ['text', 'number', 'boolean', 'timestamp', 'uuid', 'json'];

  for (const column of schema.columns) {
    if (!column.name || typeof column.name !== 'string') return false;
    if (!column.type || !validTypes.includes(column.type)) return false;
  }

  return true;
}

export function validateDataAgainstSchema(data: any, schema: any) {
  const errors: string[] = [];

  schema.columns.forEach((column: any) => {
    const value = data[column.name];

    // Check required fields
    if (column.required && (value === undefined || value === null)) {
      errors.push(`${column.name} is required`);
    }

    // Type checking
    if (value !== undefined && value !== null) {
      switch (column.type) {
        case 'text':
          if (typeof value !== 'string') errors.push(`${column.name} must be text`);
          break;
        case 'number':
          if (typeof value !== 'number') errors.push(`${column.name} must be number`);
          break;
        case 'boolean':
          if (typeof value !== 'boolean') errors.push(`${column.name} must be boolean`);
          break;
      }
    }
  });

  return { valid: errors.length === 0, errors };
}
```

### AI Schema Generation

```typescript
// lib/generate-schema-ai.ts
export async function generateSchemaWithAI(description: string) {
  const prompt = `Generate a database table schema for: "${description}"

Return ONLY valid JSON in this exact format:
{
  "columns": [
    {"name": "id", "type": "uuid", "primary_key": true},
    {"name": "created_at", "type": "timestamp"}
  ]
}

Rules:
- Always include "id" (uuid, primary_key)
- Always include "created_at" and "updated_at" (timestamp)
- Use snake_case for names
- Valid types: text, number, boolean, timestamp, uuid, json
- Add "required": true for mandatory fields
- Add "unique": true for unique fields`;

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'codestral-latest',
      messages: [
        { role: 'system', content: 'You are a database expert. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });

  const data = await response.json();
  const schema = JSON.parse(data.choices[0].message.content);
  
  return schema;
}
```

## 📋 Implementation Checklist

### Phase 1: Supabase Setup (Day 1)
- [ ] Create Supabase project
- [ ] Run SQL schema creation script
- [ ] Enable RLS policies
- [ ] Test database connection
- [ ] Add environment variables

### Phase 2: API Routes (Day 2-3)
- [ ] `/api/database/create` - Create database
- [ ] `/api/database/[id]` - Get database details
- [ ] `/api/database/[id]/tables/create` - Create table
- [ ] `/api/database/[id]/tables/[tableId]/records` - CRUD records
- [ ] `/api/database/[id]/query` - Query with filters

### Phase 3: Frontend Integration (Day 4-5)
- [ ] Update project type with `databaseId` field
- [ ] Create `getCurrentProject()` helper
- [ ] Build database management page
- [ ] Add "Create Database" button to accounts page
- [ ] Test end-to-end flow

### Phase 4: AI Integration (Day 6-7)
- [ ] Integrate Codestral API
- [ ] Build schema generation prompt
- [ ] Add AI schema builder UI
- [ ] Test schema generation accuracy

### Phase 5: Polish (Day 8-10)
- [ ] Add loading states
- [ ] Error handling
- [ ] Success toasts
- [ ] Documentation
- [ ] User testing

## 🎯 Quick Start Commands

```bash
# 1. Install dependencies
pnpm add @supabase/supabase-js

# 2. Set up environment variables
# Add to .env.local:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MISTRAL_API_KEY=your_mistral_key

# 3. Run Supabase SQL
# Copy the schema from above and run in Supabase SQL Editor

# 4. Start development
pnpm dev
```

## ✅ Success Criteria

- ✅ Users can create one database per project
- ✅ Database automatically gets users table
- ✅ Users can create custom tables with AI or manually
- ✅ Full CRUD operations on records
- ✅ Data is isolated per user (RLS works)
- ✅ No breaking changes to existing project system
- ✅ Seamless integration with IndexedDB storage

Ready to implement! 🚀
