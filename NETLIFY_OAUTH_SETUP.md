# Netlify API Token Setup Guide

## 🔧 Netlify API Token Configuration

**Note:** Netlify doesn't provide OAuth integration with Supabase. We use Personal Access Tokens for secure API access.

### **Application Description for Netlify:**

```
Application Name: PiPilot
Description: AI-powered web application builder that helps users create, deploy, and manage web applications. The app provides an intuitive interface for building modern web applications with AI assistance, offering features like real-time code editing, instant deployment to Netlify, and comprehensive project management. Users can build React, Vue, and other modern web applications with AI-generated code and deploy them seamlessly to Netlify with automatic SSL, CDN, and continuous deployment.

Homepage URL: https://dev.pixelways.co
Authorization callback URL: https://lzuknbfbvpuscpammwzg.supabase.co/auth/v1/callback
```

## 🚀 How Netlify API Token Works

### **Token-Based Flow**
```
User creates Netlify Personal Access Token
    ↓
User enters token in deployment dialog
    ↓
App validates token with Netlify API
    ↓
Token stored securely in user profile
    ↓
Token used for all Netlify API operations
```

### **Actions We Can Perform on User's Behalf:**

#### **1. Site Management**
- ✅ Create new sites
- ✅ Update site settings and configuration
- ✅ Delete sites
- ✅ List user's sites
- ✅ Get site analytics and metrics

#### **2. Deployment Operations**
- ✅ Trigger new deployments
- ✅ Cancel running deployments
- ✅ Rollback to previous deployments
- ✅ Get deployment status and logs
- ✅ View build logs and errors

#### **3. Domain Management**
- ✅ Add custom domains
- ✅ Configure DNS settings
- ✅ Set up SSL certificates
- ✅ Manage redirects and rewrites
- ✅ Configure domain aliases

#### **4. Build Configuration**
- ✅ Update build settings
- ✅ Configure environment variables
- ✅ Set build commands and publish directories
- ✅ Manage build hooks
- ✅ Configure form handling

#### **5. Team & Collaboration**
- ✅ Invite team members
- ✅ Manage permissions and roles
- ✅ View team activity and logs
- ✅ Access team settings

#### **6. Functions & Edge Functions**
- ✅ Deploy serverless functions
- ✅ Manage function settings
- ✅ View function logs
- ✅ Configure function triggers

## 📋 Setup Instructions

### **1. Create Netlify Personal Access Token**

1. **Go to Netlify User Settings**
   - Visit: https://app.netlify.com/user/applications#personal-access-tokens

2. **Create New Token**
   - Click "New access token"
   - Fill in the details:

```
Token Name: PiPilot
Description: For deploying applications built with PiPilot
Expiration: Choose appropriate duration (recommend 1 year)
```

3. **Copy Token**
   - Copy the generated token (starts with `ntl_`)
   - Keep it secure - it won't be shown again

### **2. Application Configuration**

No additional configuration needed in your app - tokens are validated on-demand.

### **3. Token Permissions**

**Required Scopes:**
```
sites:read sites:write deploy:read deploy:write
```

**What the Token Can Do:**
- Create and manage Netlify sites
- Deploy applications with automatic builds
- Configure custom domains and SSL
- Manage environment variables
- Access deployment logs and analytics

## 🔑 Environment Variables

No additional environment variables needed for Netlify OAuth:

```env
# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Other variables...
CODESTRAL_API_KEY=DXfXAjwNIZcAv1ESKtoDwWZZF98lJxho
E2B_API_KEY=your_e2b_api_key
```

## 🚀 How It Works

### **1. User Authentication Flow**
```
User clicks "Continue with Netlify" 
    ↓
Netlify OAuth consent screen
    ↓
Netlify redirects to: https://lzuknbfbvpuscpammwzg.supabase.co/auth/v1/callback
    ↓
Supabase exchanges code for access token
    ↓
Supabase redirects to: https://dev.pixelways.co/api/auth/netlify/callback
    ↓
Netlify token stored in user profile
    ↓
User redirected to workspace
```

