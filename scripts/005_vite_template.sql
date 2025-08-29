
-- 1. Add is_template column to projects table if it doesn't exist
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;

-- 2. Create index for template projects
CREATE INDEX IF NOT EXISTS idx_projects_template ON public.projects(is_template);

-- 3. Add unique constraint to files table to prevent duplicate paths within a project
-- Drop the constraint first if it exists to avoid errors
ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_project_path_unique;
ALTER TABLE public.files ADD CONSTRAINT files_project_path_unique UNIQUE (project_id, path);

-- 4. Modify user_id column to allow NULL for template projects
-- First, drop the existing foreign key constraint
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_user_id_fkey;

-- Modify the user_id column to allow NULL values
ALTER TABLE public.projects ALTER COLUMN user_id DROP NOT NULL;

-- Add a new constraint that allows NULL for template projects
ALTER TABLE public.projects ADD CONSTRAINT projects_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. Add RLS policy to allow access to template projects
CREATE POLICY "Users can view template projects" ON public.projects
  FOR SELECT USING (is_template = true);

CREATE POLICY "Users can view template files" ON public.files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = files.project_id 
      AND projects.is_template = true
    )
  );

-- 6. Create a template project record
-- Template projects don't need to be associated with a specific user
INSERT INTO public.projects (
  id,
  name,
  description,
  slug,
  user_id,
  is_public,
  is_template,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Template project ID
  'Vite React Template',
  'A modern React + TypeScript + Tailwind CSS template with Vite',
  'vite-react-template',
  NULL, -- No user for template projects
  true, -- Public template
  true, -- Mark as template
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_template = EXCLUDED.is_template,
  updated_at = NOW();

-- 7. Add template files to the template project
-- Each file will be cloned when a new project is created

-- AIRULES.md - AI Instructions for working with this template
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'AIRULES.md',
  '/AIRULES.md',
  '# AI Development Rules & Guidelines

## 🎯 **Template Overview**
This is a **Vite React + TypeScript + Tailwind CSS** template designed for building modern web applications. The AI should use this template as a foundation and extend it based on user requirements.

## 🏗️ **Tech Stack & Architecture**

### **Core Technologies**
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast development and optimized builds)
- **Styling**: Tailwind CSS (utility-first CSS framework)
- **Language**: TypeScript (type-safe JavaScript)
- **Package Manager**: pnpm (fast and efficient)

### **Project Structure**
```
src/
├── main.tsx          # React entry point
├── App.tsx           # Main application component
├── App.css           # Component-specific styles
└── index.css         # Global Tailwind CSS imports
```

### **Key Dependencies**
- **React**: ^18.2.0 (hooks, functional components)
- **TypeScript**: ^5.2.2 (strict mode enabled)
- **Tailwind CSS**: ^3.3.6 (utility classes)
- **Vite**: ^5.0.8 (fast development server)

## 🤖 **AI Development Guidelines**

### **1. Code Generation Rules**
- **Always use TypeScript** with proper typing
- **Use functional components** with React hooks
- **Apply Tailwind CSS** for styling (avoid custom CSS when possible)
- **Follow React best practices** (immutable state, proper dependencies)
- **Use modern ES6+ syntax** (arrow functions, destructuring, etc.)

### **2. Component Structure**
```typescript
// ✅ Good: Functional component with TypeScript
interface ComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: ComponentProps) {
  const [state, setState] = useState('''');
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      <button 
        onClick={onAction}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Action
      </button>
    </div>
  );
}
```

### **3. Styling Guidelines**
- **Primary**: Use Tailwind CSS utility classes
- **Secondary**: Add custom CSS only when Tailwind does not suffice
- **Responsive**: Always include mobile-first responsive design
- **Consistent**: Use consistent spacing, colors, and typography

### **4. State Management**
- **Local State**: Use useState for component-level state
- **Complex State**: Use useReducer for complex state logic
- **Global State**: Consider Context API for app-wide state
- **Async Operations**: Use useEffect with proper cleanup

## 🚀 **Common Development Patterns**

### **Adding New Pages/Components**
1. Create new component in `src/components/` or `src/pages/`
2. Use TypeScript interfaces for props
3. Apply Tailwind CSS for styling
4. Export component for use in other files

### **API Integration**
```typescript
// Example API integration
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    try {
             const response = await fetch(''/api/endpoint'');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error(''Error:'', error);
    } finally {
      setLoading(false);
    }
  };
  
  fetchData();
}, []);
```

