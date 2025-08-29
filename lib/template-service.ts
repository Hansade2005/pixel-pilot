// Template service for applying default project templates
import { storageManager } from './storage-manager'
import type { Workspace, File } from './storage-manager'
import { createClient } from '@/lib/supabase/server'

export class TemplateService {
  // Default Vite React + TypeScript + Tailwind CSS template files
  private static readonly VITE_REACT_TEMPLATE_FILES: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'AIRULES.md',
      path: 'AIRULES.md',
      content: `# AI Development Rules & Guidelines

## 🎯 **Template Overview**
This is a **Vite React + TypeScript + Tailwind CSS** template designed for building modern multi-page web applications. The AI should use this template as a foundation and extend it based on user requirements.

## 🏗️ **Tech Stack & Architecture**

### **Core Technologies**
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast development and optimized builds)
- **Styling**: Tailwind CSS (utility-first CSS framework)
- **Routing**: React Router v6 for multi-page navigation
- **Language**: TypeScript (type-safe JavaScript)
- **Package Manager**: pnpm (fast and efficient)

### **Project Structure**
\`\`\`
src/
├── main.tsx          # React entry point
├── App.tsx           # Main application component with routing
├── App.css           # App-specific styles
├── index.css         # Global Tailwind CSS imports
├── pages/            # Page components with routing
│   ├── Home.tsx
│   ├── About.tsx
│   └── Contact.tsx
├── components/       # Reusable UI components
├── hooks/            # Custom React hooks
└── utils/            # Utility functions
\`\`\`

## 🤖 **AI Development Guidelines**

### **1. Code Generation Rules**
- **Always use TypeScript** with proper typing
- **Use functional components** with React hooks
- **Apply Tailwind CSS** for styling (avoid custom CSS when possible)
- **Follow React best practices** (immutable state, proper dependencies)
- **Use modern ES6+ syntax** (arrow functions, destructuring, etc.)

### **2. Multi-Page Application Structure**
- **Create pages in src/pages/** directory with proper routing
- **Use React Router v6** for navigation between pages
- **Define navigation and footer in App.tsx** for consistency across pages
- **Each page should be a self-contained component** with its own state and logic

### **3. Routing Implementation**
\`\`\`typescript
// App.tsx - Proper routing structure
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
\`\`\`

### **4. Component Structure**
\`\`\`typescript
// ✅ Good: Functional component with TypeScript
interface ComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: ComponentProps) {
  const [state, setState] = useState('');
  
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
\`\`\`

## 🎨 **Styling Guidelines**

### **Tailwind CSS Usage**
- **Primary**: Use Tailwind CSS utility classes
- **Responsive**: Always include mobile-first responsive design
- **Consistent**: Use consistent spacing, colors, and typography
- **Dark Mode**: Implement dark/light theme switching with Tailwind

### **Color Palette**
- Use Tailwind's default color palette
- Maintain consistent color scheme throughout the application
- Use appropriate colors for different UI elements (primary, secondary, accent, etc.)

## 📱 **Multi-Page Application Requirements**

### **Page Organization**
- **Create separate files** for each page in \`src/pages/\`
- **Each page should be self-contained** with its own components and state
- **Use proper routing** with React Router
- **Implement navigation** that works across all pages
- **Include consistent header/footer** across all pages

### **Navigation & Routing**
- **Use React Router v6** for all navigation
- **Create a Navigation component** in \`src/components/\`
- **Implement responsive navigation** with mobile hamburger menu
- **Add active state indicators** for current page
- **Ensure all routes are properly defined** in App.tsx

## 🚀 **Development Workflow**

### **When User Requests Features**
1. **Analyze Requirements**: Understand what the user wants to build
2. **Plan Structure**: Design component hierarchy and routing
3. **Update package.json**: Add required dependencies (especially react-router-dom)
4. **Implement Components**: Create/modify components following guidelines
5. **Add Styling**: Apply Tailwind CSS for responsive design
6. **Test Functionality**: Ensure features work as expected
7. **Optimize**: Improve performance and user experience

### **File Organization**
- **Pages**: Route-specific components in \`src/pages/\`
- **Components**: Reusable UI components in \`src/components/\`
- **Utils**: Helper functions in \`src/utils/\`
- **Hooks**: Custom React hooks in \`src/hooks/\`

## ⚠️ **Important Notes**

1. **Always use React Router** for multi-page applications
2. **Keep navigation and footer in App.tsx** for consistency
3. **Maintain TypeScript** typing throughout
4. **Use Tailwind CSS** for all styling
5. **Follow React Patterns** with hooks and functional components
6. **Test Responsiveness** on different screen sizes
7. **Add dependencies to package.json** before using them
8. **ONLY USE PACKAGES SPECIFIED IN PACKAGE.JSON** - do not add new dependencies without checking first

## ✅ **Approved UI Component Libraries**

1. **Radix UI** - Use only the Radix components that are already in dependencies
2. **Lucide React** - For all icons and visual elements
3. **Framer Motion** - For animations and transitions
4. **Tailwind CSS Utilities** - clsx, class-variance-authority, tailwind-merge
5. **Form Handling** - react-hook-form, zod, @hookform/resolvers
6. **UI Components** - All components from the official package.json

## ✅ **Quality Assurance**

### **Code Quality**
- Use proper TypeScript interfaces and types
- Implement error handling and loading states
- Follow accessibility best practices
- Write clean, maintainable code

### **Performance**
- Optimize images and assets
- Implement lazy loading where appropriate
- Minimize bundle size
- Use React.memo and useMemo for optimization

### **User Experience**
- Implement smooth transitions and animations
- Provide clear feedback for user actions
- Ensure fast loading times
- Create intuitive navigation`,
      fileType: 'text',
      type: 'text',
      size: 0,
      isDirectory: false
    },
    {
      name: 'package.json',
      path: 'package.json',
      content: `{
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
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.28.0",

    "@radix-ui/react-accordion": "1.2.2",
    "@radix-ui/react-alert-dialog": "1.1.4",
    "@radix-ui/react-aspect-ratio": "1.1.1",
    "@radix-ui/react-avatar": "1.1.2",
    "@radix-ui/react-checkbox": "1.1.3",
    "@radix-ui/react-collapsible": "1.1.2",
    "@radix-ui/react-context-menu": "2.2.4",
    "@radix-ui/react-dialog": "1.1.4",
    "@radix-ui/react-dropdown-menu": "2.1.4",
    "@radix-ui/react-hover-card": "1.1.4",
    "@radix-ui/react-label": "2.1.1",
    "@radix-ui/react-menubar": "1.1.4",
    "@radix-ui/react-navigation-menu": "1.2.3",
    "@radix-ui/react-popover": "1.1.4",
    "@radix-ui/react-progress": "1.1.1",
    "@radix-ui/react-radio-group": "1.2.2",
    "@radix-ui/react-scroll-area": "1.2.2",
    "@radix-ui/react-select": "2.1.4",
    "@radix-ui/react-separator": "1.1.1",
    "@radix-ui/react-slider": "1.2.2",
    "@radix-ui/react-slot": "1.1.1",
    "@radix-ui/react-switch": "1.1.2",
    "@radix-ui/react-tabs": "1.1.2",
    "@radix-ui/react-toast": "1.2.4",
    "@radix-ui/react-toggle": "1.1.1",
    "@radix-ui/react-toggle-group": "1.1.1",
    "@radix-ui/react-tooltip": "1.1.6",

    "lucide-react": "^0.454.0",
    "framer-motion": "^12.23.12",

    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.5",
    "cmdk": "1.0.4",
    "next-themes": "^0.4.6",

    "react-hook-form": "^7.60.0",
    "zod": "3.25.67",
    "@hookform/resolvers": "^3.10.0",

    "date-fns": "4.1.0",
    "recharts": "2.15.4",

    "sonner": "^1.7.4",
    "react-day-picker": "9.8.0",
    "input-otp": "1.4.1",
    "vaul": "^0.9.9",
    "embla-carousel-react": "8.5.1",
    "react-resizable-panels": "^2.1.7",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1"
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
    "vite": "^5.0.8",
    "tailwindcss-animate": "^1.0.7"
  }
}
`,
      fileType: 'json',
      type: 'json',
      size: 0,
      isDirectory: false
    },
    {
      name: 'vite.config.ts',
      path: 'vite.config.ts',
      content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 3000,
    strictPort: true, // Ensure port 3000 is used
    hmr: {
      host: 'localhost', // HMR host for development
    },
    cors: true, // Enable CORS for external access
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.e2b.app', // Allow all E2B sandbox domains
      '3000-*.e2b.app', // Allow E2B preview domains
    ],
  },
})`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'tsconfig.json',
      path: 'tsconfig.json',
      content: `{
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
}`,
      fileType: 'json',
      type: 'json',
      size: 0,
      isDirectory: false
    },
    {
      name: 'tsconfig.node.json',
      path: 'tsconfig.node.json',
      content: `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}`,
      fileType: 'json',
      type: 'json',
      size: 0,
      isDirectory: false
    },
    {
      name: 'tailwind.config.js',
      path: 'tailwind.config.js',
      content: `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
      fileType: 'javascript',
      type: 'javascript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'postcss.config.js',
      path: 'postcss.config.js',
      content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
      fileType: 'javascript',
      type: 'javascript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'index.html',
      path: 'index.html',
      content: `<!doctype html>
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
</html>`,
      fileType: 'html',
      type: 'html',
      size: 0,
      isDirectory: false
    },
    {
      name: 'main.tsx',
      path: 'src/main.tsx',
      content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'App.tsx',
      path: 'src/App.tsx',
      content: `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Navigation and Footer components (to be defined in App.tsx)
const Navigation = () => (
  <nav className="bg-white shadow-md">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16">
        <div className="flex">
          <div className="flex-shrink-0 flex items-center">
            <span className="font-bold text-xl text-indigo-600">MyApp</span>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
            <a href="/" className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
              Home
            </a>
            <a href="/about" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
              About
            </a>
          </div>
        </div>
      </div>
    </div>
  </nav>
);

const Footer = () => (
  <footer className="bg-white border-t border-gray-200">
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <p className="text-center text-sm text-gray-500">
        © {new Date().getFullYear()} MyApp. All rights reserved.
      </p>
    </div>
  </footer>
);

// Sample page components (these would be in separate files in src/pages/)
const Home = () => (
  <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to MyApp</h1>
          <p className="text-lg text-gray-600">This is the home page of your multi-page React application.</p>
        </div>
      </div>
    </div>
  </div>
);

const About = () => (
  <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About Us</h1>
          <p className="text-lg text-gray-600">This is the about page of your multi-page React application.</p>
        </div>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'App.css',
      path: 'src/App.css',
      content: `#root {
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
}`,
      fileType: 'css',
      type: 'css',
      size: 0,
      isDirectory: false
    },
    {
      name: 'index.css',
      path: 'src/index.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
      fileType: 'css',
      type: 'css',
      size: 0,
      isDirectory: false
    },
    {
      name: '.eslintrc.cjs',
      path: '.eslintrc.cjs',
      content: `module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}`,
      fileType: 'javascript',
      type: 'javascript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'vite.svg',
      path: 'public/vite.svg',
      content: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFEA83"></stop><stop offset="8.333%" stop-color="#FFDD35"></stop><stop offset="100%" stop-color="#FFA800"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.922l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.88-4.114l16.646-57.705c.346-1.207-.07-2.48-1.097-3.079Z"></path></svg>`,
      fileType: 'svg',
      type: 'svg',
      size: 0,
      isDirectory: false
    },
    {
      name: 'react.svg',
      path: 'public/react.svg',
      content: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="35.93" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 228"><path fill="#00D8FF" d="M210.483 73.824a171.49 171.49 0 0 0-8.24-2.597c.465-1.9.893-3.777 1.273-5.621c6.238-30.281 2.16-54.676-10.332-62.708c-12.065-7.7-29.006.329-43.54 19.526a171.23 171.23 0 0 0-6.375 8.05c-18.452-5.098-37.194-8.446-55.904-9.938c-1.621-.133-3.222-.26-4.811-.38c.116-1.098.234-2.194.354-3.287C99.735 3.471 108.873.393 117.31.393c12.575 0 20.323 6.72 22.568 18.442c.198 1.006.29 2.077.354 3.22c.377 6.478.553 13.21.553 20.069c0 6.747-.158 13.378-.5 19.764c-.063 1.089-.152 2.183-.267 3.28c1.609-.12 3.231-.247 4.863-.38c18.887-1.52 37.796-4.914 56.397-10.163a145.788 145.788 0 0 1 6.491-8.207c14.739-19.422 31.946-27.462 44.004-19.764c12.637 8.08 16.777 32.754 10.504 63.025c-.38 1.844-.808 3.721-1.273 5.621a171.49 171.49 0 0 0-8.24 2.597c-19.026 6.15-37.927 15.798-56.263 28.525c18.336 12.727 37.237 22.375 56.263 28.525a171.49 171.49 0 0 0 8.24 2.597c.465 1.9.893 3.777 1.273 5.621c6.273 30.271 2.133 54.945-10.504 63.025c-12.058 7.698-29.265-.342-44.004-19.764a145.788 145.788 0 0 1-6.491-8.207c-18.601-5.249-37.51-8.643-56.397-10.163c-1.632-.133-3.254-.26-4.863-.38c.115-1.097.204-2.191.267-3.28c.342-6.386.5-13.017.5-19.764c0-6.859-.176-13.591-.553-20.069c-.064-1.143-.156-2.214-.354-3.22c-2.245-11.722-9.993-18.442-22.568-18.442c-8.437 0-17.575 3.078-25.297 9.42c-.12 1.093-.238 2.189-.354 3.287c-1.589.12-3.19.247-4.811.38c-18.71 1.492-37.452 4.84-55.904 9.938a171.23 171.23 0 0 0-6.375-8.05c-14.534-19.197-31.475-27.226-43.54-19.526c-12.492 8.032-16.57 32.427-10.332 62.708c.38 1.844.808 3.721 1.273 5.621a171.49 171.49 0 0 0 8.24 2.597c19.026 6.15 37.927 15.798 56.263 28.525C172.556 89.622 191.457 79.974 210.483 73.824zM128.036 163.754c-19.893 0-36.236-16.343-36.236-36.236s16.343-36.236 36.236-36.236s36.236 16.343 36.236 36.236S147.929 163.754 128.036 163.754z"></path></svg>`,
      fileType: 'svg',
      type: 'svg',
      size: 0,
      isDirectory: false
    },
    {
      name: '.gitignore',
      path: '.gitignore',
      content: `# Logs
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
*.sw?

# Environment files
.env.local
.env.development.local
.env.test.local
.env.production.local
`,
      fileType: 'text',
      type: 'text',
      size: 0,
      isDirectory: false
    },
    // Add default .env file to the template
    {
      name: '.env',
      path: '.env',
      content: `# Environment variables for the application
# Add your environment variables here
# Example:
# VITE_API_URL=https://api.example.com
# VITE_APP_TITLE=My App

# Note: For client-side variables in Vite, prefix with VITE_
# For server-side variables, they should be set in the deployment environment
`,
      fileType: 'env',
      type: 'text',
      size: 0,
      isDirectory: false
    },
    // Add .env.local file for local environment variables
    {
      name: '.env.local',
      path: '.env.local',
      content: `# Local environment variables (not committed to git)
# Add your local environment variables here
# Example:
# VITE_API_KEY=your_local_api_key
# VITE_DATABASE_URL=your_local_database_url

# This file is typically used for sensitive information
# and should be added to .gitignore
`,
      fileType: 'env',
      type: 'text',
      size: 0,
      isDirectory: false
    },
    {
      name: 'README.md',
      path: 'README.md',
      content: `# Vite + React + TypeScript + Tailwind CSS

This template provides a fast, modern development experience with:

- ⚡️ [Vite](https://vitejs.dev/) - Fast build tool and dev server
- ⚛️ [React 18](https://reactjs.org/) - UI library with React Router v6
- 🔷 [TypeScript](https://www.typescriptlang.org/) - Type safety
- 🎨 [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

## Getting Started

1. **Install dependencies:**
   \`\`\`bash
   pnpm install
   \`\`\`

2. **Start development server:**
   \`\`\`bash
   pnpm dev
   \`\`\`

3. **Build for production:**
   \`\`\`bash
   pnpm build
   \`\`\`

4. **Preview production build:**
   \`\`\`bash
   pnpm preview
   \`\`\`

## Project Structure

\`\`\`
src/
├── App.tsx          # Main application component with routing
├── App.css          # App-specific styles
├── index.css        # Global styles with Tailwind
├── main.tsx         # Application entry point
├── pages/           # Page components with routing
│   ├── Home.tsx
│   ├── About.tsx
│   └── Contact.tsx
├── components/      # Reusable UI components
├── hooks/           # Custom React hooks
└── utils/           # Utility functions
\`\`\`

## Features

- 🚀 **Fast Refresh** - Instant updates during development
- 📱 **Responsive Design** - Mobile-first with Tailwind CSS
- 🎯 **Type Safety** - Full TypeScript support
- 🔧 **ESLint** - Code quality and consistency
- 📦 **Modern Build** - ES modules and tree shaking
- 🔄 **Routing** - Multi-page navigation with React Router v6

## Customization

- Edit \`src/App.tsx\` to modify the main component and routing
- Update \`tailwind.config.js\` to customize Tailwind
- Modify \`vite.config.ts\` for build configuration
- Add new components in the \`src/\` directory

## AI Development

This project includes \`AIRULES.md\` with comprehensive guidelines for AI-assisted development. The AI will use these rules to:

- Generate code following React and TypeScript best practices
- Apply Tailwind CSS for consistent styling
- Maintain proper component structure and state management
- Ensure responsive design and accessibility
- Follow established patterns for forms, API integration, and state management
- Create responsive, accessible, and performant components
- Implement proper multi-page routing with React Router

## Deployment

This project is ready to deploy to:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting service

Happy coding! 🎉`,
      fileType: 'text',
      type: 'text',
      size: 0,
      isDirectory: false
    },
    // Add sample page files
    {
      name: 'Home.tsx',
      path: 'src/pages/Home.tsx',
      content: `import React from 'react';

const Home = () => {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to MyApp</h1>
            <p className="text-lg text-gray-600">This is the home page of your multi-page React application.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'About.tsx',
      path: 'src/pages/About.tsx',
      content: `import React from 'react';

const About = () => {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">About Us</h1>
            <p className="text-lg text-gray-600">This is the about page of your multi-page React application.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
  ]

  /**
   * Apply the default Vite React template to a new workspace
   */
  static async applyViteReactTemplate(workspaceId: string): Promise<void> {
    try {
      console.log(`🎯 Applying Vite React template to workspace: ${workspaceId}`)
      console.log(`📁 Template files to create: ${this.VITE_REACT_TEMPLATE_FILES.length}`)
      
      // Create all template files
      for (const templateFile of this.VITE_REACT_TEMPLATE_FILES) {
        console.log(`📝 Creating file: ${templateFile.path}`)
        const createdFile = await storageManager.createFile({
          workspaceId,
          name: templateFile.name,
          path: templateFile.path,
          content: templateFile.content,
          fileType: templateFile.fileType,
          type: templateFile.type,
          size: templateFile.content.length,
          isDirectory: false
        })
        console.log(`✅ Created file: ${createdFile.name} with ID: ${createdFile.id}`)
      }
      
      // Verify files were created
      const createdFiles = await storageManager.getFiles(workspaceId)
      console.log(`🔍 Verification: Found ${createdFiles.length} files in workspace ${workspaceId}`)
      console.log(`📋 Files:`, createdFiles.map(f => ({ name: f.name, path: f.path, size: f.size })))
      
      console.log(`🎉 Vite React template applied successfully to workspace: ${workspaceId}`)
    } catch (error) {
      console.error(`❌ Error applying Vite React template to workspace ${workspaceId}:`, error)
      throw error
    }
  }

  /**
   * Create a new workspace with the default Vite React template
   */
  static async createWorkspaceWithTemplate(workspaceData: Omit<Workspace, 'id' | 'slug' | 'createdAt' | 'updatedAt'>) {
    try {
      // Generate a slug from the workspace name
      const slug = workspaceData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      console.log(`🔗 Generated slug: ${slug}`)

      // Create the workspace first (local)
      const workspace = await storageManager.createWorkspace({
        ...workspaceData,
        slug
      })
      console.log(`✅ Workspace created with ID: ${workspace.id}`)

      // Apply the default template (local)
      await this.applyViteReactTemplate(workspace.id)

      // Final verification
      const finalFiles = await storageManager.getFiles(workspace.id)
      console.log(`🎯 Final verification: Workspace ${workspace.id} has ${finalFiles.length} files`)

  // ...local storage only. No Supabase persistence...

      return workspace
    } catch (error) {
      console.error('❌ Error creating workspace with template:', error)
      throw error
    }
  }

  /**
   * Get available templates
   */
  static getAvailableTemplates() {
    return [
      {
        id: 'vite-react',
        name: 'Vite React + TypeScript + Tailwind CSS',
        description: 'A modern React application with Vite, TypeScript, and Tailwind CSS',
        category: 'React',
        tags: ['react', 'typescript', 'vite', 'tailwind'],
        files: this.VITE_REACT_TEMPLATE_FILES.length
      }
    ]
  }
}

// Export the template service
export const templateService = new TemplateService()
