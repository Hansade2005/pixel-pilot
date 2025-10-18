# Supabase Service Role Setup for Admin User Management

## Problem
You're getting the error "User not allowed" when trying to access the admin user management features. This happens because the admin API needs service role permissions to access all users from Supabase Auth.

## Solution
You need to add the `SUPABASE_SERVICE_ROLE_KEY` environment variable to enable admin operations.

## Steps to Fix

### 1. Get Your Supabase Service Role Key

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Scroll down to **Service Role Key**
5. Copy the **service_role** key (it starts with `eyJ...`)

### 2. Create Environment File

Create a `.env.local` file in your project root (if it doesn't exist) and add:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional: Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### 3. Replace the Values

- `your_supabase_project_url`: Your Supabase project URL (from API settings)
- `your_supabase_anon_key`: Your Supabase anon key (from API settings)
- `your_service_role_key_here`: The service role key you copied from step 1
- `your_stripe_secret_key`: Your Stripe secret key (optional)
- `your_stripe_publishable_key`: Your Stripe publishable key (optional)

### 4. Restart Your Development Server

```bash
# Stop your current server (Ctrl+C)
# Then restart
npm run dev
```

## Security Note

⚠️ **Important**: The service role key has full access to your Supabase project. Never commit it to version control or share it publicly. The `.env.local` file is already in `.gitignore` for security.

## What This Enables

With the service role key configured, you can:

- ✅ View all registered users (not just admin)
- ✅ Manage user credits and subscriptions
- ✅ Update user profiles and settings
- ✅ Access complete user analytics
- ✅ Perform administrative operations

## Troubleshooting

### Still Getting "User not allowed" Error?

1. **Check Environment Variables**: Make sure `.env.local` is in your project root
2. **Restart Server**: Environment changes require a server restart
3. **Verify Key**: Double-check you copied the correct service role key from Supabase
4. **File Location**: Ensure `.env.local` is at the project root, not in a subdirectory

### Can't Find Service Role Key?

1. Go to Supabase Dashboard → Your Project → Settings → API
2. Look for "Service Role Key" section
3. The key should be a long JWT token starting with `eyJ...`

### Development vs Production

For production deployment, you'll need to set these environment variables in your hosting platform (Vercel, Netlify, etc.).

## Example .env.local File

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Once you add the service role key and restart your server, the admin user management should work perfectly! 🎉
