# PiPilot API Reference

## Comprehensive API Documentation for PiPilot Platform

**Date:** September 7, 2025  
**Author:** Anye Happiness Ade  
**Version:** 1.0.0

This document provides comprehensive API reference for PiPilot's backend services, AI agent system, and integration endpoints. All APIs follow RESTful conventions and return JSON responses.

## Authentication

### OAuth 2.0 Flow
**Base URL**: `https://dev.pixelways.co/api`

**Authentication Methods**:
- GitHub OAuth for user authentication
- API tokens for service-to-service communication
- Session-based authentication for web clients

### Headers
```http
Authorization: Bearer <token>
Content-Type: application/json
X-API-Version: 1.0.0
```

---

## AI Agent API

### POST `/api/ai-agent`
Execute AI development operations with full project context.

**Request Body**:
```json
{
  "operation": "process|generate-code|edit-file",
  "prompt": "string",
  "projectId": "string",
  "context": {
    "files": ["array of file paths"],
    "technologies": ["array of tech stack"],
    "requirements": "string",
    "constraints": "object"
  },
  "options": {
    "mode": "plan|build",
    "streaming": true,
    "validation": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "operation": "process",
  "result": {
    "plan": {
      "steps": ["array of implementation steps"],
      "files": ["array of affected files"],
      "dependencies": ["array of packages"],
      "estimatedTime": "string"
    },
    "execution": {
      "status": "completed|pending|failed",
      "filesCreated": ["array"],
      "filesModified": ["array"],
      "errors": ["array"]
    }
  },
  "metadata": {
    "tokensUsed": 1500,
    "processingTime": 2500,
    "model": "codestral"
  }
}
```

