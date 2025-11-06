# 🚀 Vercel Deployment API - Quick Start Guide

## Overview

This guide will help you quickly integrate Vercel deployments into your Vibe Coding Platform. We've implemented a complete REST API wrapper around Vercel's API that makes it easy to deploy, manage, and monitor projects.

---

## Prerequisites

Before you begin, you'll need:

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel Token**: Generate a personal access token from [Vercel Dashboard → Settings → Tokens](https://vercel.com/account/tokens)
3. **GitHub Token**: For Git-based deployments, you'll need a GitHub personal access token
4. **GitHub Repository**: Your project must be in a GitHub repository

---

## Quick Start: Deploy Your First Project

### Step 1: Create and Deploy Project

```typescript
// Frontend: Trigger deployment
const deployProject = async () => {
  const response = await fetch('/api/vercel/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectName: 'my-awesome-app',
      githubRepo: 'username/my-repo',
      githubToken: 'ghp_xxxxx',
      token: 'vercel_token_xxxxx',
      workspaceId: 'workspace_123',
      environmentVariables: [
        {
          key: 'API_URL',
          value: 'https://api.example.com',
        },
      ],
    }),
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('✅ Project created!');
    console.log('Project ID:', result.projectId); // ⭐ Store this!
    console.log('URL:', result.url);
    
    // Store projectId for future operations
    localStorage.setItem('vercelProjectId', result.projectId);
  }
};
```

### Step 2: Monitor Deployment

```typescript
// Check deployment status
const checkStatus = async (deploymentId: string) => {
  const response = await fetch(
    `/api/vercel/deployments/${deploymentId}/status?token=${vercelToken}`,
    { method: 'GET' }
  );

  const status = await response.json();
  console.log('Status:', status.status); // BUILDING, READY, ERROR
  console.log('URL:', status.url);
};
```

### Step 3: Stream Build Logs

```typescript
// Stream logs in real-time using EventSource
const streamLogs = (deploymentId: string) => {
  const eventSource = new EventSource(
    `/api/vercel/deployments/${deploymentId}/logs?token=${vercelToken}&stream=true&follow=true`
  );

  eventSource.onmessage = (event) => {
    const log = JSON.parse(event.data);
    console.log(`[${log.type}]`, log.message);
  };

  eventSource.onerror = () => {
    eventSource.close();
  };
};
```

---

## Common Operations

### Redeploy Existing Project

```typescript
const redeploy = async (projectId: string) => {
  const response = await fetch('/api/vercel/deployments/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: projectId,
      vercelToken: vercelToken,
      workspaceId: workspaceId,
      branch: 'main',
      target: 'production',
      withLatestCommit: true,
    }),
  });

  const result = await response.json();
  return result.deploymentId;
};
```

### Add Environment Variables

```typescript
const addEnvVars = async (projectId: string) => {
  const response = await fetch(`/api/vercel/projects/${projectId}/env`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vercelToken: vercelToken,
      variables: [
        {
          key: 'DATABASE_URL',
          value: 'postgresql://...',
          type: 'encrypted',
          target: ['production', 'preview'],
        },
        {
          key: 'DEBUG',
          value: 'true',
          type: 'plain',
          target: ['development'],
        },
      ],
    }),
  });

  const result = await response.json();
  console.log('Created:', result.created);
};
```

### Attach Custom Domain

```typescript
const attachDomain = async (projectId: string, domain: string) => {
  // First, check if domain is available
  const checkResponse = await fetch('/api/vercel/domains/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domains: [domain],
      vercelToken: vercelToken,
    }),
  });

  const { domains } = await checkResponse.json();
  
  if (!domains[0].available) {
    console.log('Domain not available');
    return;
  }

  // Attach domain to project
  const attachResponse = await fetch(`/api/vercel/projects/${projectId}/domains`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain: domain,
      vercelToken: vercelToken,
    }),
  });

  const result = await attachResponse.json();
  
  if (!result.verified) {
    console.log('⚠️ Domain verification required:');
    result.verification.forEach((v: any) => {
      console.log(`Add ${v.type} record: ${v.domain} → ${v.value}`);
    });
  }
};
```

### Get Deployment History

```typescript
const getDeployments = async (projectId: string) => {
  const response = await fetch(
    `/api/vercel/projects/${projectId}/deployments?token=${vercelToken}&limit=10`,
    { method: 'GET' }
  );

  const { deployments } = await response.json();
  
  deployments.forEach((d: any) => {
    console.log(`${d.status} - ${d.url} - ${d.createdAt}`);
  });
};
```

---

## React Component Example

Here's a complete React component for managing Vercel deployments:

```tsx
'use client';

import { useState } from 'react';

export function VercelDeploymentManager() {
  const [projectId, setProjectId] = useState('');
  const [deploymentId, setDeploymentId] = useState('');
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const createProject = async () => {
    const response = await fetch('/api/vercel/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: 'my-app',
        githubRepo: 'user/repo',
        githubToken: process.env.NEXT_PUBLIC_GITHUB_TOKEN,
        token: process.env.NEXT_PUBLIC_VERCEL_TOKEN,
        workspaceId: 'workspace_1',
      }),
    });

    const result = await response.json();
    setProjectId(result.projectId);
    setDeploymentId(result.deploymentId);
  };

  const triggerDeploy = async () => {
    const response = await fetch('/api/vercel/deployments/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: projectId,
        vercelToken: process.env.NEXT_PUBLIC_VERCEL_TOKEN,
        workspaceId: 'workspace_1',
      }),
    });

    const result = await response.json();
    setDeploymentId(result.deploymentId);
    startPolling(result.deploymentId);
  };

  const startPolling = async (depId: string) => {
    const interval = setInterval(async () => {
      const response = await fetch(
        `/api/vercel/deployments/${depId}/status?token=${process.env.NEXT_PUBLIC_VERCEL_TOKEN}`
      );
      
      const data = await response.json();
      setStatus(data.status);

      if (data.status === 'READY' || data.status === 'ERROR') {
        clearInterval(interval);
      }
    }, 5000);
  };

  const streamLogs = () => {
    const eventSource = new EventSource(
      `/api/vercel/deployments/${deploymentId}/logs?token=${process.env.NEXT_PUBLIC_VERCEL_TOKEN}&stream=true&follow=true`
    );

    eventSource.onmessage = (event) => {
      const log = JSON.parse(event.data);
      setLogs((prev) => [...prev, log.message]);
    };
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Vercel Deployment Manager</h2>
      </div>

      <div className="space-y-2">
        <button
          onClick={createProject}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Create Project
        </button>

        {projectId && (
          <button
            onClick={triggerDeploy}
            className="px-4 py-2 bg-green-600 text-white rounded ml-2"
          >
            Redeploy
          </button>
        )}

        {deploymentId && (
          <button
            onClick={streamLogs}
            className="px-4 py-2 bg-purple-600 text-white rounded ml-2"
          >
            Stream Logs
          </button>
        )}
      </div>

      {projectId && (
        <div className="p-4 bg-gray-100 rounded">
          <p className="font-mono text-sm">Project ID: {projectId}</p>
          {deploymentId && <p className="font-mono text-sm">Deployment ID: {deploymentId}</p>}
          {status && <p className="font-bold">Status: {status}</p>}
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Environment Variables

Add these to your `.env.local`:

```bash
# Vercel Configuration
NEXT_PUBLIC_VERCEL_TOKEN=your_vercel_token_here
NEXT_PUBLIC_VERCEL_TEAM_ID=team_xxxxx # Optional, for team accounts

# GitHub Configuration
NEXT_PUBLIC_GITHUB_TOKEN=ghp_xxxxx

# Storage
WORKSPACE_ID=workspace_123
```

---

## Error Handling

All endpoints return consistent error responses:

```typescript
{
  error: string;      // Human-readable error message
  code: string;       // Machine-readable error code
  details?: any;      // Optional additional details
}
```

Common error codes:
- `INVALID_TOKEN`: Token is invalid or expired
- `PROJECT_NOT_FOUND`: Project doesn't exist
- `INSUFFICIENT_PERMISSIONS`: Token lacks required permissions
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `DEPLOYMENT_FAILED`: Deployment encountered an error

---

## Best Practices

### 1. Store Project IDs

Always store the `projectId` returned from project creation:

```typescript
// After creating project
localStorage.setItem(`vercel_project_${workspaceId}`, result.projectId);

// For redeployment
const projectId = localStorage.getItem(`vercel_project_${workspaceId}`);
```

### 2. Use Environment Variables for Secrets

Never hardcode tokens in your frontend:

```typescript
// ❌ Bad
const token = 'vercel_xxxxx';

// ✅ Good
const token = process.env.NEXT_PUBLIC_VERCEL_TOKEN;
```

### 3. Poll Deployment Status

Check deployment status every 5-10 seconds:

```typescript
const pollStatus = async (deploymentId: string) => {
  const maxAttempts = 60; // 5 minutes max
  let attempts = 0;

  const interval = setInterval(async () => {
    attempts++;
    
    const status = await checkDeploymentStatus(deploymentId);
    
    if (status === 'READY' || status === 'ERROR' || attempts >= maxAttempts) {
      clearInterval(interval);
    }
  }, 5000);
};
```

### 4. Handle Rate Limits

Implement exponential backoff for rate limits:

```typescript
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      } else {
        throw error;
      }
    }
  }
};
```

---

## Next Steps

1. ✅ **Deploy your first project** using the examples above
2. 📊 **Build a deployment dashboard** to visualize deployments
3. 🌐 **Add domain management** for custom domains
4. ⚙️ **Implement environment variables UI** for easy configuration
5. 📈 **Track deployment metrics** for analytics

---

## Support & Resources

- **Full Documentation**: [`/docs/VERCEL_DEPLOYMENT_SYSTEM.md`](./VERCEL_DEPLOYMENT_SYSTEM.md)
- **Vercel API Docs**: [vercel.com/docs/rest-api](https://vercel.com/docs/rest-api)
- **GitHub API Docs**: [docs.github.com/rest](https://docs.github.com/rest)

---

**Happy Deploying! 🚀**
