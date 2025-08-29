# GitHub OAuth Setup Guide

## 🔧 Supabase Configuration

### 1. Enable GitHub Provider in Supabase

1. **Go to your Supabase Dashboard**
   - Navigate to: `Authentication` → `Providers` → `GitHub`

2. **Enable GitHub Provider**
   - Toggle `Enable GitHub` to ON
   - Set the following configurations:

### 2. GitHub OAuth App Configuration

1. **Create GitHub OAuth App**
   - Go to: https://github.com/settings/applications/new
   - Fill in the details:

```
Application name: AI App Builder
Homepage URL: https://dev.pixelways.co
Authorization callback URL: https://lzuknbfbvpuscpammwzg.supabase.co/auth/v1/callback
```

2. **Get GitHub OAuth Credentials**
   - After creating the app, note down:
     - `Client ID`
     - `Client Secret`

### 3. Supabase Provider Settings

In your Supabase GitHub provider settings, configure:

```
Client ID: [Your GitHub OAuth App Client ID]
Client Secret: [Your GitHub OAuth App Client Secret]
Redirect URL: https://lzuknbfbvpuscpammwzg.supabase.co/auth/v1/callback
```

### 4. Additional Settings

**Scopes Required:**
```
repo read:user workflow
```

**Site URL in Supabase:**
```
https://dev.pixelways.co
```

**Redirect URLs in Supabase:**
```
https://lzuknbfbvpuscpammwzg.supabase.co/auth/v1/callback
https://dev.pixelways.co/api/auth/github/callback
https://dev.pixelways.co/workspace
```

## 🔑 Environment Variables

Update your production environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# GitHub OAuth (handled by Supabase)
# No additional env vars needed - configured in Supabase dashboard

# Other variables...
CODESTRAL_API_KEY=DXfXAjwNIZcAv1ESKtoDwWZZF98lJxho
E2B_API_KEY=your_e2b_api_key
```

## 🚀 How It Works

### 1. User Authentication Flow
```
User clicks "Continue with GitHub" 
    ↓
GitHub OAuth consent screen
    ↓
GitHub redirects to: https://lzuknbfbvpuscpammwzg.supabase.co/auth/v1/callback
    ↓
Supabase exchanges code for access token
    ↓
Supabase redirects to: https://dev.pixelways.co/api/auth/github/callback
    ↓
GitHub token stored in user profile
    ↓
User redirected to workspace
```

### 2. Deployment Flow
```
User clicks "Deploy" in workspace
    ↓
Check if GitHub token exists in profile
    ↓
If yes: Use stored token for deployment
If no: Prompt to connect GitHub account
    ↓
Create repository and deploy to Vercel
```

## ✅ Testing Checklist

- [ ] GitHub OAuth app created with correct callback URL
- [ ] Supabase GitHub provider configured
- [ ] Test login flow: `/auth/login` → "Continue with GitHub"
- [ ] Test callback handling
- [ ] Test token storage in profiles table
- [ ] Test deployment with stored token
- [ ] Test fallback manual token entry

## 🔒 Security Notes

1. **Token Storage**: GitHub tokens are stored in Supabase profiles table
2. **Scopes**: `repo`, `read:user`, and `workflow` scopes are requested
3. **Encryption**: In production, implement token encryption
4. **Expiration**: Implement token refresh mechanism
5. **Permissions**: Users can only access their own repositories

## 🐛 Troubleshooting

### Common Issues:

1. **OAuth Error**: Check callback URL matches exactly
2. **Token Not Found**: User may need to re-authenticate
3. **Repository Access**: Check GitHub token scopes
4. **Deployment Fails**: Verify token has repository permissions

### Debug Steps:

1. Check Supabase auth logs
2. Verify GitHub app permissions
3. Test token validity with GitHub API
4. Check browser console for errors
