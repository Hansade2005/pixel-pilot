'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Book,
  Copy,
  Download,
  FileCode,
  AlertCircle,
  CheckCircle2,
  Code2,
  Database,
} from 'lucide-react';

interface Table {
  id: string;
  name: string;
  schema: any;
}

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
}

interface ApiDocsGeneratorProps {
  databaseId: string;
  tables: Table[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FRAMEWORKS = [
  { id: 'nextjs', name: 'Next.js 14', icon: '⚡' },
  { id: 'react', name: 'React + Vite', icon: '⚛️' },
  { id: 'vue', name: 'Vue.js', icon: '💚' },
  { id: 'nodejs', name: 'Node.js', icon: '🟢' },
  { id: 'python', name: 'Python', icon: '🐍' },
  { id: 'curl', name: 'cURL', icon: '🔧' },
];

export function ApiDocsGenerator({
  databaseId,
  tables,
  open,
  onOpenChange,
}: ApiDocsGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState('nextjs');
  const [selectedTable, setSelectedTable] = useState<string>('');

  useEffect(() => {
    if (open) {
      checkApiKey();
      if (tables.length > 0 && !selectedTable) {
        setSelectedTable(tables[0].id);
      }
    }
  }, [open, tables]);

  const checkApiKey = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/database/${databaseId}/api-keys`);
      const data = await response.json();

      if (data.api_keys && data.api_keys.length > 0) {
        setHasApiKey(true);
        setApiKey(`${data.api_keys[0].key_prefix}••••••••••••••••••••••••••••`);
      } else {
        setHasApiKey(false);
      }
    } catch (error) {
      console.error('Error checking API keys:', error);
      setHasApiKey(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = () => {
    onOpenChange(false);
    // Trigger tab change to API Keys
    setTimeout(() => {
      const apiKeysTab = document.querySelector('[value="api-keys"]') as HTMLElement;
      apiKeysTab?.click();
    }, 100);
    toast.info('Please create an API key in the API Keys tab');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const downloadDocs = () => {
    const content = generateFullDocumentation();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-documentation-${selectedFramework}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Documentation downloaded!');
  };

  const generateFullDocumentation = () => {
    const framework = FRAMEWORKS.find((f) => f.id === selectedFramework);
    const table = tables.find((t) => t.id === selectedTable);

    return `# API Documentation - ${framework?.name}

Database ID: ${databaseId}
Selected Table: ${table?.name || 'N/A'}
Generated: ${new Date().toLocaleString()}

---

${generateFrameworkDocs()}
`;
  };

  const generateFrameworkDocs = () => {
    switch (selectedFramework) {
      case 'nextjs':
        return generateNextJSDocs();
      case 'react':
        return generateReactDocs();
      case 'vue':
        return generateVueDocs();
      case 'nodejs':
        return generateNodeJSDocs();
      case 'python':
        return generatePythonDocs();
      case 'curl':
        return generateCurlDocs();
      default:
        return '';
    }
  };

  const generateNextJSDocs = () => {
    const table = tables.find((t) => t.id === selectedTable);
    const tableName = table?.name || 'your_table';

    return `## Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Add environment variables to \`.env.local\`:
\`\`\`env
PIPILOT_API_KEY=${apiKey}
NEXT_PUBLIC_PIPILOT_DATABASE_ID=${databaseId}
\`\`\`

## API Client

Create \`lib/api-client.ts\`:
\`\`\`typescript
const API_BASE = 'https://pipilot.dev/api/v1/databases';
const DATABASE_ID = process.env.NEXT_PUBLIC_PIPILOT_DATABASE_ID!;
const API_KEY = process.env.PIPILOT_API_KEY!;

interface ApiResponse<T> {
  data: T;
  error?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = \`\${API_BASE}/\${DATABASE_ID}\${endpoint}\`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    return { data: null as T, error: data.error };
  }

  return { data, error: undefined };
}
\`\`\`

## Authentication

### Sign Up
\`\`\`typescript
// app/actions/auth.ts
'use server';

import { apiRequest } from '@/lib/api-client';

export async function signUp(email: string, password: string, fullName: string) {
  return apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
}
\`\`\`

### Log In
\`\`\`typescript
export async function logIn(email: string, password: string) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
\`\`\`

## CRUD Operations - ${tableName}

### Create Record
\`\`\`typescript
export async function create${capitalizeFirst(tableName)}(data: any) {
  return apiRequest('/tables/${selectedTable}/records', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
\`\`\`

### Get All Records
\`\`\`typescript
export async function get${capitalizeFirst(tableName)}s() {
  return apiRequest('/tables/${selectedTable}/records', {
    method: 'GET',
  });
}
\`\`\`

### Get Single Record
\`\`\`typescript
export async function get${capitalizeFirst(tableName)}(id: string) {
  return apiRequest(\`/tables/${selectedTable}/records/\${id}\`, {
    method: 'GET',
  });
}
\`\`\`

### Update Record
\`\`\`typescript
export async function update${capitalizeFirst(tableName)}(id: string, data: any) {
  return apiRequest(\`/tables/${selectedTable}/records/\${id}\`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
\`\`\`

### Delete Record
\`\`\`typescript
export async function delete${capitalizeFirst(tableName)}(id: string) {
  return apiRequest(\`/tables/${selectedTable}/records/\${id}\`, {
    method: 'DELETE',
  });
}
\`\`\`

## Usage in Components

\`\`\`typescript
'use client';

import { useState, useEffect } from 'react';
import { get${capitalizeFirst(tableName)}s } from '@/app/actions/auth';

export default function ${capitalizeFirst(tableName)}List() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data, error } = await get${capitalizeFirst(tableName)}s();
      if (error) {
        console.error('Error:', error);
      } else {
        setItems(data.records || []);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {items.map((item: any) => (
        <div key={item.id}>{JSON.stringify(item)}</div>
      ))}
    </div>
  );
}
\`\`\`
`;
  };

  const generateReactDocs = () => {
    const table = tables.find((t) => t.id === selectedTable);
    const tableName = table?.name || 'your_table';

    return `## Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Add environment variables to \`.env\`:
\`\`\`env
VITE_PIPILOT_API_KEY=${apiKey}
VITE_PIPILOT_DATABASE_ID=${databaseId}
\`\`\`

## API Client

Create \`src/lib/api.js\`:
\`\`\`javascript
const API_BASE = 'https://pipilot.dev/api/v1/databases';
const DATABASE_ID = import.meta.env.VITE_PIPILOT_DATABASE_ID;
const API_KEY = import.meta.env.VITE_PIPILOT_API_KEY;

export async function apiRequest(endpoint, options = {}) {
  const url = \`\${API_BASE}/\${DATABASE_ID}\${endpoint}\`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}
\`\`\`

## Custom Hook

Create \`src/hooks/use${capitalizeFirst(tableName)}.js\`:
\`\`\`javascript
import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';

export function use${capitalizeFirst(tableName)}s() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await apiRequest('/tables/${selectedTable}/records');
        setData(result.records || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const create = async (newData) => {
    const result = await apiRequest('/tables/${selectedTable}/records', {
      method: 'POST',
      body: JSON.stringify(newData),
    });
    setData([...data, result.record]);
    return result;
  };

  const update = async (id, updates) => {
    const result = await apiRequest(\`/tables/${selectedTable}/records/\${id}\`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setData(data.map(item => item.id === id ? result.record : item));
    return result;
  };

  const remove = async (id) => {
    await apiRequest(\`/tables/${selectedTable}/records/\${id}\`, {
      method: 'DELETE',
    });
    setData(data.filter(item => item.id !== id));
  };

  return { data, loading, error, create, update, remove };
}
\`\`\`

## Usage

\`\`\`javascript
import { use${capitalizeFirst(tableName)}s } from './hooks/use${capitalizeFirst(tableName)}';

function ${capitalizeFirst(tableName)}List() {
  const { data, loading, error, create, update, remove } = use${capitalizeFirst(tableName)}s();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {data.map(item => (
        <div key={item.id}>
          {JSON.stringify(item)}
        </div>
      ))}
    </div>
  );
}
\`\`\`
`;
  };

  const generateVueDocs = () => {
    const table = tables.find((t) => t.id === selectedTable);
    const tableName = table?.name || 'your_table';

    return `## Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Add environment variables to \`.env\`:
\`\`\`env
VITE_PIPILOT_API_KEY=${apiKey}
VITE_PIPILOT_DATABASE_ID=${databaseId}
\`\`\`

## API Client

Create \`src/services/api.js\`:
\`\`\`javascript
const API_BASE = 'https://pipilot.dev/api/v1/databases';
const DATABASE_ID = import.meta.env.VITE_PIPILOT_DATABASE_ID;
const API_KEY = import.meta.env.VITE_PIPILOT_API_KEY;

export async function apiRequest(endpoint, options = {}) {
  const url = \`\${API_BASE}/\${DATABASE_ID}\${endpoint}\`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const ${tableName}Api = {
  getAll: () => apiRequest('/tables/${selectedTable}/records'),
  
  getOne: (id) => apiRequest(\`/tables/${selectedTable}/records/\${id}\`),
  
  create: (data) => apiRequest('/tables/${selectedTable}/records', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id, data) => apiRequest(\`/tables/${selectedTable}/records/\${id}\`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (id) => apiRequest(\`/tables/${selectedTable}/records/\${id}\`, {
    method: 'DELETE',
  }),
};
\`\`\`

## Composable

Create \`src/composables/use${capitalizeFirst(tableName)}.js\`:
\`\`\`javascript
import { ref, onMounted } from 'vue';
import { ${tableName}Api } from '../services/api';

export function use${capitalizeFirst(tableName)}s() {
  const data = ref([]);
  const loading = ref(false);
  const error = ref(null);

  async function fetchAll() {
    loading.value = true;
    error.value = null;
    try {
      const result = await ${tableName}Api.getAll();
      data.value = result.records || [];
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function create(newData) {
    const result = await ${tableName}Api.create(newData);
    data.value.push(result.record);
    return result;
  }

  async function update(id, updates) {
    const result = await ${tableName}Api.update(id, updates);
    const index = data.value.findIndex(item => item.id === id);
    if (index !== -1) {
      data.value[index] = result.record;
    }
    return result;
  }

  async function remove(id) {
    await ${tableName}Api.delete(id);
    data.value = data.value.filter(item => item.id !== id);
  }

  onMounted(fetchAll);

  return { data, loading, error, fetchAll, create, update, remove };
}
\`\`\`

## Usage in Component

\`\`\`vue
<script setup>
import { use${capitalizeFirst(tableName)}s } from '@/composables/use${capitalizeFirst(tableName)}';

const { data, loading, error, create, update, remove } = use${capitalizeFirst(tableName)}s();
</script>

<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <div v-else>
      <div v-for="item in data" :key="item.id">
        {{ item }}
      </div>
    </div>
  </div>
</template>
\`\`\`
`;
  };

  const generateNodeJSDocs = () => {
    const table = tables.find((t) => t.id === selectedTable);
    const tableName = table?.name || 'your_table';

    return `## Setup

1. Install dependencies:
\`\`\`bash
npm install node-fetch dotenv
\`\`\`

2. Create \`.env\`:
\`\`\`env
PIPILOT_API_KEY=${apiKey}
PIPILOT_DATABASE_ID=${databaseId}
\`\`\`

## API Client

Create \`lib/api.js\`:
\`\`\`javascript
require('dotenv').config();
const fetch = require('node-fetch');

const API_BASE = 'https://pipilot.dev/api/v1/databases';
const DATABASE_ID = process.env.PIPILOT_DATABASE_ID;
const API_KEY = process.env.PIPILOT_API_KEY;

async function apiRequest(endpoint, options = {}) {
  const url = \`\${API_BASE}/\${DATABASE_ID}\${endpoint}\`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// ${tableName} operations
async function getAll${capitalizeFirst(tableName)}s() {
  return apiRequest('/tables/${selectedTable}/records');
}

async function get${capitalizeFirst(tableName)}(id) {
  return apiRequest(\`/tables/${selectedTable}/records/\${id}\`);
}

async function create${capitalizeFirst(tableName)}(data) {
  return apiRequest('/tables/${selectedTable}/records', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function update${capitalizeFirst(tableName)}(id, data) {
  return apiRequest(\`/tables/${selectedTable}/records/\${id}\`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

async function delete${capitalizeFirst(tableName)}(id) {
  return apiRequest(\`/tables/${selectedTable}/records/\${id}\`, {
    method: 'DELETE',
  });
}

module.exports = {
  getAll${capitalizeFirst(tableName)}s,
  get${capitalizeFirst(tableName)},
  create${capitalizeFirst(tableName)},
  update${capitalizeFirst(tableName)},
  delete${capitalizeFirst(tableName)},
};
\`\`\`

## Usage

\`\`\`javascript
const {
  getAll${capitalizeFirst(tableName)}s,
  create${capitalizeFirst(tableName)},
} = require('./lib/api');

async function main() {
  try {
    // Get all records
    const all = await getAll${capitalizeFirst(tableName)}s();
    console.log('All records:', all.records);

    // Create new record
    const newRecord = await create${capitalizeFirst(tableName)}({
      // your data here
    });
    console.log('Created:', newRecord.record);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
\`\`\`
`;
  };

  const generatePythonDocs = () => {
    const table = tables.find((t) => t.id === selectedTable);
    const tableName = table?.name || 'your_table';

    return `## Setup

1. Install dependencies:
\`\`\`bash
pip install requests python-dotenv
\`\`\`

2. Create \`.env\`:
\`\`\`env
PIPILOT_API_KEY=${apiKey}
PIPILOT_DATABASE_ID=${databaseId}
\`\`\`

## API Client

Create \`api_client.py\`:
\`\`\`python
import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_BASE = 'https://pipilot.dev/api/v1/databases'
DATABASE_ID = os.getenv('PIPILOT_DATABASE_ID')
API_KEY = os.getenv('PIPILOT_API_KEY')

class ApiClient:
    def __init__(self):
        self.base_url = f"{API_BASE}/{DATABASE_ID}"
        self.headers = {
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        }
    
    def request(self, method, endpoint, data=None):
        url = f"{self.base_url}{endpoint}"
        response = requests.request(
            method=method,
            url=url,
            headers=self.headers,
            json=data
        )
        
        if not response.ok:
            raise Exception(f"API Error: {response.json().get('error', 'Unknown error')}")
        
        return response.json()

class ${capitalizeFirst(tableName)}Api:
    def __init__(self):
        self.client = ApiClient()
        self.table_id = '${selectedTable}'
    
    def get_all(self):
        return self.client.request('GET', f'/tables/{self.table_id}/records')
    
    def get_one(self, record_id):
        return self.client.request('GET', f'/tables/{self.table_id}/records/{record_id}')
    
    def create(self, data):
        return self.client.request('POST', f'/tables/{self.table_id}/records', data)
    
    def update(self, record_id, data):
        return self.client.request('PUT', f'/tables/{self.table_id}/records/{record_id}', data)
    
    def delete(self, record_id):
        return self.client.request('DELETE', f'/tables/{self.table_id}/records/{record_id}')
\`\`\`

## Usage

\`\`\`python
from api_client import ${capitalizeFirst(tableName)}Api

def main():
    api = ${capitalizeFirst(tableName)}Api()
    
    try:
        # Get all records
        all_records = api.get_all()
        print(f"All records: {all_records['records']}")
        
        # Create new record
        new_record = api.create({
            # your data here
        })
        print(f"Created: {new_record['record']}")
        
        # Update record
        updated = api.update(new_record['record']['id'], {
            # updated data
        })
        print(f"Updated: {updated['record']}")
        
        # Delete record
        api.delete(new_record['record']['id'])
        print("Deleted successfully")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
\`\`\`
`;
  };

  const generateCurlDocs = () => {
    const table = tables.find((t) => t.id === selectedTable);
    const tableName = table?.name || 'your_table';

    return `## Authentication Endpoints

### Sign Up
\`\`\`bash
curl -X POST https://pipilot.dev/api/v1/databases/${databaseId}/auth/signup \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "full_name": "John Doe"
  }'
\`\`\`

### Log In
\`\`\`bash
curl -X POST https://pipilot.dev/api/v1/databases/${databaseId}/auth/login \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
\`\`\`

## CRUD Operations - ${tableName}

### Get All Records
\`\`\`bash
curl -X GET https://pipilot.dev/api/v1/databases/${databaseId}/tables/${selectedTable}/records \\
  -H "Authorization: Bearer ${apiKey}"
\`\`\`

### Get Single Record
\`\`\`bash
curl -X GET https://pipilot.dev/api/v1/databases/${databaseId}/tables/${selectedTable}/records/RECORD_ID \\
  -H "Authorization: Bearer ${apiKey}"
\`\`\`

### Create Record
\`\`\`bash
curl -X POST https://pipilot.dev/api/v1/databases/${databaseId}/tables/${selectedTable}/records \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "field1": "value1",
    "field2": "value2"
  }'
\`\`\`

### Update Record
\`\`\`bash
curl -X PUT https://pipilot.dev/api/v1/databases/${databaseId}/tables/${selectedTable}/records/RECORD_ID \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "field1": "updated_value"
  }'
\`\`\`

### Delete Record
\`\`\`bash
curl -X DELETE https://pipilot.dev/api/v1/databases/${databaseId}/tables/${selectedTable}/records/RECORD_ID \\
  -H "Authorization: Bearer ${apiKey}"
\`\`\`

## Filtering & Pagination

### Filter Records
\`\`\`bash
curl -X GET "https://pipilot.dev/api/v1/databases/${databaseId}/tables/${selectedTable}/records?field1=value1" \\
  -H "Authorization: Bearer ${apiKey}"
\`\`\`

### Pagination
\`\`\`bash
curl -X GET "https://pipilot.dev/api/v1/databases/${databaseId}/tables/${selectedTable}/records?page=1&limit=10" \\
  -H "Authorization: Bearer ${apiKey}"
\`\`\`
`;
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  if (!hasApiKey && !loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              API Key Required
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              You need to create an API key before generating documentation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-yellow-950/30 border border-yellow-900 rounded-lg p-4">
              <p className="text-sm text-yellow-200">
                API keys are required to authenticate your requests. Create one in the API Keys tab to get started.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-400">To create an API key:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-400">
                <li>Click "Go to API Keys" below</li>
                <li>Click "Create API Key"</li>
                <li>Give it a name and save</li>
                <li>Come back here to generate docs</li>
              </ol>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-gray-700 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateApiKey}
              className="flex-1"
            >
              Go to API Keys
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-5xl max-h-[90vh] flex flex-col h-full">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Book className="h-5 w-5 text-blue-400" />
            API Documentation Generator
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Generate personalized API documentation for your database
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Framework / Language
              </label>
              <Select value={selectedFramework} onValueChange={setSelectedFramework}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {FRAMEWORKS.map((fw) => (
                    <SelectItem key={fw.id} value={fw.id} className="text-white">
                      {fw.icon} {fw.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Primary Table
              </label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {tables.map((table) => (
                    <SelectItem key={table.id} value={table.id} className="text-white">
                      {table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-3">
                <div className="text-xs text-gray-400 mb-1">Database ID</div>
                <div className="text-xs text-white font-mono truncate">
                  {databaseId}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-3">
                <div className="text-xs text-gray-400 mb-1">API Key</div>
                <div className="text-xs text-white font-mono truncate">
                  {apiKey}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-3">
                <div className="text-xs text-gray-400 mb-1">Tables</div>
                <div className="text-xs text-white font-semibold">
                  {tables.length} table{tables.length !== 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Documentation Preview */}
          <ScrollArea className="h-[400px] rounded-lg border border-gray-700 bg-gray-900/50">
            <div className="p-4">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                {generateFrameworkDocs()}
              </pre>
            </div>
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-green-700 text-green-400">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Ready to use
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => copyToClipboard(generateFullDocumentation())}
              className="border-gray-700 text-white hover:bg-gray-700"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy All
            </Button>
            <Button onClick={downloadDocs}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
}