### **Form Handling**
```typescript
// Example form with controlled inputs
const [formData, setFormData] = useState({
  name: '''',
  email: ''''
});

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // Handle form submission
};

return (
  <form onSubmit={handleSubmit} className="space-y-4">
    <input
      type="text"
      value={formData.name}
      onChange={(e) => setFormData({...formData, name: e.target.value})}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Name"
    />
    <button 
      type="submit"
      className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
    >
      Submit
    </button>
  </form>
);
```

## 📱 **Responsive Design Patterns**

### **Mobile-First Approach**
```typescript
// Use Tailwind responsive prefixes
<div className="
  w-full                    // Mobile: full width
  md:w-1/2                 // Medium screens: half width
  lg:w-1/3                 // Large screens: one-third width
  p-4                      // Mobile: small padding
  md:p-6                   // Medium screens: larger padding
  lg:p-8                   // Large screens: largest padding
">
  Content
</div>
```

### **Common Breakpoints**
- **sm**: 640px and up
- **md**: 768px and up
- **lg**: 1024px and up
- **xl**: 1280px and up
- **2xl**: 1536px and up

## 🎨 **UI/UX Best Practices**

### **Loading States**
- Always show loading indicators for async operations
- Use skeleton loaders for better perceived performance
- Disable interactive elements during loading

### **Error Handling**
- Provide clear error messages
- Include retry mechanisms when appropriate
- Log errors for debugging

### **Accessibility**
- Use semantic HTML elements
- Include proper ARIA labels
- Ensure keyboard navigation works
- Maintain good color contrast

## 🔧 **Development Workflow**

### **When User Requests Features**
1. **Analyze Requirements**: Understand what the user wants to build
2. **Plan Structure**: Design component hierarchy and data flow
3. **Implement Components**: Create/modify components following guidelines
4. **Add Styling**: Apply Tailwind CSS for responsive design
5. **Test Functionality**: Ensure features work as expected
6. **Optimize**: Improve performance and user experience

### **File Organization**
- **Components**: Reusable UI components in `src/components/`
- **Pages**: Route-specific components in `src/pages/` or `src/views/`
- **Utils**: Helper functions in `src/utils/`
- **Types**: TypeScript interfaces in `src/types/`
- **Hooks**: Custom React hooks in `src/hooks/`

## 📚 **Useful Tailwind CSS Classes**

### **Layout**
- `container mx-auto` - Centered container
- `flex items-center justify-between` - Flexbox layout
- `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` - Responsive grid

### **Spacing**
- `p-4` - Padding all sides
- `m-2` - Margin all sides
- `space-y-4` - Vertical spacing between children

### **Colors**
- `bg-blue-500` - Blue background
- `text-gray-800` - Dark gray text
- `border-gray-300` - Light gray border

### **Typography**
- `text-xl font-bold` - Large bold text
- `text-sm text-gray-600` - Small muted text

## ⚠️ **Important Notes**

1. **Do not Remove Core Files**: Keep `main.tsx`, `App.tsx`, and configuration files
2. **Maintain TypeScript**: Always use proper typing
3. **Use Tailwind**: Prefer utility classes over custom CSS
4. **Follow React Patterns**: Use hooks and functional components
5. **Test Responsiveness**: Ensure mobile-first design works

## 🎯 **Example User Request Implementation**

**User Request**: "Create a todo list app with add/delete functionality"

**AI Response Should Include**:
1. New TodoList component with TypeScript interface
2. State management for todos array
3. Add/delete functions
4. Tailwind CSS styling
5. Responsive design considerations
6. Integration with existing App.tsx

---

**Remember**: This template is designed for rapid development. Use the existing structure, extend it with new components, and always maintain the established patterns for consistency and maintainability.',
  'markdown',
  'markdown',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- package.json
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'package.json',
  '/package.json',
  '{
  "name": "vite-react-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}',
  'json',
  'json',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- vite.config.ts
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'vite.config.ts',
  '/vite.config.ts',
  'import { defineConfig } from ''''vite''''
import react from ''''@vitejs/plugin-react''''

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: ''''0.0.0.0'''', // Allow external connections
    port: 3000,
    strictPort: true, // Ensure port 3000 is used
    hmr: {
      host: ''''localhost'''', // HMR host for development
    },
    cors: true, // Enable CORS for external access
    allowedHosts: [
      ''''localhost'''',
      ''''127.0.0.1'''',
      ''''.e2b.app'''', // Allow all E2B sandbox domains
      ''''3000-*.e2b.app'''', // Allow E2B preview domains
    ],
  },
})',
  'typescript',
  'typescript',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- tsconfig.json
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'tsconfig.json',
  '/tsconfig.json',
  '{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}',
  'json',
  'json',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- tsconfig.node.json
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'tsconfig.node.json',
  '/tsconfig.node.json',
  '{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}',
  'json',
  'json',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- tailwind.config.js
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'tailwind.config.js',
  '/tailwind.config.js',
  '/** @type {import(''''tailwindcss'''').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}',
  'javascript',
  'javascript',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- postcss.config.js
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'postcss.config.js',
  '/postcss.config.js',
  'export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}',
  'javascript',
  'javascript',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- index.html
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'index.html',
  '/index.html',
  '<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React + TS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>',
  'html',
  'html',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- src/main.tsx
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'main.tsx',
  '/src/main.tsx',
  'import React from ''''react''''
