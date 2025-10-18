# Database Schema Documentation

## 🗄️ **Complete Database Structure**

This document describes the complete database schema for the PiPilot platform, including all tables, relationships, and policies.

## 📋 **Migration Scripts Order**

Run these scripts in order to set up the database:

1. `001_create_tables.sql` - Base tables and RLS policies
2. `002_create_profile_trigger.sql` - User profile automation
3. `003_deployment_features.sql` - GitHub + Vercel integration
4. `004_schema_fixes.sql` - Schema improvements and fixes
5. `005_vite_template.sql` - Vite React template and auto-cloning system

## 🏗️ **Table Structure**

### **1. profiles**
User profiles with authentication and integration tokens.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  github_token TEXT,           -- GitHub OAuth token
  vercel_token TEXT,           -- Vercel API token
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Store user information and external service tokens
**Relationships**: Referenced by projects, chat_sessions

### **2. projects**
User projects with metadata and deployment tracking.

```sql
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,   -- URL-friendly project identifier
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT FALSE,
  is_template BOOLEAN DEFAULT FALSE,  -- Indicates if this is a template project
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Deployment tracking
  github_repo_url TEXT,
  github_repo_name TEXT,
  vercel_project_id TEXT,
  vercel_deployment_url TEXT,
  deployment_status TEXT DEFAULT 'not_deployed' CHECK (
    deployment_status IN ('not_deployed', 'in_progress', 'deployed', 'failed')
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Store project information and deployment status
**Relationships**: Referenced by files, folders, chat_sessions

### **3. folders**
Project folder structure for better organization.

```sql
CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  parent_folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, path)
);
```

**Purpose**: Organize project files into hierarchical structure
**Relationships**: Self-referencing (parent-child), referenced by files

### **4. files**
Project files with content and metadata.

```sql
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  content TEXT,
  file_type TEXT NOT NULL DEFAULT 'text',
  type TEXT NOT NULL DEFAULT 'text',        -- Alias for file_type
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  size BIGINT DEFAULT 0,
  is_directory BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Store actual file content and metadata
**Relationships**: Referenced by projects, optionally by folders

### **5. chat_sessions**
AI chat conversation sessions.

```sql
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Track AI chat conversations per project
**Relationships**: Referenced by messages

### **6. messages**
Individual chat messages with metadata.

```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',     -- Store additional message data
  tokens_used INTEGER DEFAULT 0,   -- Track AI token usage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Store individual chat messages and AI response metadata
**Relationships**: Referenced by chat_sessions

## 🔗 **Relationships & Constraints**

### **Primary Relationships**
```
profiles (1) ←→ (N) projects
projects (1) ←→ (N) files
projects (1) ←→ (N) folders
projects (1) ←→ (N) chat_sessions
chat_sessions (1) ←→ (N) messages
folders (1) ←→ (N) folders (self-referencing)
folders (1) ←→ (N) files
```

### **Foreign Key Constraints**
- All foreign keys use `ON DELETE CASCADE` for automatic cleanup
- `folder_id` in files uses `ON DELETE SET NULL` to preserve files when folders are deleted

### **Unique Constraints**
- `projects.slug` - Ensures unique project URLs
- `folders(project_id, path)` - Prevents duplicate paths within a project

## 🛡️ **Row Level Security (RLS)**

### **Enabled Tables**
All tables have RLS enabled for security.

### **Policy Patterns**
- **Profiles**: Users can only access their own profile
- **Projects**: Users can only access their own projects
- **Files**: Users can only access files in their projects
- **Folders**: Users can only access folders in their projects
- **Chat Sessions**: Users can only access their own chat sessions
- **Messages**: Users can only access messages in their chat sessions

### **Example Policy**
```sql
CREATE POLICY "Users can view files in their projects" ON public.files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = files.project_id 
      AND projects.user_id = auth.uid()
    )
  );
```

## 📊 **Indexes for Performance**

### **Primary Indexes**
- `idx_projects_deployment_status` - Fast deployment status queries
- `idx_projects_github_repo` - Fast GitHub repository lookups
- `idx_projects_vercel_deployment` - Fast Vercel deployment lookups
- `idx_files_project_path` - Fast file lookups by project and path
- `idx_folders_project_path` - Fast folder lookups by project and path
- `idx_projects_slug` - Fast project lookups by slug
- `idx_projects_template` - Fast template project queries
- `idx_chat_sessions_user_active` - Fast active chat session queries
- `idx_messages_session_created` - Fast message ordering by creation time

## 🔧 **Functions & Triggers**

### **1. handle_new_user()**
Automatically creates user profiles when users sign up.

### **2. update_project_activity()**
Updates project `last_activity` timestamp when files change.

### **3. generate_project_slug()**
Creates URL-friendly slugs from project names with collision handling.

### **4. clone_template_files(UUID)**
Clones all template files to a new project when it's created.

