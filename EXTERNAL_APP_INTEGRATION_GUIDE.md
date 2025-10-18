# 🚀 Quick Start: API Keys for External Apps

## For Users Building Apps on Vercel/Netlify

### Step 1: Get Your API Key

1. Go to: `https://pipilot.dev/workspace/YOUR_WORKSPACE/database`
2. Click **API Keys** tab
3. Click **Create API Key**
4. Name it (e.g., "My Vercel App")
5. **Copy the key immediately!** (shown only once)

### Step 2: Get Your Database & Table IDs

In the browser URL when viewing your table:
```
https://pipilot.dev/workspace/123/database/tables/456
                                      ^^^          ^^^
                                  Database ID   Table ID
```

### Step 3: Use in Your App

#### **Next.js App (Vercel):**

Create `lib/database.ts`:

```typescript
const API_KEY = process.env.PIPILOT_API_KEY!;
const DATABASE_ID = 'YOUR_DATABASE_ID';
const BASE_URL = 'https://pipilot.dev/api/v1';

export async function getRecords(tableId: string) {
  const response = await fetch(
    `${BASE_URL}/databases/${DATABASE_ID}/tables/${tableId}/records`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch records');
  }
  
  return response.json();
}

export async function createRecord(tableId: string, data: any) {
  const response = await fetch(
    `${BASE_URL}/databases/${DATABASE_ID}/tables/${tableId}/records`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data })
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to create record');
  }
  
  return response.json();
}

export async function updateRecord(tableId: string, recordId: string, data: any) {
  const response = await fetch(
    `${BASE_URL}/databases/${DATABASE_ID}/tables/${tableId}/records/${recordId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data })
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to update record');
  }
  
  return response.json();
}

export async function deleteRecord(tableId: string, recordId: string) {
  const response = await fetch(
    `${BASE_URL}/databases/${DATABASE_ID}/tables/${tableId}/records/${recordId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to delete record');
  }
  
  return response.json();
}
```

#### **Use in a Server Component:**

```typescript
// app/users/page.tsx
import { getRecords } from '@/lib/database';

export default async function UsersPage() {
  const { records } = await getRecords('YOUR_TABLE_ID');
  
  return (
    <div>
      <h1>Users</h1>
      {records.map((record: any) => (
        <div key={record.id}>
          {record.data_json.name} - {record.data_json.email}
        </div>
      ))}
    </div>
  );
}
```

#### **Use in an API Route:**

```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { createRecord } from '@/lib/database';

export async function POST(request: Request) {
  const body = await request.json();
  
  try {
    const result = await createRecord('YOUR_TABLE_ID', {
      name: body.name,
      email: body.email
    });
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

### Step 4: Set Environment Variable

Add to `.env.local`:

```env
PIPILOT_API_KEY=sk_live_your_actual_key_here
```

### Step 5: Deploy!

```bash
# Vercel
vercel env add PIPILOT_API_KEY
vercel deploy

# Netlify
netlify env:set PIPILOT_API_KEY sk_live_your_key_here
netlify deploy
```

---

## React Example (Client-Side)

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      // Call your API route (not directly to pipilot.dev to keep API key secret)
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.records);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {users.map((user: any) => (
        <div key={user.id}>
          {user.data_json.name}
        </div>
      ))}
    </div>
  );
}
```

---

## Vanilla JavaScript Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Users</title>
</head>
<body>
  <h1>Users</h1>
  <div id="users"></div>

  <script>
    const API_KEY = 'sk_live_your_key_here'; // ⚠️ Don't expose in production!
    const DATABASE_ID = 'YOUR_DATABASE_ID';
    const TABLE_ID = 'YOUR_TABLE_ID';

    async function fetchUsers() {
      const response = await fetch(
        `https://pipilot.dev/api/v1/databases/${DATABASE_ID}/tables/${TABLE_ID}/records`,
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      const usersDiv = document.getElementById('users');

      data.records.forEach(record => {
        const div = document.createElement('div');
        div.textContent = `${record.data_json.name} - ${record.data_json.email}`;
        usersDiv.appendChild(div);
      });
    }

    fetchUsers();
  </script>
</body>
</html>
```

---

## Python Example

```python
import requests
import os

API_KEY = os.getenv('PIPILOT_API_KEY')
DATABASE_ID = 'YOUR_DATABASE_ID'
TABLE_ID = 'YOUR_TABLE_ID'
BASE_URL = 'https://pipilot.dev/api/v1'

def get_records():
    response = requests.get(
        f'{BASE_URL}/databases/{DATABASE_ID}/tables/{TABLE_ID}/records',
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        }
    )
    return response.json()

def create_record(data):
    response = requests.post(
        f'{BASE_URL}/databases/{DATABASE_ID}/tables/{TABLE_ID}/records',
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        },
        json={'data': data}
    )
    return response.json()

# Usage
records = get_records()
print(records)

new_user = create_record({
    'name': 'John Doe',
    'email': 'john@example.com'
})
print(new_user)
```

---

## 🔒 Security Best Practices

### ✅ DO:
- Store API keys in environment variables
- Use server-side API routes to proxy requests
- Rotate keys periodically
- Revoke compromised keys immediately
- Use different keys for dev/staging/production

### ❌ DON'T:
- Commit API keys to Git
- Expose keys in client-side code
- Share keys publicly
- Use the same key across multiple apps

---

## 📊 Rate Limits

- **Default**: 1000 requests per hour
- **Headers**: Check `X-RateLimit-Remaining` header
- **On Exceeded**: Returns `429 Too Many Requests`

---

## 🆘 Troubleshooting

### Error: "Invalid API key"
- Check key format: Must start with `sk_live_`
- Verify key hasn't been revoked
- Ensure you're using the correct database ID

### Error: "Rate limit exceeded"
- Wait 1 hour or contact support to increase limit
- Implement caching to reduce requests

### Error: "Table not found"
- Verify database ID and table ID in URL
- Check table exists in pipilot.dev dashboard

---

## 💡 Tips

1. **Cache responses**: Don't fetch same data repeatedly
2. **Batch operations**: Create multiple records in a loop efficiently
3. **Error handling**: Always handle API errors gracefully
4. **Monitoring**: Track your API usage in the pipilot.dev dashboard

---

## 🎉 You're All Set!

Your external apps can now interact with your pipilot.dev databases! 🚀
