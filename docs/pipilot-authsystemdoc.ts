`# Pipilot Authentication Setup Guide

## Overview
This guide provides a step-by-step walkthrough for implementing authentication in your Next.js or Vite/React projects using Pipilot's database and auth endpoints. Follow these exact steps to replicate the working auth setup.

**Framework Options:**
- **Next.js**: Use API routes to proxy auth requests (recommended for security)
- **Vite/React**: Make direct API calls to Pipilot (client-side implementation)

## Prerequisites
- Next.js project with App Router or Vite/React project
- Pipilot account with database access
- Valid API key from Pipilot

## Step 1: Environment Setup
1. Create a \`.env.local\` file in your project root (if it doesn't exist).
2. Add your Pipilot API key to the file:
   \`\`\`
   PIPILOT_API_KEY=sk_live_your_api_key_here
   \`\`\`
3. Note your database ID (e.g., \`15\`).

## Step 2: Database Configuration
Create or update \`src/lib/database.ts\` with the following exports:

\`\`\`typescript
export const API_KEY = process.env.PIPILOT_API_KEY;
export const DATABASE_ID = '15'; // Replace with your actual database ID
\`\`\`

This file serves as the central configuration for your database connections.

## Next.js Implementation: Create Auth API Routes
Create the following API route files in \`src/app/api/auth/\`. Each route proxies requests to Pipilot's auth endpoints.

**Skip this section if using Vite/React - proceed to Vite/React Implementation below.**

### Signup Route: \`src/app/api/auth/signup/route.ts\`
\`\`\`typescript
import { NextRequest, NextResponse } from 'next/server';
import { API_KEY, DATABASE_ID } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name } = await request.json();

    const response = await fetch(\`https://pipilot.dev/api/v1/databases/\${DATABASE_ID}/auth/signup\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        full_name
      })
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
\`\`\`

### Login Route: \`src/app/api/auth/login/route.ts\`
\`\`\`typescript
import { NextRequest, NextResponse } from 'next/server';
import { API_KEY, DATABASE_ID } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const response = await fetch(\`https://pipilot.dev/api/v1/databases/\${DATABASE_ID}/auth/login\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
\`\`\`

### Verify Route: \`src/app/api/auth/verify/route.ts\`
\`\`\`typescript
import { NextRequest, NextResponse } from 'next/server';
import { API_KEY, DATABASE_ID } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    const response = await fetch(\`https://pipilot.dev/api/v1/databases/\${DATABASE_ID}/auth/verify\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token
      })
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
\`\`\`

### Refresh Route: \`src/app/api/auth/refresh/route.ts\`
\`\`\`typescript
import { NextRequest, NextResponse } from 'next/server';
import { API_KEY, DATABASE_ID } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json();

    const response = await fetch(\`https://pipilot.dev/api/v1/databases/\${DATABASE_ID}/auth/refresh\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refresh_token
      })
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 });
  }
}
\`\`\`

## Vite/React Implementation: Direct API Calls

**⚠️ Security Note:** This client-side approach exposes your API key in the browser. For production apps, consider using a backend proxy or serverless functions.

For Vite/React projects, make direct API calls to Pipilot from your components. Update your \`src/lib/database.ts\`:

\`\`\`typescript
// For Vite, use VITE_ prefix to expose env vars to client
export const API_KEY = import.meta.env.VITE_PIPILOT_API_KEY;
export const DATABASE_ID = '15'; // Replace with your actual database ID
\`\`\`

And update your \`.env.local\`:
\`\`\`
VITE_PIPILOT_API_KEY=sk_live_your_api_key_here
\`\`\`

**Skip API routes creation - proceed to Step 4 below.**

## Step 4: Frontend Integration
Integrate authentication into your React components using an AuthContext. Create or update \`src/components/AuthContext.tsx\`:

**For Vite/React:** Update the \`verifyToken\`, \`login\`, and \`signup\` functions to call Pipilot directly instead of \`/api/auth/\` endpoints. Replace with:
\`\`\`typescript
    const baseUrl = \`\${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth\`;

const verifyToken = async (token: string) => {
  try {
    const response = await fetch(\`\${baseUrl}/verify\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });
    // ... rest of the function
  } catch (error) {
    // ...
  }
};

const login = async (email: string, password: string) => {
  const response = await fetch(\`\${baseUrl}/login\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  // ... rest of the function
};

const signup = async (email: string, password: string, fullName: string) => {
  const response = await fetch(\`\${baseUrl}/signup\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password, full_name: fullName })
  });
  // ... rest of the function
};
\`\`\`

**For Next.js:** Use the code below as-is (calls your local API routes).

\`\`\`typescript
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on app load
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      setUser(data.user);
    } else {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }
  };

  const signup = async (email: string, password: string, fullName: string) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      setUser(data.user);
    } else {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
\`\`\`

**App Wrapping:**
- **For Next.js:** Wrap your app with the AuthProvider in \`src/app/layout.tsx\`:
  \`\`\`typescript
  import { AuthProvider } from '@/components/AuthContext';

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <body>
          <AuthProvider>
            {children}
          </AuthProvider>
        </body>
      </html>
    );
  }
  \`\`\`

- **For Vite/React:** Wrap your app in \`src/main.tsx\` or \`src/App.tsx\`:
  \`\`\`typescript
  import React from 'react';
  import ReactDOM from 'react-dom/client';
  import App from './App';
  import { AuthProvider } from './components/AuthContext';

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>,
  );
  \`\`\`

## Step 5: Testing the Setup
Use this test script to verify your auth implementation works correctly:

\`\`\`javascript
// Test script for Pipilot authentication system
async function testPipilotAuth() {
  const API_KEY = 'your_api_key_here'; // From .env.local
  const DATABASE_ID = '15'; // Your database ID

  // Test credentials
  let testEmail = '';
  const testPassword = 'TestPass123';

  try {
    console.log('Testing Pipilot Authentication System...\n');

    console.log('1. Testing user signup...');
    // Test 1: User signup
    testEmail = \`test\${Date.now()}@example.com\`;
    const signupResponse = await fetch(\`https://pipilot.dev/api/v1/databases/\${DATABASE_ID}/auth/signup\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        full_name: 'Test User'
      })
    });

    let signupData = null;
    if (signupResponse.ok) {
      signupData = await signupResponse.json();
      console.log('✅ Signup successful:', JSON.stringify(signupData, null, 2));
    } else {
      const errorData = await signupResponse.json();
      console.log(\`❌ Signup failed: \${signupResponse.status} \${signupResponse.statusText}\`, JSON.stringify(errorData, null, 2));
      return; // Exit if signup fails
    }

    console.log('\n2. Testing user login...');
    // Test 2: User login
    const loginResponse = await fetch(\`https://pipilot.dev/api/v1/databases/\${DATABASE_ID}/auth/login\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful:', JSON.stringify(loginData, null, 2));
    } else {
      const errorData = await loginResponse.json();
      console.log(\`❌ Login failed: \${loginResponse.status} \${loginResponse.statusText}\`, JSON.stringify(errorData, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testPipilotAuth();
\`\`\`

## Troubleshooting
- **"Invalid API key format"**: Ensure your API key starts with \`sk_live_\` and is correctly set in \`.env.local\`
- **Environment variables not loading**: Restart your dev server after adding \`.env.local\`
- **Database connection issues**: Verify your \`DATABASE_ID\` matches your Pipilot database
- **Route errors**: Ensure all route files are created with the exact paths and code provided

## Next Steps
- Implement protected routes using the \`useAuth\` hook
- Add token refresh logic for long-running sessions
- Create user profile management features
- Add logout functionality to your UI

This setup provides a complete, production-ready authentication system for your Next.js or Vite/React projects using Pipilot's backend services.
**Built with ❤️ by the pipilot.dev team**`