**Error Responses**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR|PROCESSING_ERROR|AUTH_ERROR",
    "message": "Human readable error message",
    "details": "Additional error context"
  }
}
```

### GET `/api/ai-agent/models`
Retrieve available AI models and their capabilities.

**Response**:
```json
{
  "models": [
    {
      "id": "codestral",
      "name": "Codestral",
      "provider": "Mistral AI",
      "capabilities": ["code-generation", "debugging", "refactoring"],
      "contextWindow": 32000,
      "pricing": {
        "input": 0.0001,
        "output": 0.0003
      }
    }
  ]
}
```

---

## Chat API

### POST `/api/chat`
Send messages to the AI chat system with project context.

**Request Body**:
```json
{
  "message": "string",
  "projectId": "string",
  "model": "codestral",
  "context": {
    "files": ["current open files"],
    "projectStructure": "object",
    "conversationHistory": ["previous messages"]
  },
  "streaming": true
}
```

**Streaming Response**:
```json
{
  "type": "chunk",
  "content": "partial response text",
  "metadata": {
    "finishReason": null
  }
}
```

**Final Response**:
```json
{
  "type": "complete",
  "content": "full response text",
  "metadata": {
    "tokensUsed": 500,
    "model": "codestral",
    "processingTime": 1200
  }
}
```

---

## Preview System API

### POST `/api/preview`
Create and manage E2B sandbox environments for live previews.

**Request Body**:
```json
{
  "projectId": "string",
  "action": "create|stop|restart|cleanup",
  "configuration": {
    "nodeVersion": "18",
    "packageManager": "pnpm",
    "environment": "development",
    "ports": [3000, 5173]
  }
}
```

**Response**:
```json
{
  "success": true,
  "sandbox": {
    "id": "sandbox_123",
    "url": "https://preview.pixelpilot.dev/sandbox_123",
    "status": "running",
    "processId": "process_456",
    "configuration": {
      "nodeVersion": "18",
      "ports": [3000],
      "environment": "development"
    }
  },
  "logs": ["Server started on port 3000"]
}
```

### GET `/api/preview/{sandboxId}/status`
Check sandbox status and health.

**Response**:
```json
{
  "id": "sandbox_123",
  "status": "running|stopped|error",
  "url": "https://preview.pixelpilot.dev/sandbox_123",
  "uptime": 3600,
  "resourceUsage": {
    "cpu": 45,
    "memory": 256,
    "disk": 512
  },
  "processes": [
    {
      "pid": 1234,
      "command": "npm run dev",
      "status": "running",
      "ports": [3000]
    }
  ]
}
```

---

## Deployment API

### POST `/api/deploy/github`
Deploy project to GitHub repository.

**Request Body**:
```json
{
  "projectId": "string",
  "repository": {
    "name": "my-awesome-app",
    "description": "Project description",
    "private": false,
    "template": "react-vite"
  },
  "commit": {
    "message": "Initial deployment",
    "author": {
      "name": "Developer Name",
      "email": "developer@example.com"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "deployment": {
    "repository": {
      "name": "my-awesome-app",
      "url": "https://github.com/username/my-awesome-app",
      "cloneUrl": "https://github.com/username/my-awesome-app.git"
    },
    "commit": {
      "sha": "abc123def456",
      "message": "Initial deployment",
      "url": "https://github.com/username/my-awesome-app/commit/abc123def456"
    },
    "files": {
      "uploaded": 15,
      "skipped": 2,
      "errors": 0
    }
  }
}
```

### POST `/api/deploy/vercel`
Deploy project to Vercel platform.

**Request Body**:
```json
{
  "projectId": "string",
  "configuration": {
    "name": "my-awesome-app",
    "framework": "nextjs",
    "buildCommand": "npm run build",
    "outputDirectory": ".next",
    "environmentVariables": {
      "NODE_ENV": "production",
      "DATABASE_URL": "postgresql://..."
    },
    "regions": ["iad1", "fra1"]
  },
  "github": {
    "repository": "username/my-awesome-app",
    "branch": "main"
  }
}
```

**Response**:
```json
{
  "success": true,
  "deployment": {
    "id": "deployment_789",
    "url": "https://my-awesome-app.vercel.app",
    "status": "building",
    "createdAt": "2025-09-07T10:30:00Z",
    "build": {
      "command": "npm run build",
      "outputDirectory": ".next"
    },
    "environment": {
      "NODE_ENV": "production",
      "framework": "nextjs"
    }
  },
  "logs": {
    "url": "https://vercel.com/username/my-awesome-app/build_123/logs"
  }
}
```

---

## Project Management API

### GET `/api/workspaces`
Retrieve user's workspaces and projects.

**Query Parameters**:
- `limit`: Number of results (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)
- `sort`: Sort field (default: "updated_at")
- `order`: Sort order ("asc" or "desc", default: "desc")
- `search`: Search query for filtering

**Response**:
```json
{
  "workspaces": [
    {
      "id": "workspace_123",
      "name": "My Awesome App",
      "description": "A task management application",
      "slug": "my-awesome-app",
      "userId": "user_456",
      "isPublic": false,
      "isTemplate": false,
      "deploymentStatus": "deployed",
      "githubRepoUrl": "https://github.com/username/my-awesome-app",
      "vercelDeploymentUrl": "https://my-awesome-app.vercel.app",
      "createdAt": "2025-09-01T09:00:00Z",
      "updatedAt": "2025-09-07T10:30:00Z",
      "lastActivity": "2025-09-07T10:30:00Z",
      "fileCount": 15,
      "totalSize": 2048000
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### POST `/api/workspaces`
Create a new workspace.

**Request Body**:
```json
{
  "name": "New Project",
  "description": "Project description",
  "isPublic": false,
  "template": "react-vite",
  "configuration": {
    "nodeVersion": "18",
    "packageManager": "pnpm",
    "typescript": true,
    "tailwind": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "workspace": {
    "id": "workspace_789",
    "name": "New Project",
    "slug": "new-project",
    "template": "react-vite",
    "files": [
      {
        "name": "package.json",
        "path": "/package.json",
        "content": "...",
        "size": 1024
      }
    ],
    "createdAt": "2025-09-07T11:00:00Z"
  }
}
```

---

## File Management API

### GET `/api/workspaces/{workspaceId}/files`
Retrieve workspace file structure and contents.

**Query Parameters**:
- `path`: Directory path (default: "/")
- `recursive`: Include subdirectories (default: false)
- `includeContent`: Include file contents (default: false)
- `maxSize`: Maximum file size to include content (default: 100KB)

**Response**:
```json
{
  "files": [
    {
      "name": "src",
      "path": "/src",
      "type": "directory",
      "size": 0,
      "isDirectory": true,
      "lastModified": "2025-09-07T10:00:00Z",
      "children": [
        {
          "name": "App.tsx",
          "path": "/src/App.tsx",
          "type": "typescript",
          "size": 2048,
          "isDirectory": false,
          "lastModified": "2025-09-07T10:30:00Z",
          "content": "import React from 'react';\n\nfunction App() {\n  return (\n    <div className=\"App\">\n      <h1>Hello World</h1>\n    </div>\n  );\n}\n\nexport default App;"
        }
      ]
    }
  ]
}
```

### PUT `/api/workspaces/{workspaceId}/files`
Update or create files in the workspace.

**Request Body**:
```json
{
  "files": [
    {
      "path": "/src/App.tsx",
      "content": "import React from 'react';\n\nfunction App() {\n  return (\n    <div className=\"App\">\n      <h1>Updated Hello World</h1>\n    </div>\n  );\n}\n\nexport default App;",
      "encoding": "utf-8"
    }
  ],
  "commit": {
    "message": "Update App component",
    "author": {
      "name": "Developer Name",
      "email": "developer@example.com"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "files": [
    {
      "path": "/src/App.tsx",
      "size": 2150,
      "lastModified": "2025-09-07T11:00:00Z",
      "hash": "abc123def456"
    }
  ],
  "commit": {
    "message": "Update App component",
    "hash": "commit_789"
  }
}
```

---

## Authentication API

### POST `/api/auth/github`
Initiate GitHub OAuth authentication.

**Response**:
```json
{
  "authUrl": "https://github.com/login/oauth/authorize?client_id=...&redirect_uri=...",
  "state": "random_state_string"
}
```

### POST `/api/auth/github/callback`
Handle GitHub OAuth callback.

**Request Body**:
```json
{
  "code": "github_authorization_code",
  "state": "state_from_initial_request"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "User Name",
    "avatar": "https://avatars.githubusercontent.com/u/12345",
    "githubUsername": "username"
  },
  "tokens": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "expiresIn": 3600
  }
}
```

---

## Webhook Endpoints

### POST `/api/webhooks/github`
Handle GitHub repository events.

**Headers**:
```http
X-GitHub-Event: push|pull_request|release
X-GitHub-Delivery: unique_delivery_id
X-Hub-Signature-256: sha256=signature
```

**Request Body** (Push Event)**:
```json
{
  "ref": "refs/heads/main",
  "before": "abc123",
  "after": "def456",
  "repository": {
    "name": "my-awesome-app",
    "full_name": "username/my-awesome-app"
  },
  "commits": [
    {
      "id": "def456",
      "message": "Update component",
      "author": {
        "name": "Developer",
        "email": "dev@example.com"
      }
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "processed": true,
  "actions": [
    "Updated workspace files",
    "Triggered deployment"
  ]
}
```

---

## Rate Limiting

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1631049600
X-RateLimit-Retry-After: 60
```

### Rate Limit Categories
- **AI Operations**: 100 requests per minute
- **File Operations**: 500 requests per minute
- **Deployment Operations**: 20 requests per hour
- **Authentication**: 10 requests per minute

### Rate Limit Response
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit exceeded",
    "retryAfter": 60,
    "limit": 1000,
    "remaining": 0,
    "reset": 1631049600
  }
}
```

---

## Error Handling

### Common Error Codes
```typescript
enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',

  // Processing errors
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  TIMEOUT = 'TIMEOUT',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The provided input is invalid",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    },
    "timestamp": "2025-09-07T10:30:00Z",
    "requestId": "req_123456789",
    "documentation": "https://docs.pixelpilot.dev/errors/validation"
  },
  "suggestions": [
    "Check the email format",
    "Ensure all required fields are provided",
    "Review the API documentation for correct usage"
  ]
}
```

---

## SDKs and Libraries

### JavaScript/TypeScript SDK
```typescript
import { PixelPilot } from '@pixelpilot/sdk';

const client = new PixelPilot({
  apiKey: 'your_api_key',
  baseUrl: 'https://dev.pixelways.co/api'
});

// Create a workspace
const workspace = await client.workspaces.create({
  name: 'My Project',
  template: 'react-vite'
});

// Execute AI operation
const result = await client.ai.execute({
  operation: 'generate-code',
  prompt: 'Create a user authentication component',
  projectId: workspace.id
});
```

### Python SDK
```python
from pixelpilot import PixelPilot

client = PixelPilot(
    api_key='your_api_key',
    base_url='https://dev.pixelways.co/api'
)

# Create workspace
workspace = client.workspaces.create(
    name='My Project',
    template='react-vite'
)

# Execute AI operation
result = client.ai.execute(
    operation='generate-code',
    prompt='Create a data visualization dashboard',
    project_id=workspace.id
)
```

---

## Best Practices

### API Usage Guidelines
1. **Use Appropriate HTTP Methods**: GET for retrieval, POST for creation, PUT for updates
2. **Handle Rate Limits**: Implement exponential backoff for retries
3. **Validate Input**: Always validate data before sending requests
4. **Error Handling**: Implement comprehensive error handling
5. **Caching**: Use appropriate caching strategies for better performance
6. **Security**: Never expose API keys in client-side code

### Authentication Best Practices
1. **Secure Token Storage**: Store tokens securely, never in localStorage for production
2. **Token Refresh**: Implement automatic token refresh before expiration
3. **Scope Limitation**: Request minimal required permissions
4. **Session Management**: Implement proper session timeout and cleanup

### Performance Optimization
1. **Request Batching**: Batch multiple operations when possible
2. **Pagination**: Use pagination for large result sets
3. **Compression**: Enable gzip compression for responses
4. **Caching**: Implement appropriate caching strategies
5. **Connection Reuse**: Reuse connections when possible

---

## Changelog

### Version 1.0.0 (September 7, 2025)
- Initial release of comprehensive API documentation
- Full coverage of AI Agent, Chat, Preview, and Deployment APIs
- Authentication and webhook endpoint documentation
- Error handling and rate limiting specifications
- SDK examples for JavaScript/TypeScript and Python

---

*For additional support or questions about the PiPilot API, please contact our developer support team.* 🚀
