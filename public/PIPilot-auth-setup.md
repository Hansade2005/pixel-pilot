# PiPilot Authentication Guide

This guide provides comprehensive documentation for implementing authentication in your PiPilot applications. The PiPilot authentication system provides secure user management with JWT tokens, automatic token refresh, and seamless integration with your database.

## Overview

PiPilot authentication uses a secure JWT-based system with the following features:
- User registration and login
- Automatic token refresh
- Token verification
- Secure password hashing
- Rate limiting protection
## Base URL

https://pipilot.dev

## API Endpoints

All authentication endpoints are available under `/api/v1/databases/{databaseId}/auth/`

## Authentication Methods

### 1. User Registration (Signup)

Register a new user account in your PiPilot database.

**Endpoint:** `POST /api/v1/databases/{databaseId}/auth/signup`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "John Doe",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

**Response (Success - 201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg",
    "created_at": "2025-12-30T12:00:00.000Z",
    "updated_at": "2025-12-30T12:00:00.000Z"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400,
    "token_type": "Bearer"
  }
}
```

**Response (Error - 400/409/500):**
```json
{
  "error": "User with this email already exists"
}
```

### 2. User Login

Authenticate an existing user and receive JWT tokens.

**Endpoint:** `POST /api/v1/databases/{databaseId}/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (Success - 200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg",
    "created_at": "2025-12-30T12:00:00.000Z",
    "updated_at": "2025-12-30T12:00:00.000Z",
    "last_login": "2025-12-30T12:30:00.000Z"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400,
    "token_type": "Bearer"
  }
}
```

**Response (Error - 401/500):**
```json
{
  "error": "Invalid email or password"
}
```

### 3. Token Verification

Verify the validity of an access token and retrieve user information.

**Endpoint:** `POST /api/v1/databases/{databaseId}/auth/verify`

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Success - 200):**
```json
{
  "valid": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg",
    "created_at": "2025-12-30T12:00:00.000Z",
    "updated_at": "2025-12-30T12:00:00.000Z",
    "last_login": "2025-12-30T12:30:00.000Z"
  },
  "payload": {
    "userId": "user-id",
    "email": "user@example.com",
    "databaseId": "database-id",
    "iat": 1735560000,
    "exp": 1735646400
  }
}
```

**Response (Error - 401/404):**
```json
{
  "error": "Invalid or expired token"
}
```

### 4. Token Refresh

Refresh an expired access token using a valid refresh token.

**Endpoint:** `POST /api/v1/databases/{databaseId}/auth/refresh`

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Success - 200):**
```json
{
  "message": "Token refreshed successfully",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg",
    "created_at": "2025-12-30T12:00:00.000Z",
    "updated_at": "2025-12-30T12:00:00.000Z",
    "last_login": "2025-12-30T12:30:00.000Z"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400,
    "token_type": "Bearer"
  }
}
```

**Response (Error - 401/404):**
```json
{
  "error": "Invalid or expired refresh token"
}
```

## Implementation Examples

### Basic Authentication Service

```typescript
class PipilotAuthService {
  private apiBase = 'https://pipilot.dev/api/v1/databases';
  private databaseId = process.env.NEXT_PUBLIC_PIPILOT_DATABASE_ID!;
  private apiKey = process.env.PIPILOT_API_KEY!;

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async signup(email: string, password: string, fullName: string) {
    const response = await fetch(`${this.apiBase}/${this.databaseId}/auth/signup`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        email,
        password,
        full_name: fullName
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }

    return await response.json();
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.apiBase}/${this.databaseId}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    this.storeTokens(data.tokens);
    return data;
  }

  async verifyToken(token: string) {
    const response = await fetch(`${this.apiBase}/${this.databaseId}/auth/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  }

  async refreshToken(refreshToken: string) {
    const response = await fetch(`${this.apiBase}/${this.databaseId}/auth/refresh`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Token refresh failed');
    }

    const data = await response.json();
    this.storeTokens(data.tokens);
    return data;
  }

  private storeTokens(tokens: any) {
    localStorage.setItem('pipilot_access_token', tokens.access_token);
    localStorage.setItem('pipilot_refresh_token', tokens.refresh_token);
  }

  private retrieveTokens() {
    return {
      accessToken: localStorage.getItem('pipilot_access_token'),
      refreshToken: localStorage.getItem('pipilot_refresh_token')
    };
  }

  logout() {
    localStorage.removeItem('pipilot_access_token');
    localStorage.removeItem('pipilot_refresh_token');
  }
}
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const { accessToken } = getStoredTokens();

    if (accessToken) {
      try {
        const result = await pipilotAuth.verifyToken(accessToken);
        if (result?.valid) {
          setUser(result.user);
        } else {
          // Try refresh
          await refreshAuth();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    }

    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    const result = await pipilotAuth.login(email, password);
    setUser(result.user);
    return result;
  };

  const signup = async (email: string, password: string, fullName: string) => {
    const result = await pipilotAuth.signup(email, password, fullName);
    setUser(result.user);
    return result;
  };

  const logout = () => {
    pipilotAuth.logout();
    setUser(null);
  };

  const refreshAuth = async () => {
    const { refreshToken } = getStoredTokens();
    if (refreshToken) {
      try {
        const result = await pipilotAuth.refreshToken(refreshToken);
        setUser(result.user);
        return result;
      } catch (error) {
        logout();
        throw error;
      }
    }
  };

  return {
    user,
    loading,
    login,
    signup,
    logout,
    refreshAuth
  };
}
```

## Security Best Practices

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Token Management
- Store tokens securely (localStorage for web, secure storage for mobile)
- Never expose tokens in client-side logs
- Implement automatic token refresh
- Clear tokens on logout

### Rate Limiting
- Authentication endpoints are rate-limited
- Failed login attempts are tracked
- Implement exponential backoff for retries

## Error Handling

All authentication methods may return the following errors:

- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Invalid credentials or token
- **409 Conflict**: User already exists (signup)
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

Always wrap authentication calls in try-catch blocks and handle errors appropriately in your UI.

## Environment Variables

Required environment variables for authentication:

```bash
NEXT_PUBLIC_PIPILOT_DATABASE_ID=your-database-id
PIPILOT_API_KEY=your-api-key
```

## TypeScript Types

```typescript
interface PipilotUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

interface PipilotTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface PipilotAuthResponse {
  message: string;
  user: PipilotUser;
  tokens: PipilotTokens;
}

interface PipilotVerifyResponse {
  valid: boolean;
  user: PipilotUser;
  payload: {
    userId: string;
    email: string;
    databaseId: string;
    iat: number;
    exp: number;
  };
}
``` 
```