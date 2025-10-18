# 🚀 Supabase AI Integration Guide

## 🔐 Authentication and Project Management Workflow for AI Coding Agent

### Overview
This guide outlines a comprehensive approach to integrating Supabase with an AI coding agent, enabling secure authentication, project selection, and database interaction.

### 1. Authentication Flow
#### User Authentication
```typescript
import { createClient } from '@supabase/supabase-js'
import { storageManager } from '@/lib/storage-manager'

async function authenticateWithSupabase() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Initiate OAuth or email/password login
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`
      }
    })

    if (error) throw error

    // After successful authentication
    const session = await supabase.auth.getSession()
    
    // Store authentication details securely
    await storageManager.init()
    await storageManager.createToken({
      userId: session.user.id,
      provider: 'supabase',
      token: session.access_token
    })

    return session
  } catch (error) {
    console.error('Authentication failed:', error)
    throw error
  }
}
```

### 2. Project Management
#### List and Select Supabase Projects
```typescript
import { SupabaseManagementAPI } from '@dyad-sh/supabase-management-js'

async function listSupabaseProjects(accessToken: string) {
  const client = new SupabaseManagementAPI({ accessToken })

  try {
    // Fetch user's Supabase projects
    const projects = await client.getProjects()
    
    return projects.map(project => ({
      id: project.id,
      name: project.name,
      organizationId: project.organization_id
    }))
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    throw error
  }
}

async function connectToProject(projectId: string, accessToken: string) {
  const client = new SupabaseManagementAPI({ accessToken })

  try {
    // Fetch specific project details
    const projectDetails = await client.getProject(projectId)
    
    // Store project connection details
    await storageManager.createProjectConnection({
      projectId: projectDetails.id,
      name: projectDetails.name,
      connectionDetails: {
        url: projectDetails.database_url,
        anonKey: projectDetails.anon_key
      }
    })

    return projectDetails
  } catch (error) {
    console.error('Project connection failed:', error)
    throw error
  }
}
```

### 3. Database Interaction
#### Secure Database Queries
```typescript
import { createClient } from '@supabase/supabase-js'

async function runDatabaseQuery(projectId: string, query: string) {
  // Retrieve project connection details
  const projectConnection = await storageManager.getProjectConnection(projectId)
  
  // Create Supabase client with service role for admin operations
  const supabase = createClient(
    projectConnection.url, 
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    // Execute raw SQL query (use with caution)
    const { data, error } = await supabase.rpc('execute_sql', { sql: query })
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Query execution failed:', error)
    throw error
  }
}
```

### 4. Security Considerations
- 🔒 Always use environment variables for sensitive keys
- 🛡️ Implement strict access controls
- 🔄 Rotate access tokens periodically
- 🚫 Never expose service role keys client-side

### 5. Error Handling
```typescript
import { isSupabaseError } from '@dyad-sh/supabase-management-js'

function handleSupabaseError(error: unknown) {
  if (isSupabaseError(error)) {
    // Log Supabase-specific errors
    console.error(`Supabase Error: ${error.message}`)
  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', error)
  }
}
```

### 6. Recommended Workflow
1. Authenticate user
2. Retrieve Supabase projects
3. Select and connect to a specific project
4. Perform database operations with proper authorization
5. Log and monitor all administrative actions

### 7. Additional Tools
- **Admin SDK:** `@dyad-sh/supabase-management-js`
- **Client Library:** `@supabase/supabase-js`
- **Storage Management:** Custom `storageManager`

### 📚 Best Practices
- Use TypeScript for type safety
- Implement comprehensive error handling
- Secure token storage
- Minimal privilege principle

### 🚨 Warnings
- Avoid running arbitrary SQL queries without validation
- Implement strict input sanitization
- Use prepared statements to prevent SQL injection

### 🔍 Debugging
- Enable verbose logging
- Use try-catch blocks
- Implement comprehensive error tracking

---

## 🛠 Example Integration Scenario

```typescript
async function aiCodingAgentWorkflow() {
  try {
    // 1. Authenticate
    const session = await authenticateWithSupabase()
    
    // 2. List projects
    const projects = await listSupabaseProjects(session.access_token)
    
    // 3. Select a project (could be user-selected or AI-determined)
    const selectedProject = projects[0]
    
    // 4. Connect to the project
    const projectConnection = await connectToProject(
      selectedProject.id, 
      session.access_token
    )
    
    // 5. Perform database operations
    const queryResults = await runDatabaseQuery(
      projectConnection.id, 
      'SELECT * FROM users LIMIT 10'
    )
    
    return queryResults
  } catch (error) {
    handleSupabaseError(error)
  }
}
```

## 📦 Required Dependencies
- `@supabase/supabase-js`
- `@dyad-sh/supabase-management-js`
- Custom storage management library

## 🔗 Useful Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Management API Reference](https://supabase.com/docs/reference/api)