### **5. handle_new_project()**
Automatically clones template files when a new project is created.

### **Triggers**
- `on_auth_user_created` - Creates profile on user signup
- `on_file_activity` - Updates project activity on file changes
- `on_project_created` - Clones template files to new projects

## 🎯 **Template System**

### **Vite React Template**
The platform includes a pre-built Vite React template with:

- **Modern Stack**: React 18 + TypeScript + Tailwind CSS + Vite
- **Development Tools**: ESLint, PostCSS, Autoprefixer
- **Build Configuration**: Optimized Vite config for development and production
- **File Structure**: Organized src/ directory with main components
- **Styling**: Tailwind CSS with custom component styles
- **Documentation**: Comprehensive README with setup instructions
- **AI Rules**: AIRULES.md with guidelines for AI-assisted development

### **Template Files Included**
```
/
├── AIRULES.md         # AI development guidelines and rules
├── package.json       # Dependencies and scripts
├── vite.config.ts     # Vite configuration
├── tsconfig.json      # TypeScript configuration
├── tailwind.config.js # Tailwind CSS configuration
├── postcss.config.js  # PostCSS configuration
├── index.html         # HTML entry point
├── .eslintrc.cjs      # ESLint configuration
├── .gitignore         # Git ignore patterns
├── README.md          # Project documentation
└── src/
    ├── main.tsx       # React entry point
    ├── App.tsx        # Main application component
    ├── App.css        # Component-specific styles
    └── index.css      # Global Tailwind styles
```

### **Auto-Cloning Process**
1. **Template Project**: Stored with ID `00000000-0000-0000-0000-000000000000`
2. **Automatic Cloning**: When a new project is created, all template files are cloned
3. **File Synchronization**: Files appear immediately in the file explorer
4. **Ready to Run**: Projects can be previewed and deployed immediately

## 📈 **Data Flow**

### **User Registration**
1. User signs up via Supabase Auth
2. `handle_new_user()` trigger creates profile
3. Profile stores GitHub/Vercel tokens when connected

### **Project Creation**
1. User creates project
2. `generate_project_slug()` creates unique slug
3. `handle_new_project()` trigger clones template files
4. Project gets `user_id` from authenticated user
5. All template files are available in file explorer

### **File Management**
1. Files are created/updated in projects
2. `update_project_activity()` trigger updates project timestamp
3. Files can be organized into folders

### **AI Chat**
1. Chat sessions are created per project
2. Messages are stored with metadata and token usage
3. Chat sessions track activity and can be archived

### **Deployment**
1. GitHub integration creates repositories
2. Vercel integration deploys from GitHub
3. Deployment status is tracked in projects table

## 🚀 **Usage Examples**

### **Get User's Projects with Files**
```sql
SELECT 
  p.*,
  COUNT(f.id) as file_count,
  p.last_activity
FROM projects p
LEFT JOIN files f ON p.id = f.project_id
WHERE p.user_id = auth.uid()
GROUP BY p.id
ORDER BY p.last_activity DESC;
```

### **Get Project Structure**
```sql
SELECT 
  f.*,
  fo.name as folder_name,
  fo.path as folder_path
FROM files f
LEFT JOIN folders fo ON f.folder_id = fo.id
WHERE f.project_id = $1
ORDER BY f.path;
```

### **Get Active Chat Sessions**
```sql
SELECT 
  cs.*,
  p.name as project_name,
  COUNT(m.id) as message_count
FROM chat_sessions cs
JOIN projects p ON cs.project_id = p.id
LEFT JOIN messages m ON cs.id = m.chat_session_id
WHERE cs.user_id = auth.uid() AND cs.is_active = true
GROUP BY cs.id, p.name
ORDER BY cs.last_message_at DESC;
```

### **Get Template Project Files**
```
SELECT 
  name,
  path,
  file_type,
  size
FROM files 
WHERE project_id = '00000000-0000-0000-0000-000000000000'
ORDER BY path;
```

## 🔒 **Security Considerations**

1. **RLS Policies**: All data access is controlled by RLS
2. **User Isolation**: Users can only access their own data
3. **Token Storage**: External service tokens are encrypted at rest
4. **Audit Trail**: All changes are timestamped
5. **Cascade Deletion**: Proper cleanup when projects/users are deleted
6. **Template Isolation**: Template projects are read-only for regular users

## 📝 **Maintenance**

### **Regular Tasks**
- Monitor index performance
- Clean up old chat sessions
- Archive completed projects
- Update deployment statuses
- Update template files when needed

### **Template Updates**
- Modify template files in the template project
- New projects will automatically get updated templates
- Existing projects retain their current files

### **Backup Strategy**
- Daily automated backups
- Point-in-time recovery
- Cross-region replication for disaster recovery

---

**Last Updated**: December 2024  
**Version**: 1.1.0  
**Status**: Production Ready with Template System
