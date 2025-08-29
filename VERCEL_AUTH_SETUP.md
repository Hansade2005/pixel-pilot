# Vercel Authentication Setup Guide

## 🔧 Vercel API Token Configuration

Unlike GitHub, Vercel uses **API tokens** instead of OAuth for authentication. This guide explains how to set up Vercel authentication in your AI App Builder.

## 🚀 How Vercel Authentication Works

### **Token-Based Authentication Flow**
```
User enters Vercel API token
    ↓
Validate token with Vercel API
    ↓
Store validated token in user profile
    ↓
Use token for deployments and API calls
```

### **No OAuth Required**
- Vercel doesn't provide OAuth for third-party apps
- Users must create API tokens manually
- Tokens are validated before storage
- Tokens are used for all Vercel API operations

## 📋 Setup Instructions

### **1. User Token Creation**

Users need to create a Vercel API token:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/account/tokens

2. **Create New Token**
   - Click "Create Token"
   - Name: "AI App Builder"
   - Expiration: Choose appropriate duration
   - Scope: Full Account (for deployment access)

3. **Copy Token**
   - Copy the generated token (starts with `vercel_`)
   - Keep it secure - it won't be shown again

### **2. Application Configuration**

No additional configuration needed in your app - tokens are validated on-demand.

## 🔑 Environment Variables

No additional environment variables needed for Vercel authentication:

```env
# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Other variables...
CODESTRAL_API_KEY=DXfXAjwNIZcAv1ESKtoDwWZZF98lJxho
E2B_API_KEY=your_e2b_api_key
```

## 🚀 How It Works

### **1. Token Validation Flow**
```
User enters Vercel token in deployment dialog
    ↓
App calls /api/auth/vercel/validate
    ↓
Validate token with Vercel API (/v2/user)
    ↓
Store valid token in user profile
    ↓
Use stored token for deployments
```

### **2. Deployment Flow**
```
User clicks "Deploy to Vercel"
    ↓
Check if valid token exists in profile
    ↓
If yes: Use stored token for deployment
If no: Prompt to enter and validate token
    ↓
Create Vercel project and deploy
```

## ✅ API Endpoints

### **Token Validation**
- **POST** `/api/auth/vercel/validate`
- Validates token with Vercel API
- Stores valid token in user profile

### **Token Check**
- **GET** `/api/auth/vercel/check`
- Checks if user has stored token
- Returns connection status

### **Token Revocation**
- **POST** `/api/auth/vercel/revoke`
- Removes token from user profile
- Allows users to disconnect

### **Deployment**
- **POST** `/api/deploy/vercel`
- Creates Vercel project
- Triggers deployment
- Uses stored token

## 🔒 Security Features

### **Token Validation**
- All tokens are validated with Vercel API before storage
- Invalid tokens are rejected immediately
- No plain text tokens stored without validation

### **Secure Storage**
- Tokens stored in Supabase profiles table
- Row Level Security (RLS) policies protect user data
- Users can only access their own tokens

### **Token Management**
- Users can revoke tokens anytime
- Tokens are validated on each deployment
- Clear error messages for invalid tokens

## 🐛 Troubleshooting

### **Common Issues:**

1. **Invalid Token Error**
   - Token may be expired or revoked
   - User needs to create new token
   - Check token format (should start with `vercel_`)

2. **Deployment Fails**
   - Token may not have sufficient permissions
   - GitHub repository may not be accessible
   - Check Vercel account limits

3. **Token Not Found**
   - User may need to re-enter token
   - Token may have been revoked
   - Check user profile in database

### **Debug Steps:**

1. **Test Token Manually**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://api.vercel.com/v2/user
   ```

2. **Check Vercel Dashboard**
   - Verify token exists and is active
   - Check token permissions and scope

3. **Check Application Logs**
   - Look for validation errors
   - Check deployment API responses

## 📊 Token Permissions

### **Required Scopes:**
- **Full Account Access** - For project creation and deployment
- **Project Management** - For creating and managing projects
- **Deployment Access** - For triggering deployments

### **What the Token Can Do:**
- Create new Vercel projects
- Connect to GitHub repositories
- Trigger deployments
- Manage project settings
- Access deployment logs

## 🔄 Token Refresh

### **Manual Refresh:**
- Users must create new tokens manually
- Old tokens can be revoked from Vercel dashboard
- Application validates tokens on each use

### **Best Practices:**
- Use descriptive token names
- Set appropriate expiration dates
- Revoke unused tokens
- Monitor token usage

## ✅ Testing Checklist

- [ ] User can create Vercel API token
- [ ] Token validation works correctly
- [ ] Token storage in user profile
- [ ] Deployment with stored token
- [ ] Error handling for invalid tokens
- [ ] Token revocation functionality
- [ ] Connection status display
- [ ] Deployment status tracking

## 🎯 Summary

Vercel authentication is **simpler** than GitHub OAuth but requires **manual token management**:

- ✅ **No OAuth complexity** - Direct API token usage
- ✅ **Immediate validation** - Tokens verified before storage
- ✅ **Secure storage** - Protected by RLS policies
- ✅ **Easy revocation** - Users can remove tokens anytime
- ⚠️ **Manual token creation** - Users must create tokens themselves
- ⚠️ **No automatic refresh** - Tokens must be manually renewed

The implementation is **complete and secure** for production use!
