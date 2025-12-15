# 🔧 Fix Supabase CORS Errors

## The Problem
Your app is getting CORS errors when trying to connect to Supabase from `pipilot.dev`:
```
Access to fetch at 'https://lzuknbfbvpuscpammwzg.supabase.co/auth/v1/token' 
from origin 'https://pipilot.dev' has been blocked by CORS policy
```

## The Solution

### Step 1: Add Your Domain to Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `lzuknbfbvpuscpammwzg`
3. Click **Settings** (gear icon in left sidebar)
4. Click **API**
5. Scroll to **API Settings** section
6. Find **Site URL** field - set it to: `https://pipilot.dev`
7. Find **Additional redirect URLs** - add:
   ```
   https://pipilot.dev
   https://pipilot.dev/auth/callback
   https://www.pipilot.dev
   https://app.pipilot.dev
   https://*.pipilot.dev
   ```
8. Click **Save**

### Step 2: Check Authentication Settings

1. In Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL**: `https://pipilot.dev`
3. Add **Redirect URLs**:
   ```
   https://pipilot.dev/**
   https://*.pipilot.dev/**
   http://localhost:3000/**
   ```

### Step 3: Verify CORS Settings

1. Go to **Settings** → **API**
2. Under **CORS origins**, ensure these are listed:
   - `https://pipilot.dev`
   - `https://*.pipilot.dev` (for subdomains)
   - `http://localhost:3000` (for local dev)

## Alternative: Use Next.js API Route Proxy

If you can't access Supabase dashboard, you can proxy Supabase requests through your API routes (already handled by middleware).

## Verify the Fix

After adding domains, test with:
```javascript
// In browser console
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://lzuknbfbvpuscpammwzg.supabase.co',
  'your-anon-key'
);
await supabase.auth.getSession();
```

## Changes Made to Your Code

✅ Updated middleware to:
- Add CORS headers to all routes (not just protected ones)
- Skip auth checks for `/api/*` routes
- Optimize performance while maintaining CORS

✅ Updated Supabase client (`lib/supabase/client.ts`) to:
- Use PKCE auth flow
- Enable session detection
- Add custom headers

## Still Getting Errors?

If errors persist, the issue is **Supabase dashboard configuration**. You MUST add your domain there.

**Common mistake**: Forgetting to add the wildcard subdomain `*.pipilot.dev` for multi-tenant routing.