import ReactDOM from ''''react-dom/client''''
import App from ''''./App.tsx''''
import ''''./index.css''''

ReactDOM.createRoot(document.getElementById(''''root'''')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)',
  'typescript',
  'typescript',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- src/App.tsx
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'App.tsx',
  '/src/App.tsx',
  'import { useState } from ''''react''''
import ''''./App.css''''

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <img src="/vite.svg" className="h-24 w-24 mx-auto mb-4" alt="Vite logo" />
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Vite + React</h1>
          <p className="text-gray-600">Edit <code className="bg-gray-200 px-2 py-1 rounded">src/App.tsx</code> and save to test HMR</p>
        </div>
        
        <div className="mb-8">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
            onClick={() => setCount((count) => count + 1)}
          >
            Count is {count}
          </button>
        </div>
        
        <p className="text-sm text-gray-500">
          Click on the Vite and React logos to learn more
        </p>
      </div>
    </div>
  )
}

export default App',
  'typescript',
  'typescript',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- src/App.css
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'App.css',
  '/src/App.css',
  '#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20ms linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}',
  'css',
  'css',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- src/index.css
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'index.css',
  '/src/index.css',
  '@tailwind base;
@tailwind components;
@tailwind utilities;',
  'css',
  'css',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- public/vite.svg
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'vite.svg',
  '/public/vite.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFEA83"></stop><stop offset="8.333%" stop-color="#FFDD35"></stop><stop offset="100%" stop-color="#FFA800"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.922l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.88-4.114l16.646-57.705c.346-1.207-.07-2.48-1.097-3.079Z"></path></svg>',
  'svg',
  'svg',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- public/react.svg
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'react.svg',
  '/public/react.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="35.93" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 228"><path fill="#00D8FF" d="M210.483 73.824a171.49 171.49 0 0 0-8.24-2.597c.465-1.9.893-3.777 1.273-5.621c6.238-30.281 2.16-54.676-10.332-62.708c-12.065-7.7-29.006.329-43.54 19.526a171.23 171.23 0 0 0-6.375 8.05c-18.452-5.098-37.194-8.446-55.904-9.938c-1.621-.133-3.222-.26-4.811-.38c.116-1.098.234-2.194.354-3.287C99.735 3.471 108.873.393 117.31.393c12.575 0 20.323 6.72 22.568 18.442c.198 1.006.29 2.077.354 3.22c.377 6.478.553 13.21.553 20.069c0 6.747-.158 13.378-.5 19.764c-.063 1.089-.152 2.183-.267 3.28c1.609-.12 3.231-.247 4.863-.38c18.887-1.52 37.796-4.914 56.397-10.163a145.788 145.788 0 0 1 6.491-8.207c14.739-19.422 31.946-27.462 44.004-19.764c12.637 8.08 16.777 32.754 10.504 63.025c-.38 1.844-.808 3.721-1.273 5.621a171.49 171.49 0 0 0-8.24 2.597c-19.026 6.15-37.927 15.798-56.263 28.525c18.336 12.727 37.237 22.375 56.263 28.525a171.49 171.49 0 0 0 8.24 2.597c.465 1.9.893 3.777 1.273 5.621c6.273 30.271 2.133 54.945-10.504 63.025c-12.058 7.698-29.265-.342-44.004-19.764a145.788 145.788 0 0 1-6.491-8.207c-18.601-5.249-37.51-8.643-56.397-10.163c-1.632-.133-3.254-.26-4.863-.38c.115-1.097.204-2.191.267-3.28c.342-6.386.5-13.017.5-19.764c0-6.859-.176-13.591-.553-20.069c-.064-1.143-.156-2.214-.354-3.22c-2.245-11.722-9.993-18.442-22.568-18.442c-8.437 0-17.575 3.078-25.297 9.42c-.12 1.093-.238 2.189-.354 3.287c-1.589.12-3.19.247-4.811.38c-18.71 1.492-37.452 4.84-55.904 9.938a171.23 171.23 0 0 0-6.375-8.05c-14.534-19.197-31.475-27.226-43.54-19.526c-12.492 8.032-16.57 32.427-10.332 62.708c.38 1.844.808 3.721 1.273 5.621a171.49 171.49 0 0 0 8.24 2.597c19.026 6.15 37.927 15.798 56.263 28.525C172.556 89.622 191.457 79.974 210.483 73.824zM128.036 163.754c-19.893 0-36.236-16.343-36.236-36.236s16.343-36.236 36.236-36.236s36.236 16.343 36.236 36.236S147.929 163.754 128.036 163.754z"></path></svg>',
  'svg',
  'svg',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- .eslintrc.cjs
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '.eslintrc.cjs',
  '/.eslintrc.cjs',
  'module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    ''''eslint:recommended'''',
    ''''@typescript-eslint/recommended'''',
    ''''plugin:react-hooks/recommended'''',
  ],
  ignorePatterns: [''''dist'''', ''''.eslintrc.cjs''''],
  parser: ''''@typescript-eslint/parser'''',
  plugins: [''''react-refresh''''],
  rules: {
    ''''react-refresh/only-export-components'''': [
      ''''warn'''',
      { allowConstantExport: true },
    ],
  },
}',
  'javascript',
  'javascript',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- .gitignore
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '.gitignore',
  '/.gitignore',
  '# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?',
  'text',
  'text',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- README.md
