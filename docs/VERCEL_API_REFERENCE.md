# 📚 Vercel Deployment API Reference

Complete API reference for all Vercel deployment endpoints in the Vibe Coding Platform.

---

## Base URL

All API endpoints are relative to your application's base URL:

```
https://your-app.com/api/vercel
```

---

## Authentication

All endpoints require a Vercel personal access token passed in the request body or query parameters.

```typescript
// In request body
{
  vercelToken: "your_token_here"
}

// Or as query parameter
?token=your_token_here
```

---

## Table of Contents

1. [Project Management](#project-management)
2. [Deployment Operations](#deployment-operations)
3. [Domain Management](#domain-management)
4. [Environment Variables](#environment-variables)
5. [Build Configuration](#build-configuration)

---

## Project Management

### Create Project and Deploy

**Endpoint:** `POST /api/vercel/deploy`

Creates a new Vercel project with Git integration and triggers initial deployment.

**Request Body:**
```typescript
{
  projectName: string;          // Project name (lowercase, alphanumeric, hyphens)
  framework?: string;           // Framework (auto-detected if omitted)
  token: string;                // Vercel token
  workspaceId: string;         // Your workspace ID
  githubRepo: string;          // Format: "owner/repo"
  githubToken: string;         // GitHub token
  environmentVariables?: Array<{
    key: string;
    value: string;
  }>;
  teamId?: string;             // Vercel team ID (optional)
}
```

**Response (200):**
```typescript
{
  success: true;
  projectId: string;           // ⭐ Store this for future operations
  projectName: string;
  url: string;                 // Production URL
  deploymentId: string;        // Initial deployment ID
  framework?: string;
  status: string;
  metadata: {
    projectId: string;
    projectName: string;
    workspaceId: string;
    githubRepo: string;
    framework?: string;
    productionUrl: string;
    createdAt: number;
    lastDeployedAt: number;
    deploymentCount: number;
    autoDeployEnabled: boolean;
    customDomains: string[];
    environmentVariables: Array<{
      key: string;
      target: string[];
    }>;
  };
}
```

**Error Codes:**
- `INVALID_PROJECT_NAME`: Project name format is invalid
- `PROJECT_NAME_TOO_LONG`: Project name exceeds 52 characters
- `DUPLICATE_PROJECT_NAME`: Project name already exists
- `INVALID_GITHUB_REPO`: GitHub repository format is invalid
- `INVALID_TOKEN`: Vercel token is invalid
- `INSUFFICIENT_PERMISSIONS`: Token lacks required permissions

---

### Get Project Details

**Endpoint:** `GET /api/vercel/projects/{projectId}`

Retrieves project details and configuration.

**Query Parameters:**
- `token` (required): Vercel token
- `teamId` (optional): Team ID

**Response (200):**
```typescript
{
  id: string;
  name: string;
  accountId: string;
  framework?: string;
  link: {
    type: "github";
    repo: string;
    repoId: number;
    gitCredentialId: string;
    sourceless: boolean;
    createdAt: number;
    updatedAt: number;
  } | null;
  productionDeployment?: {
    id: string;
    url: string;
    createdAt: number;
    ready: number;
  };
  targets: object;
  buildCommand?: string;
  devCommand?: string;
  installCommand?: string;
  outputDirectory?: string;
  rootDirectory?: string;
  nodeVersion?: string;
  commandForIgnoringBuildStep?: string;
  sourceFilesOutsideRootDirectory?: boolean;
  autoAssignCustomDomains: boolean;
  createdAt: number;
  updatedAt: number;
  environmentVariablesCount: number;
}
```

**Error Codes:**
- `PROJECT_NOT_FOUND`: Project doesn't exist
- `INVALID_TOKEN`: Invalid Vercel token
- `INSUFFICIENT_PERMISSIONS`: Insufficient permissions

---

### Update Project Settings

**Endpoint:** `PATCH /api/vercel/projects/{projectId}`

Updates project build settings and configuration.

**Request Body:**
```typescript
{
  vercelToken: string;
  teamId?: string;
  settings: {
    buildCommand?: string;
    devCommand?: string;
    installCommand?: string;
    outputDirectory?: string;
    rootDirectory?: string;
    framework?: string;
    nodeVersion?: "18.x" | "20.x" | "22.x";
    commandForIgnoringBuildStep?: string;
    sourceFilesOutsideRootDirectory?: boolean;
  };
}
```

**Response (200):**
```typescript
{
  success: true;
  project: {
    id: string;
    name: string;
    framework?: string;
    buildCommand?: string;
    devCommand?: string;
    installCommand?: string;
    outputDirectory?: string;
    rootDirectory?: string;
    nodeVersion?: string;
    updatedAt: number;
  };
}
```

---

## Deployment Operations

### Trigger Deployment

**Endpoint:** `POST /api/vercel/deployments/trigger`

Triggers a new Git-based deployment for an existing project.

**Request Body:**
```typescript
{
  projectId: string;           // Project ID from creation
  vercelToken: string;
  workspaceId?: string;
  branch?: string;             // Default: "main"
  target?: "production" | "preview"; // Default: "production"
  withLatestCommit?: boolean;  // Default: true
  teamId?: string;
}
```

**Response (200):**
```typescript
{
  success: true;
  deploymentId: string;
  deploymentUrl: string;
  status: "QUEUED" | "BUILDING" | "READY" | "ERROR";
  inspectorUrl: string;        // Vercel dashboard URL
  target: string;
  branch: string;
  createdAt: number;
  projectId: string;
  projectName: string;
}
```

**Error Codes:**
- `PROJECT_NOT_FOUND`: Project doesn't exist
- `NO_GIT_INTEGRATION`: Project not connected to Git
- `INVALID_DEPLOYMENT_CONFIG`: Invalid deployment configuration
- `DEPLOYMENT_FAILED`: Deployment failed to trigger

---

### Get Deployment Status

**Endpoint:** `GET /api/vercel/deployments/{deploymentId}/status`

Gets current deployment status and details.

**Query Parameters:**
- `token` (required): Vercel token
- `teamId` (optional): Team ID

**Response (200):**
```typescript
{
  id: string;
  url: string;
  status: "QUEUED" | "BUILDING" | "READY" | "ERROR" | "CANCELED";
  state: string;
  type: string;
  target: string;
  createdAt: number;
  buildingAt?: number;
  readyAt?: number;
  errorMessage?: string;
  errorCode?: string;
  errorLink?: string;
  source: string;
  buildCommand?: string;
  commit?: {
    sha: string;
    message: string;
    author: string;
    authorUsername: string;
    org: string;
    repo: string;
    ref: string;
  };
  projectId: string;
  name: string;
  inspectorUrl: string;
  regions: string[];
  alias: string[];
  aliasAssigned: boolean;
  checksState?: string;
  checksConclusion?: string;
}
```

**Error Codes:**
- `DEPLOYMENT_NOT_FOUND`: Deployment doesn't exist
- `INVALID_TOKEN`: Invalid Vercel token
- `INSUFFICIENT_PERMISSIONS`: Insufficient permissions

---

### Get Deployment Logs

**Endpoint:** `GET /api/vercel/deployments/{deploymentId}/logs`

Retrieves or streams build logs for a deployment.

**Query Parameters:**
- `token` (required): Vercel token
- `teamId` (optional): Team ID
- `stream` (optional): Enable SSE streaming (default: false)
- `limit` (optional): Number of logs (default: 100)
- `follow` (optional): Keep connection open (default: false)
- `since` (optional): Unix timestamp to start from
- `until` (optional): Unix timestamp to end at

**Response (200) - Non-streaming:**
```typescript
{
  logs: Array<{
    id: string;
    timestamp: number;
    type: "stdout" | "stderr" | "build" | "event";
    message: string;
    payload?: object;
  }>;
  total: number;
  deploymentId: string;
}
```

**Response - Streaming (Server-Sent Events):**
```
data: {"id":"log1","timestamp":1234567890,"type":"stdout","message":"Installing..."}
data: {"id":"log2","timestamp":1234567891,"type":"stdout","message":"Building..."}
```

**Error Codes:**
- `DEPLOYMENT_NOT_FOUND`: Deployment doesn't exist
- `LOGS_FETCH_FAILED`: Failed to fetch logs
- `STREAM_ERROR`: Streaming failed

---

### List Project Deployments

**Endpoint:** `GET /api/vercel/projects/{projectId}/deployments`

Lists all deployments for a project with pagination.

**Query Parameters:**
- `token` (required): Vercel token
- `teamId` (optional): Team ID
- `limit` (optional): Results per page (default: 20)
- `target` (optional): Filter by "production" or "preview"
- `since` (optional): Unix timestamp
- `until` (optional): Unix timestamp

**Response (200):**
```typescript
{
  deployments: Array<{
    id: string;
    url: string;
    name: string;
    status: string;
    state: string;
    type: string;
    target: string;
    createdAt: number;
    buildingAt?: number;
    readyAt?: number;
    commit?: {
      sha: string;
      message: string;
      author: string;
    };
    creator?: {
      uid: string;
      username: string;
    };
    inspectorUrl: string;
  }>;
  pagination: {
    total: number;
    limit: number;
  };
  projectId: string;
}
```

---

### Promote Deployment to Production

**Endpoint:** `POST /api/vercel/projects/{projectId}/promote/{deploymentId}`

Promotes a preview deployment to production without rebuilding.

**Request Body:**
```typescript
{
  vercelToken: string;
  teamId?: string;
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Deployment promoted to production successfully";
  deploymentId: string;
  projectId: string;
  productionUrl: string;
}
```

**Error Codes:**
- `NOT_FOUND`: Deployment or project not found
- `CONFLICT`: Project being transferred or cannot promote
- `PROMOTE_FAILED`: Failed to promote deployment

---

## Domain Management

### Check Domain Availability

**Endpoint:** `POST /api/vercel/domains/check`

Checks if domains are available for purchase and returns pricing.

**Request Body:**
```typescript
{
  domains: string[];          // Max 10 domains
  vercelToken: string;
  teamId?: string;
}
```

**Response (200):**
```typescript
{
  domains: Array<{
    name: string;
    available: boolean;
    price?: number;
    currency?: string;
    period?: number;           // Years
    serviceType?: string;
    verified?: boolean;
  }>;
  timestamp: number;
}
```

**Error Codes:**
- `DOMAIN_CHECK_FAILED`: Failed to check availability
- `RATE_LIMIT_EXCEEDED`: Too many requests

---

### Attach Domain to Project

**Endpoint:** `POST /api/vercel/projects/{projectId}/domains`

Attaches a custom domain to a project.

**Request Body:**
```typescript
{
  domain: string;
  vercelToken: string;
  teamId?: string;
  redirect?: string;           // Optional redirect URL
  redirectStatusCode?: number; // Default: 308
  gitBranch?: string;         // Branch-specific domain
}
```

**Response (200):**
```typescript
{
  success: true;
  domain: string;
  verified: boolean;
  apexName: string;
  projectId: string;
  createdAt: number;
  verification: Array<{
    type: "TXT" | "CNAME" | "A";
    domain: string;
    value: string;
    reason: string;
  }>;
  configuration?: {
    message: string;
    steps: string[];
  };
}
```

**Error Codes:**
- `INVALID_DOMAIN_CONFIG`: Invalid domain configuration
- `DOMAIN_CONFLICT`: Domain already in use
- `DOMAIN_ATTACH_FAILED`: Failed to attach domain

---

### List Project Domains

**Endpoint:** `GET /api/vercel/projects/{projectId}/domains`

Lists all domains attached to a project.

**Query Parameters:**
- `token` (required): Vercel token
- `teamId` (optional): Team ID

**Response (200):**
```typescript
{
  domains: Array<{
    name: string;
    verified: boolean;
    apexName: string;
    gitBranch?: string;
    redirect?: string;
    redirectStatusCode?: number;
    createdAt: number;
    updatedAt: number;
  }>;
  total: number;
  projectId: string;
}
```

---

## Environment Variables

### List Environment Variables

**Endpoint:** `GET /api/vercel/projects/{projectId}/env`

Lists all environment variables for a project (values excluded for security).

**Query Parameters:**
- `token` (required): Vercel token
- `teamId` (optional): Team ID

**Response (200):**
```typescript
{
  envs: Array<{
    id: string;
    key: string;
    type: "plain" | "sensitive" | "encrypted" | "secret";
    target: ("production" | "preview" | "development")[];
    gitBranch?: string;
    configurationId?: string;
    createdAt: number;
    updatedAt: number;
    createdBy?: string;
    updatedBy?: string;
    comment?: string;
    hasValue: boolean;
  }>;
  total: number;
  projectId: string;
}
```

---

### Add Environment Variables

**Endpoint:** `POST /api/vercel/projects/{projectId}/env`

Adds one or more environment variables to a project.

**Request Body:**
```typescript
{
  vercelToken: string;
  teamId?: string;
  upsert?: boolean;            // Update if exists (default: false)
  variables: Array<{
    key: string;
    value: string;
    type?: "plain" | "sensitive" | "encrypted"; // Default: "plain"
    target?: ("production" | "preview" | "development")[]; // Default: all
    gitBranch?: string;
    comment?: string;
  }>;
}
```

**Response (200):**
```typescript
{
  success: boolean;
  created: Array<{
    id: string;
    key: string;
    target: string[];
  }>;
  failed?: Array<{
    key: string;
    error: string;
    status?: number;
  }>;
  summary: {
    total: number;
    created: number;
    failed: number;
  };
}
```

---

### Get Environment Variable

**Endpoint:** `GET /api/vercel/projects/{projectId}/env/{envId}`

Gets a specific environment variable with decrypted value.

**Query Parameters:**
- `token` (required): Vercel token
- `teamId` (optional): Team ID

**Response (200):**
```typescript
{
  id: string;
  key: string;
  value: string;              // Decrypted value
  type: string;
  target: string[];
  gitBranch?: string;
  createdAt: number;
  updatedAt: number;
  // ... other fields
}
```

---

### Update Environment Variable

**Endpoint:** `PATCH /api/vercel/projects/{projectId}/env/{envId}`

Updates an existing environment variable.

**Request Body:**
```typescript
{
  vercelToken: string;
  teamId?: string;
  value?: string;
  target?: string[];
  gitBranch?: string;
  comment?: string;
}
```

**Response (200):**
```typescript
{
  success: true;
  env: {
    id: string;
    key: string;
    type: string;
    target: string[];
    updatedAt: number;
  };
}
```

---

### Delete Environment Variable

**Endpoint:** `DELETE /api/vercel/projects/{projectId}/env/{envId}`

Deletes an environment variable.

**Query Parameters:**
- `token` (required): Vercel token
- `teamId` (optional): Team ID

**Response (200):**
```typescript
{
  success: true;
  message: "Environment variable deleted successfully";
  envId: string;
}
```

---

## Error Response Format

All endpoints return errors in a consistent format:

```typescript
{
  error: string;              // Human-readable error message
  code: string;               // Machine-readable error code
  details?: any;              // Optional additional details
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_TOKEN` | 401 | Vercel token is invalid or expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | Token lacks required permissions |
| `PROJECT_NOT_FOUND` | 404 | Project doesn't exist |
| `DEPLOYMENT_NOT_FOUND` | 404 | Deployment doesn't exist |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `INVALID_PROJECT_NAME` | 400 | Invalid project name format |
| `DUPLICATE_PROJECT_NAME` | 400 | Project name already exists |
| `NO_GIT_INTEGRATION` | 400 | Project not connected to Git |
| `DOMAIN_CONFLICT` | 409 | Domain already in use |

---

## Rate Limits

Vercel API has the following rate limits:

- **Projects API**: 100 requests per minute
- **Deployments API**: 100 requests per minute
- **Domains API**: 50 requests per minute
- **Environment Variables**: 100 requests per minute

Implement exponential backoff when receiving `429` responses.

---

## Best Practices

1. **Store Project IDs**: Always store the `projectId` returned from project creation
2. **Poll Status**: Check deployment status every 5-10 seconds
3. **Use Streaming**: Use streaming logs for real-time feedback
4. **Handle Errors**: Implement proper error handling with retry logic
5. **Secure Tokens**: Never expose tokens in client-side code
6. **Use Environment Variables**: Store sensitive data as environment variables

---

## Support

For issues or questions:
- 📖 **Documentation**: [`/docs/VERCEL_DEPLOYMENT_SYSTEM.md`](./VERCEL_DEPLOYMENT_SYSTEM.md)
- 🚀 **Quick Start**: [`/docs/VERCEL_QUICK_START.md`](./VERCEL_QUICK_START.md)
- 🌐 **Vercel Docs**: [vercel.com/docs/rest-api](https://vercel.com/docs/rest-api)

---

**Last Updated:** November 6, 2025