### **2. Deployment Flow**
```
User clicks "Deploy to Netlify" in workspace
    ↓
Check if Netlify token exists in profile
    ↓
If yes: Use stored token for deployment
If no: Prompt to connect Netlify account
    ↓
Create Netlify site and deploy
    ↓
Update project with deployment info
```

## ✅ API Endpoints

### **OAuth Callback**
- **GET** `/api/auth/netlify/callback`
- Handles OAuth callback from Supabase
- Stores Netlify token in user profile

### **Token Check**
- **GET** `/api/auth/netlify/check`
- Checks if user has stored Netlify token
- Returns connection status

### **Deployment**
- **POST** `/api/deploy/netlify`
- Creates Netlify site
- Uploads project files
- Triggers deployment
- Uses stored token

### **Deployment Status**
- **GET** `/api/deploy/netlify?deploymentId=xxx&netlifyToken=xxx`
- Checks deployment status
- Returns build logs and errors

## 🔒 Security Features

### **OAuth Security**
- Secure OAuth flow via Supabase
- Tokens stored in Supabase profiles table
- Row Level Security (RLS) policies protect user data
- Users can only access their own tokens

### **API Security**
- All API calls use stored OAuth tokens
- Tokens are validated before use
- Secure error handling
- No token exposure in client-side code

### **Deployment Security**
- Site creation with proper permissions
- Automatic SSL certificate setup
- Secure file uploads
- Cleanup on deployment failure

## 🐛 Troubleshooting

### **Common Issues:**

1. **OAuth Error**
   - Check callback URL matches exactly
   - Verify OAuth app is properly configured
   - Check scopes are correctly set

2. **Deployment Fails**
   - Token may not have sufficient permissions
   - Check Netlify account limits
   - Verify project files are valid

3. **Token Not Found**
   - User may need to re-authenticate
   - Check OAuth flow completion
   - Verify token storage in database

### **Debug Steps:**

1. **Check Supabase Auth Logs**
   - Verify OAuth flow completion
   - Check token exchange success

2. **Test Netlify API Manually**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://api.netlify.com/api/v1/sites
   ```

3. **Check Application Logs**
   - Look for deployment errors
   - Check file upload issues

## 📊 OAuth Scopes

### **Required Scopes:**
- **`sites:read`** - Read user's sites and settings
- **`sites:write`** - Create and update sites
- **`deploy:read`** - Read deployment status and logs
- **`deploy:write`** - Trigger and manage deployments

### **What the Token Can Do:**
- Create and manage Netlify sites
- Deploy applications with automatic builds
- Configure custom domains and SSL
- Manage environment variables
- Access deployment logs and analytics
- Handle form submissions
- Deploy serverless functions

## 🔄 Token Management

### **Automatic Refresh:**
- OAuth tokens are managed by Supabase
- Automatic token refresh handled by Supabase
- No manual token management required

### **Token Revocation:**
- Users can revoke access from Netlify dashboard
- Application handles token expiration gracefully
- Clear error messages for invalid tokens

## ✅ Testing Checklist

- [ ] Netlify OAuth app created with correct callback URL
- [ ] Supabase Netlify provider configured
- [ ] Test OAuth flow: `/auth/login` → "Continue with Netlify"
- [ ] Test callback handling
- [ ] Test token storage in profiles table
- [ ] Test deployment with stored token
- [ ] Test deployment status checking
- [ ] Test error handling for invalid tokens

## 🎯 Summary

Netlify OAuth provides **seamless integration** with comprehensive deployment capabilities:

- ✅ **OAuth Authentication** - Secure, automatic token management
- ✅ **Comprehensive API Access** - Full site and deployment management
- ✅ **Automatic SSL & CDN** - Production-ready deployments
- ✅ **Real-time Status** - Live deployment monitoring
- ✅ **Team Collaboration** - Multi-user support
- ✅ **Serverless Functions** - Advanced deployment features

The implementation provides **enterprise-grade deployment capabilities** with excellent user experience!