INSERT INTO public.files (
  project_id,
  name,
  path,
  content,
  file_type,
  type,
  size,
  is_directory
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'README.md',
  '/README.md',
  '# Vite + React + TypeScript + Tailwind CSS

This template provides a fast, modern development experience with:

- ⚡️ [Vite](https://vitejs.dev/) - Fast build tool and dev server
- ⚛️ [React 18](https://reactjs.org/) - UI library
- 🔷 [TypeScript](https://www.typescriptlang.org/) - Type safety
- 🎨 [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

## Getting Started

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start development server:**
   ```bash
   pnpm dev
   ```

3. **Build for production:**
   ```bash
   pnpm build
   ```

4. **Preview production build:**
   ```bash
   pnpm preview
   ```

## Project Structure

```
src/
├── App.tsx          # Main application component
├── App.css          # App-specific styles
├── index.css        # Global styles with Tailwind
└── main.tsx         # Application entry point
```

## Features

- 🚀 **Fast Refresh** - Instant updates during development
- 📱 **Responsive Design** - Mobile-first with Tailwind CSS
- 🎯 **Type Safety** - Full TypeScript support
- 🔧 **ESLint** - Code quality and consistency
- 📦 **Modern Build** - ES modules and tree shaking

## Customization

- Edit `src/App.tsx` to modify the main component
- Update `tailwind.config.js` to customize Tailwind
- Modify `vite.config.ts` for build configuration
- Add new components in the `src/` directory

## AI Development

This project includes `AIRULES.md` with comprehensive guidelines for AI-assisted development. The AI will use these rules to:

- Generate code following React and TypeScript best practices
- Apply Tailwind CSS for consistent styling
- Maintain proper component structure and state management
- Ensure responsive design and accessibility
- Follow established patterns for forms, API integration, and state management
- Create responsive, accessible, and performant components

## Deployment

This project is ready to deploy to:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting service

Happy coding! 🎉',
  'markdown',
  'markdown',
  0,
  false
) ON CONFLICT (project_id, path) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- 9. Create function to clone template files to new project
CREATE OR REPLACE FUNCTION public.clone_template_files(new_project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_file RECORD;
BEGIN
  -- Clone all files from the template project
  FOR template_file IN 
    SELECT * FROM public.files 
    WHERE project_id = '00000000-0000-0000-0000-000000000000'
    ORDER BY path
  LOOP
    INSERT INTO public.files (
      project_id,
      name,
      path,
      content,
      file_type,
      type,
      size,
      is_directory,
      created_at,
      updated_at
    ) VALUES (
      new_project_id,
      template_file.name,
      template_file.path,
      template_file.content,
      template_file.file_type,
      template_file.type,
      template_file.size,
      template_file.is_directory,
      NOW(),
      NOW()
    );
  END LOOP;
END;
$$;

-- 10. Create trigger to automatically clone template files when a new project is created
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only clone template files for non-template projects
  IF NEW.is_template = false THEN
    PERFORM public.clone_template_files(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 11. Create trigger for new project creation
DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_project();

-- 12. Add comments for documentation
COMMENT ON FUNCTION public.clone_template_files(UUID) IS 'Clones all template files to a new project';
COMMENT ON FUNCTION public.handle_new_project() IS 'Automatically clones template files when a new project is created';
COMMENT ON COLUMN public.projects.is_template IS 'Indicates if this project is a template for cloning';

-- 13. Update existing projects to not be templates (safety check)
UPDATE public.projects 
SET is_template = false 
WHERE id != '00000000-0000-0000-0000-000000000000';