# Database Setup Guide

## 🚨 **Current Issue**
The application is failing to create projects because the database tables haven't been set up properly.

## 🔧 **Quick Fix Steps**

### 1. **Check Environment Variables**
Create a `.env.local` file in your project root with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. **Set Up Supabase Database**
You have two options:

#### **Option A: Use Supabase Cloud (Recommended)**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and anon key
4. Add them to your `.env.local` file

#### **Option B: Use Local Supabase**
1. Install Supabase CLI: `npm install -g supabase`
2. Start local Supabase: `supabase start`
3. Copy the local credentials to your `.env.local`

### 3. **Run Database Scripts**
Execute the SQL scripts in order:

```bash
# Connect to your Supabase database (SQL Editor in dashboard)
# Run these scripts in sequence:

1. scripts/001_create_tables.sql
2. scripts/002_create_profile_trigger.sql  
3. scripts/003_deployment_features.sql
4. scripts/004_schema_fixes.sql
5. scripts/005_vite_template.sql
6. scripts/006_github_auth_improvements.sql
7. scripts/007_netlify_integration.sql
8. scripts/008_fix_projects_table.sql  # NEW: Fixes missing projects table
```

### 4. **Verify Setup**
After running the scripts, you should have these tables:
- `profiles`
- `projects` 
- `files`
- `chat_sessions`
- `messages`

## 🧪 **Test Database Connection**

You can test if your database is working by:

1. Going to your Supabase dashboard
2. Opening the SQL Editor
3. Running: `SELECT * FROM projects LIMIT 1;`

If you get an error about tables not existing, the scripts haven't been run.

## 🔍 **Common Issues**

### **"relation 'projects' does not exist"**
- Database scripts haven't been executed
- Wrong database connection
- RLS policies not set up

### **"permission denied"**
- RLS policies not configured
- User not authenticated
- Wrong API keys

### **Empty error object {}**
- Network connection issues
- Supabase service down
- Invalid environment variables

## 📞 **Need Help?**

1. Check the browser console for detailed error messages
2. Verify your Supabase project is running
3. Ensure all SQL scripts were executed successfully
4. Check that your user is properly authenticated

## 🚀 **After Setup**

Once the database is properly configured:
1. Restart your Next.js development server
2. Try creating a project again
3. The error should be resolved and projects should create successfully
