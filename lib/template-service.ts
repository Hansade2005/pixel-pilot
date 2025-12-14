// Template service for applying default project templates
import { storageManager } from './storage-manager'
import type { Workspace, File } from './storage-manager'





export class TemplateService {
  // Default Vite React + TypeScript + Tailwind CSS template files
  private static readonly VITE_REACT_TEMPLATE_FILES: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
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
    "build": "tsc --noEmit || true && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview --port 3000"
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
    "@radix-ui/react-icons": "^1.3.0",

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
    "remark-gfm": "^4.0.1",

    "@tanstack/react-table": "^8.20.5",
    "@vercel/node": "^3.0.0",
    "@dyad-sh/react-vite-component-tagger": "0.8.0"

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
    "tailwindcss-animate": "^1.0.7",
    "@babel/core": "^7.24.0",
    "@babel/preset-react": "^7.23.3",
    "@babel/preset-typescript": "^7.23.3",
    "@babel/types": "^7.24.0"
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
import path from 'path'
import { visualEditorPlugin } from './vite-plugin-visual-editor'
import dyadTagger from '@dyad-sh/react-vite-component-tagger'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Component Tagger Plugin - enhances visual editor source mapping
    // Set VITE_ENABLE_VISUAL_EDITOR=true to activate
    process.env.VITE_ENABLE_VISUAL_EDITOR === 'true' && dyadTagger(),
    // Visual Editor Plugin - enables source mapping for visual editing
    // Set VITE_ENABLE_VISUAL_EDITOR=true to activate
    process.env.VITE_ENABLE_VISUAL_EDITOR === 'true' && visualEditorPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
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
      name: 'vite-plugin-visual-editor.ts',
      path: 'vite-plugin-visual-editor.ts',
      content: `// Visual Editor Vite Plugin
// Adds source file info (data-ve-id, data-ve-file, data-ve-line) to JSX elements
// This enables the visual editor to map DOM elements back to source code

import { Plugin } from 'vite';
import * as babel from '@babel/core';
import * as t from '@babel/types';

export function visualEditorPlugin(): Plugin {
  return {
    name: 'vite-visual-editor',
    enforce: 'pre',
    transform(code: string, id: string) {
      // Only process JSX/TSX files in src directory
      if (!id.match(/\\/src\\/.*\\.[jt]sx?$/)) return null;
      if (id.includes('node_modules')) return null;

      try {
        const result = babel.transformSync(code, {
          filename: id,
          presets: [
            ['@babel/preset-react', { runtime: 'automatic' }],
            '@babel/preset-typescript',
          ],
          plugins: [
            function visualEditorBabelPlugin() {
              let elementIndex = 0;
              
              return {
                visitor: {
                  JSXOpeningElement(path: any) {
                    const { node } = path;
                    const loc = node.loc;
                    
                    if (!loc) return;
                    
                    // Skip if already has data-ve-id
                    const hasVeId = node.attributes.some(
                      (attr: any) => attr.type === 'JSXAttribute' && 
                        attr.name?.name === 'data-ve-id'
                    );
                    if (hasVeId) return;
                    
                    // Create relative path from project root
                    const relativePath = id.replace(/^.*\\/src\\//, 'src/');
                    
                    // Add data-ve-id attribute (unique identifier)
                    const idAttr = t.jsxAttribute(
                      t.jsxIdentifier('data-ve-id'),
                      t.stringLiteral(\`\${relativePath}:\${loc.start.line}:\${elementIndex++}\`)
                    );
                    
                    // Add data-ve-file attribute (source file path)
                    const fileAttr = t.jsxAttribute(
                      t.jsxIdentifier('data-ve-file'),
                      t.stringLiteral(relativePath)
                    );
                    
                    // Add data-ve-line attribute (line number)
                    const lineAttr = t.jsxAttribute(
                      t.jsxIdentifier('data-ve-line'),
                      t.stringLiteral(String(loc.start.line))
                    );
                    
                    node.attributes.push(idAttr, fileAttr, lineAttr);
                  },
                },
              };
            },
          ],
          sourceMaps: true,
        });

        if (result && result.code) {
          return {
            code: result.code,
            map: result.map,
          };
        }
      } catch (error) {
        // Silently fail - visual editor source mapping is optional
        // console.warn('[Visual Editor Plugin] Transform error:', error);
      }

      return null;
    },
  };
}

export default visualEditorPlugin;
`,
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

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },

    /* Linting */
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "vite-plugin-visual-editor.ts"],
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
  "include": ["vite.config.ts", "vite-plugin-visual-editor.ts"]
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
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
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
    
    <!-- Google Fonts Preconnect -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    
    <!-- Google Fonts - All supported font families -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&family=Open+Sans:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&family=Lato:wght@300;400;700&family=Nunito:wght@300;400;500;600;700&family=Raleway:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&family=Urbanist:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Lexend:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=Figtree:wght@300;400;500;600;700&family=Cabin:wght@400;500;600;700&family=PT+Sans:wght@400;700&family=Manrope:wght@300;400;500;600;700&family=Mulish:wght@300;400;500;600;700&family=Sofia+Sans:wght@300;400;500;600;700&family=Josefin+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Serif Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&family=Playfair+Display:wght@400;500;600;700&family=Lora:wght@400;500;600;700&family=Domine:wght@400;500;600;700&family=Crimson+Text:wght@400;600;700&family=DM+Serif+Display&family=DM+Serif+Text&family=Cormorant+Garamond:wght@300;400;500;600;700&family=Cardo:wght@400;700&family=Libre+Baskerville:wght@400;700&family=Spectral:wght@300;400;500;600;700&family=EB+Garamond:wght@400;500;600;700&family=Old+Standard+TT:wght@400;700&family=Bodoni+Moda:wght@400;500;600;700&family=Cormorant:wght@300;400;500;600;700&family=Cinzel:wght@400;500;600;700&family=Cinzel+Decorative:wght@400;700&family=Forum&family=Tenor+Sans&family=Gilda+Display&family=Fraunces:wght@300;400;500;600;700&family=Rosarivo&display=swap" rel="stylesheet">
    
    <!-- Monospace Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Fira+Code:wght@300;400;500;600;700&family=Source+Code+Pro:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Inconsolata:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&family=Cousine:wght@400;700&family=Noto+Sans+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Handwritten & Script Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Dancing+Script:wght@400;500;600;700&family=Caveat:wght@400;500;600;700&family=Sacramento&family=Shantell+Sans:wght@300;400;500;600;700&family=Amatic+SC:wght@400;700&family=Great+Vibes&family=Parisienne&family=Shadows+Into+Light&family=Yellowtail&family=Satisfy&family=Allura&family=Indie+Flower&family=Kristi&family=Bad+Script&family=Mrs+Saint+Delafield&family=Marck+Script&display=swap" rel="stylesheet">
    
    <!-- Display & Decorative Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@300;400;500;600;700&family=Anton&family=Abril+Fatface&family=Bungee&family=Alfa+Slab+One&family=Lobster&family=Rubik+Dirt&family=Playball&family=Fredoka:wght@300;400;500;600;700&family=Monoton&family=Righteous&family=Ultra&family=Press+Start+2P&family=Rampart+One&display=swap" rel="stylesheet">
    
    <!-- Futuristic & Tech Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Exo+2:wght@300;400;500;600;700&family=Audiowide&family=Oxanium:wght@300;400;500;600;700&family=Quantico:wght@400;700&family=Syncopate:wght@400;700&family=Teko:wght@300;400;500;600;700&family=Rajdhani:wght@300;400;500;600;700&family=Changa:wght@300;400;500;600;700&family=Michroma&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <!-- Visual Editor Client - enables visual editing when loaded in pipilot.dev iframe -->
    <script src="/visual-editor-client.js" defer></script>
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
      content: `function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="bg-card border border-border rounded-lg p-6 mb-6 shadow-sm">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Hello World, it's You 🌍
          </h1>
          <p className="text-muted-foreground text-lg">
            Welcome to your enhanced React + Vite app. Let's build something amazing together!
          </p>
        </header>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Lightning Fast</h3>
            <p className="text-muted-foreground">
              Generate complete applications in minutes, not hours. Our AI understands your vision instantly.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">🎨</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Beautiful UI</h3>
            <p className="text-muted-foreground">
              Modern, responsive design with purposeful interactions and clean aesthetics built-in.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Privacy First</h3>
            <p className="text-muted-foreground">
              Architected with encrypted data and compliance-ready workflows to keep your users safe.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-secondary border border-border rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-secondary-foreground mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-6">
            This landing page is powered by CSS variables. Change themes and see the magic happen instantly!
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:opacity-90 transition-opacity">
              Get Started
            </button>
            <button className="bg-accent text-accent-foreground px-6 py-3 rounded-md font-medium hover:opacity-90 transition-opacity border border-border">
              Learn More
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-muted-foreground text-sm">
          <p>© 2025 Your App — Built with React + Vite + Tailwind CSS</p>
        </footer>
      </div>
    </div>
  )
}

export default App`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'App.css',
      path: 'src/App.css',
      content: `/* Additional custom styles can go here if needed */
/* Most styling is handled by Tailwind CSS utility classes */`,
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
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}`,
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
      name: 'visual-editor-client.js',
      path: 'public/visual-editor-client.js',
      content: `/**
 * Visual Editor Client - Embedded in production builds
 * Enables visual editing when the app is loaded in an iframe from pipilot.dev
 * Works with both development (E2B) and production (Supabase hosting) scenarios
 */
(function() {
  'use strict';
  
  // Only run in iframe context
  if (window === window.parent) {
    console.log('[VE-Client] Not in iframe, skipping initialization');
    return;
  }

  // Allowed parent origins for security
  // Supports: pipilot.dev main site, *.pipilot.dev subdomains, *.e2b.app E2B URLs, localhost
  const ALLOWED_ORIGINS = [
    'https://pipilot.dev',
    'https://www.pipilot.dev',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
  ];
  
  // Check if origin is allowed (supports wildcards for subdomains)
  function isAllowedOrigin(origin) {
    if (!origin) return false;
    // Exact match
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    // *.pipilot.dev subdomains (e.g., code-lens-stream.pipilot.dev)
    if (origin.endsWith('.pipilot.dev')) return true;
    // *.e2b.app URLs (e.g., 3000-ikmd9ltiykjsfg57q5pf3.e2b.app)
    if (origin.endsWith('.e2b.app')) return true;
    return false;
  }

  // State
  let isEnabled = false;
  let selectedElements = new Map();
  let hoveredElement = null;
  let hoverOverlay = null;
  let selectionOverlays = new Map();
  let elementIdCounter = 1;
  const elementIdMap = new WeakMap();

  // Generate unique element ID using DOM path
  function generateElementId(element) {
    if (elementIdMap.has(element)) {
      return elementIdMap.get(element);
    }
    
    // Check for existing data-ve-id (from build-time plugin)
    const existingId = element.getAttribute('data-ve-id');
    if (existingId) {
      elementIdMap.set(element, existingId);
      return existingId;
    }
    
    // Generate DOM path-based ID for production
    const path = getDOMPath(element);
    const id = 've-' + path;
    element.setAttribute('data-ve-id', id);
    elementIdMap.set(element, id);
    return id;
  }

  // Get DOM path for element identification
  function getDOMPath(element) {
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += '#' + current.id;
        path.unshift(selector);
        break;
      }
      
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\\s+/).slice(0, 2).join('.');
        if (classes) selector += '.' + classes;
      }
      
      // Add index if needed
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current);
          selector += ':nth(' + index + ')';
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join('>');
  }

  // Get computed styles for an element
  function getComputedStyleInfo(element) {
    const computed = window.getComputedStyle(element);
    return {
      display: computed.display,
      position: computed.position,
      flexDirection: computed.flexDirection,
      justifyContent: computed.justifyContent,
      alignItems: computed.alignItems,
      gap: computed.gap,
      marginTop: computed.marginTop,
      marginRight: computed.marginRight,
      marginBottom: computed.marginBottom,
      marginLeft: computed.marginLeft,
      paddingTop: computed.paddingTop,
      paddingRight: computed.paddingRight,
      paddingBottom: computed.paddingBottom,
      paddingLeft: computed.paddingLeft,
      width: computed.width,
      height: computed.height,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      borderRadius: computed.borderRadius,
    };
  }

  // Check if element should be ignored
  function shouldIgnoreElement(element) {
    if (!element || element.nodeType !== 1) return true;
    const ignoreTags = ['SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'HTML', 'NOSCRIPT'];
    if (ignoreTags.includes(element.tagName)) return true;
    if (element.closest('[data-ve-overlay]')) return true;
    const computed = window.getComputedStyle(element);
    if (computed.display === 'none' || computed.visibility === 'hidden') return true;
    return false;
  }

  // Get element info for parent
  function getElementInfo(element) {
    if (shouldIgnoreElement(element)) return null;
    
    const id = generateElementId(element);
    const rect = element.getBoundingClientRect();
    const sourceFile = element.getAttribute('data-ve-file');
    const sourceLine = element.getAttribute('data-ve-line');
    
    // Get only the FIRST direct text node content to prevent duplication
    let textContent = '';
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        textContent = node.textContent.trim();
        break;
      }
    }
    
    return {
      id,
      tagName: element.tagName,
      textContent: textContent,
      className: element.className || '',
      computedStyles: getComputedStyleInfo(element),
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      sourceFile: sourceFile || undefined,
      sourceLine: sourceLine ? parseInt(sourceLine, 10) : undefined,
    };
  }

  // Send message to parent with origin check
  function sendToParent(message) {
    try {
      window.parent.postMessage(message, '*');
    } catch (e) {
      console.warn('[VE-Client] Failed to send message:', e);
    }
  }

  // Create overlay element
  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.setAttribute('data-ve-overlay', 'true');
    overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:999999;box-sizing:border-box;transition:all 0.1s ease;';
    document.body.appendChild(overlay);
    return overlay;
  }

  // Update overlay position and style
  function updateOverlay(overlay, rect, type) {
    if (!overlay) return;
    const isHover = type === 'hover';
    const color = isHover ? 'rgba(59,130,246,0.5)' : 'rgba(37,99,235,0.7)';
    const bg = isHover ? 'rgba(59,130,246,0.05)' : 'rgba(37,99,235,0.05)';
    overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:999999;box-sizing:border-box;' +
      'top:' + rect.top + 'px;left:' + rect.left + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;' +
      'border:2px solid ' + color + ';background:' + bg + ';transition:all 0.1s ease;';
  }

  // Remove overlay
  function removeOverlay(overlay) {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  // Find element by ID
  function findElementById(id) {
    return document.querySelector('[data-ve-id=\"' + id + '\"]');
  }

  // Clear all selections
  function clearSelection() {
    selectedElements.clear();
    selectionOverlays.forEach(removeOverlay);
    selectionOverlays.clear();
  }

  // Event Handlers
  function handleMouseMove(e) {
    if (!isEnabled) return;
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element || shouldIgnoreElement(element)) {
      if (hoveredElement) {
        hoveredElement = null;
        removeOverlay(hoverOverlay);
        hoverOverlay = null;
        sendToParent({ type: 'ELEMENT_HOVERED', payload: { element: null } });
      }
      return;
    }
    
    const elementId = generateElementId(element);
    if (hoveredElement !== element && !selectedElements.has(elementId)) {
      hoveredElement = element;
      if (!hoverOverlay) hoverOverlay = createOverlay();
      updateOverlay(hoverOverlay, element.getBoundingClientRect(), 'hover');
      sendToParent({ type: 'ELEMENT_HOVERED', payload: { element: getElementInfo(element) } });
    }
  }

  function handleClick(e) {
    if (!isEnabled) return;
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element || shouldIgnoreElement(element)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const elementId = generateElementId(element);
    const isMultiSelect = e.ctrlKey || e.metaKey;
    
    if (isMultiSelect) {
      if (selectedElements.has(elementId)) {
        selectedElements.delete(elementId);
        removeOverlay(selectionOverlays.get(elementId));
        selectionOverlays.delete(elementId);
        sendToParent({ type: 'ELEMENT_DESELECTED', payload: { elementId } });
      } else {
        selectedElements.set(elementId, element);
        const overlay = createOverlay();
        selectionOverlays.set(elementId, overlay);
        updateOverlay(overlay, element.getBoundingClientRect(), 'selected');
        sendToParent({ type: 'ELEMENT_SELECTED', payload: { elements: [getElementInfo(element)], isMultiSelect: true } });
      }
    } else {
      clearSelection();
      selectedElements.set(elementId, element);
      const overlay = createOverlay();
      selectionOverlays.set(elementId, overlay);
      updateOverlay(overlay, element.getBoundingClientRect(), 'selected');
      sendToParent({ type: 'ELEMENT_SELECTED', payload: { elements: [getElementInfo(element)], isMultiSelect: false } });
    }
    
    if (hoverOverlay) { removeOverlay(hoverOverlay); hoverOverlay = null; }
    hoveredElement = null;
  }

  function handleKeyDown(e) {
    if (!isEnabled) return;
    if (e.key === 'Escape') {
      clearSelection();
      sendToParent({ type: 'CLEAR_SELECTION', payload: {} });
    }
  }

  function handleScroll() {
    selectionOverlays.forEach(function(overlay, elementId) {
      const element = findElementById(elementId);
      if (element) updateOverlay(overlay, element.getBoundingClientRect(), 'selected');
    });
    if (hoverOverlay && hoveredElement) {
      updateOverlay(hoverOverlay, hoveredElement.getBoundingClientRect(), 'hover');
    }
  }

  // Load a Google Font dynamically
  function loadGoogleFont(fontFamily) {
    // Skip system fonts
    var systemFonts = ['system-ui', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'sans-serif', 'serif', 'monospace'];
    if (systemFonts.some(function(sf) { return fontFamily.toLowerCase().includes(sf.toLowerCase()); })) {
      return;
    }
    
    // Clean font name (remove fallbacks like "Inter, sans-serif")
    var cleanFont = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
    if (!cleanFont) return;
    
    // Check if already loaded
    var fontId = 'google-font-' + cleanFont.replace(/\\s+/g, '-').toLowerCase();
    if (document.getElementById(fontId)) {
      console.log('[VE-Client] Font already loaded:', cleanFont);
      return;
    }
    
    // Create link element
    var link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(cleanFont) + ':wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
    console.log('[VE-Client] Loaded Google Font:', cleanFont);
  }

  // Apply style changes from parent
  function applyStyleChanges(elementId, changes) {
    const element = findElementById(elementId);
    if (!element) return false;
    changes.forEach(function(change) {
      const prop = change.property.replace(/([A-Z])/g, '-$1').toLowerCase();
      
      // If it's a font-family change, load the Google Font first
      if (prop === 'font-family') {
        loadGoogleFont(change.newValue);
      }
      
      element.style.setProperty(prop, change.newValue);
    });
    const overlay = selectionOverlays.get(elementId);
    if (overlay) updateOverlay(overlay, element.getBoundingClientRect(), 'selected');
    sendToParent({ type: 'STYLE_APPLIED', payload: { elementId, success: true } });
    return true;
  }

  // Update text content from parent
  function updateTextContent(elementId, text) {
    const element = findElementById(elementId);
    if (!element) return false;
    
    // Find and update only the FIRST text node to prevent duplication
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = text;
        sendToParent({ type: 'TEXT_UPDATED', payload: { elementId, success: true } });
        return true;
      }
    }
    
    // If no text node exists, prepend one for elements with children
    if (element.children.length > 0) {
      element.insertBefore(document.createTextNode(text), element.firstChild);
      sendToParent({ type: 'TEXT_UPDATED', payload: { elementId, success: true } });
      return true;
    }
    
    // For simple elements with no children, set textContent directly
    element.textContent = text;
    sendToParent({ type: 'TEXT_UPDATED', payload: { elementId, success: true } });
    return true;
  }

  // Message handler
  function handleMessage(event) {
    // Security: Only allow messages from known origins
    if (!isAllowedOrigin(event.origin)) {
      return;
    }
    
    var message = event.data;
    if (!message || !message.type) return;
    
    switch (message.type) {
      case 'VISUAL_EDITOR_INIT':
      case 'VISUAL_EDITOR_TOGGLE':
        isEnabled = message.payload.enabled;
        if (!isEnabled) {
          clearSelection();
          if (hoverOverlay) { removeOverlay(hoverOverlay); hoverOverlay = null; }
          hoveredElement = null;
        }
        document.body.style.cursor = isEnabled ? 'crosshair' : '';
        sendToParent({ type: 'VISUAL_EDITOR_READY', payload: { enabled: isEnabled } });
        break;
      case 'CLEAR_SELECTION':
        clearSelection();
        break;
      case 'APPLY_STYLE':
        applyStyleChanges(message.payload.elementId, message.payload.changes);
        break;
      case 'UPDATE_TEXT':
        updateTextContent(message.payload.elementId, message.payload.text);
        break;
      case 'REQUEST_ELEMENT_INFO':
        var el = findElementById(message.payload.elementId);
        if (el) sendToParent({ type: 'ELEMENT_INFO_RESPONSE', payload: { element: getElementInfo(el) } });
        break;
      case 'APPLY_THEME_PREVIEW':
        console.log('[VE-Client] Received APPLY_THEME_PREVIEW message');
        applyThemePreview(message.payload.themeVars);
        break;
      case 'CLEAR_THEME_PREVIEW':
        console.log('[VE-Client] Received CLEAR_THEME_PREVIEW message');
        clearThemePreview();
        break;
      case 'DRAG_ELEMENT_START':
        console.log('[VE-Client] Received DRAG_ELEMENT_START message');
        startDragMode(message.payload.elementType, message.payload.content);
        break;
      case 'DRAG_ELEMENT_END':
        console.log('[VE-Client] Received DRAG_ELEMENT_END message');
        endDragMode();
        break;
      case 'INSERT_ELEMENT':
        console.log('[VE-Client] Received INSERT_ELEMENT message');
        insertElement(message.payload.content, message.payload.targetElementId, message.payload.position);
        break;
    }
  }

  // Apply theme preview - set CSS variables directly on :root (like thmeswitcher.html)
  function applyThemePreview(themeVars) {
    console.log('[VE-Client] applyThemePreview called with vars:', themeVars ? Object.keys(themeVars).length + ' variables' : 'null');
    
    if (!themeVars || typeof themeVars !== 'object') {
      console.warn('[VE-Client] No theme variables provided');
      return;
    }
    
    // Apply CSS variables directly to :root using setProperty (same as thmeswitcher.html)
    var root = document.documentElement;
    var appliedCount = 0;
    var backgroundValue = null;
    
    Object.entries(themeVars).forEach(function(entry) {
      var key = entry[0];
      var value = entry[1];
      root.style.setProperty(key, value);
      appliedCount++;
      
      // Track background for direct application
      if (key === '--background') {
        backgroundValue = value;
      }
      
      // Log first few for debugging
      if (appliedCount <= 5) {
        console.log('[VE-Client] Set', key, '=', value);
      }
    });
    
    // Also apply background directly to body as fallback for apps that don't use CSS variables
    if (backgroundValue) {
      document.body.style.backgroundColor = 'hsl(' + backgroundValue + ')';
      console.log('[VE-Client] Also set body background to:', 'hsl(' + backgroundValue + ')');
    }
    
    // Verify the variables were set
    var testVar = root.style.getPropertyValue('--background');
    console.log('[VE-Client] Verification: --background =', testVar);
    console.log('[VE-Client] Root style attribute length:', root.getAttribute('style') ? root.getAttribute('style').length : 0);
    
    console.log('[VE-Client] Theme preview applied via setProperty,', appliedCount, 'CSS variables set');
    sendToParent({ type: 'THEME_PREVIEW_APPLIED', payload: { success: true, varsCount: appliedCount } });
  }

  // Clear theme preview - remove CSS variables from :root
  function clearThemePreview() {
    var root = document.documentElement;
    var computedStyle = window.getComputedStyle(root);
    var propsToRemove = [];
    
    // Collect all CSS custom properties
    for (var i = 0; i < root.style.length; i++) {
      var prop = root.style[i];
      if (prop.startsWith('--')) {
        propsToRemove.push(prop);
      }
    }
    
    // Remove them
    propsToRemove.forEach(function(prop) {
      root.style.removeProperty(prop);
    });
    
    console.log('[VE-Client] Theme preview cleared, removed', propsToRemove.length, 'CSS variables');
    sendToParent({ type: 'THEME_PREVIEW_CLEARED', payload: { success: true } });
  }

  // ============================================
  // DRAG AND DROP FUNCTIONS
  // ============================================
  var isDraggingElement = false;
  var dragElementType = null;
  var dragElementContent = null;
  var dropTargetOverlay = null;
  var currentDropTarget = null;
  var dropPosition = 'inside';

  function startDragMode(elementType, content) {
    isDraggingElement = true;
    dragElementType = elementType;
    dragElementContent = content;
    document.body.style.cursor = 'copy';
    
    // Create drop target overlay
    if (!dropTargetOverlay) {
      dropTargetOverlay = document.createElement('div');
      dropTargetOverlay.setAttribute('data-ve-overlay', 'true');
      dropTargetOverlay.id = 've-drop-overlay';
      dropTargetOverlay.style.cssText = 'position: fixed; pointer-events: none; z-index: 999998; box-sizing: border-box; border: 2px dashed #22c55e; background: rgba(34, 197, 94, 0.1); display: none;';
      document.body.appendChild(dropTargetOverlay);
    }
    
    // Add drag-specific event listeners
    document.addEventListener('mousemove', handleDragMove, true);
    document.addEventListener('click', handleDrop, true);
    document.addEventListener('keydown', handleDragKeyDown, true);
    
    console.log('[VE-Client] Drag mode started:', elementType);
    sendToParent({ type: 'DRAG_MODE_STARTED', payload: { elementType: elementType } });
  }

  function endDragMode() {
    isDraggingElement = false;
    dragElementType = null;
    dragElementContent = null;
    currentDropTarget = null;
    document.body.style.cursor = isEnabled ? 'crosshair' : '';
    
    // Hide drop overlay
    if (dropTargetOverlay) {
      dropTargetOverlay.style.display = 'none';
    }
    
    // Remove drag event listeners
    document.removeEventListener('mousemove', handleDragMove, true);
    document.removeEventListener('click', handleDrop, true);
    document.removeEventListener('keydown', handleDragKeyDown, true);
    
    console.log('[VE-Client] Drag mode ended');
  }

  function handleDragMove(event) {
    if (!isDraggingElement) return;
    
    var target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target || shouldIgnoreElement(target)) {
      if (dropTargetOverlay) dropTargetOverlay.style.display = 'none';
      currentDropTarget = null;
      return;
    }
    
    // Find valid drop container
    var foundDropTarget = findDropTarget(target);
    if (!foundDropTarget) {
      if (dropTargetOverlay) dropTargetOverlay.style.display = 'none';
      currentDropTarget = null;
      return;
    }
    
    currentDropTarget = foundDropTarget;
    
    // Determine drop position based on mouse position
    var rect = foundDropTarget.getBoundingClientRect();
    var mouseY = event.clientY;
    var relativeY = (mouseY - rect.top) / rect.height;
    
    if (relativeY < 0.25) {
      dropPosition = 'before';
    } else if (relativeY > 0.75) {
      dropPosition = 'after';
    } else {
      dropPosition = 'inside';
    }
    
    // Update drop overlay
    if (dropTargetOverlay) {
      dropTargetOverlay.style.display = 'block';
      
      if (dropPosition === 'before') {
        dropTargetOverlay.style.left = rect.left + 'px';
        dropTargetOverlay.style.top = (rect.top - 2) + 'px';
        dropTargetOverlay.style.width = rect.width + 'px';
        dropTargetOverlay.style.height = '4px';
        dropTargetOverlay.style.background = '#22c55e';
        dropTargetOverlay.style.border = 'none';
      } else if (dropPosition === 'after') {
        dropTargetOverlay.style.left = rect.left + 'px';
        dropTargetOverlay.style.top = (rect.bottom - 2) + 'px';
        dropTargetOverlay.style.width = rect.width + 'px';
        dropTargetOverlay.style.height = '4px';
        dropTargetOverlay.style.background = '#22c55e';
        dropTargetOverlay.style.border = 'none';
      } else {
        dropTargetOverlay.style.left = rect.left + 'px';
        dropTargetOverlay.style.top = rect.top + 'px';
        dropTargetOverlay.style.width = rect.width + 'px';
        dropTargetOverlay.style.height = rect.height + 'px';
        dropTargetOverlay.style.background = 'rgba(34, 197, 94, 0.1)';
        dropTargetOverlay.style.border = '2px dashed #22c55e';
      }
    }
  }

  function findDropTarget(element) {
    var validContainers = ['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'ASIDE', 'HEADER', 'FOOTER', 'NAV', 'FORM', 'UL', 'OL', 'BODY'];
    
    var current = element;
    while (current && current !== document.body) {
      if (validContainers.indexOf(current.tagName) !== -1 && !current.hasAttribute('data-ve-overlay')) {
        return current;
      }
      current = current.parentElement;
    }
    
    return document.body;
  }

  function handleDrop(event) {
    if (!isDraggingElement || !currentDropTarget || !dragElementContent) {
      endDragMode();
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    // Parse the JSX content and create HTML element
    var htmlContent = jsxToHtml(dragElementContent);
    
    // Create a temporary container to parse the HTML
    var temp = document.createElement('div');
    temp.innerHTML = htmlContent;
    var newElement = temp.firstElementChild;
    
    if (!newElement) {
      console.warn('[VE-Client] Failed to create element');
      endDragMode();
      return;
    }
    
    // Generate unique ID for the new element
    var elementId = 've-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    newElement.setAttribute('data-ve-id', elementId);
    
    // Insert element based on position
    if (dropPosition === 'before') {
      currentDropTarget.parentNode.insertBefore(newElement, currentDropTarget);
    } else if (dropPosition === 'after') {
      currentDropTarget.parentNode.insertBefore(newElement, currentDropTarget.nextSibling);
    } else {
      currentDropTarget.appendChild(newElement);
    }
    
    // Notify parent about the insertion
    sendToParent({
      type: 'ELEMENT_INSERTED',
      payload: {
        elementId: elementId,
        content: dragElementContent,
        position: dropPosition,
        parentTag: currentDropTarget.tagName
      }
    });
    
    console.log('[VE-Client] Element inserted:', elementId, 'position:', dropPosition);
    
    endDragMode();
  }

  function handleDragKeyDown(event) {
    if (event.key === 'Escape') {
      endDragMode();
      sendToParent({ type: 'DRAG_CANCELLED', payload: {} });
    }
  }

  function jsxToHtml(jsx) {
    if (!jsx) return '';
    
    return jsx
      .replace(/className=/g, 'class=')
      .replace(/htmlFor=/g, 'for=')
      .replace(/\\{[^}]*\\}/g, '')
      .replace(/<(\\w+)([^>]*)\\/>/g, '<$1$2></$1>')
      .replace(/\\s+/g, ' ')
      .trim();
  }

  function insertElement(content, targetElementId, position) {
    var target = targetElementId ? findElementById(targetElementId) : document.body;
    if (!target) {
      target = document.body;
    }
    
    var htmlContent = jsxToHtml(content);
    var temp = document.createElement('div');
    temp.innerHTML = htmlContent;
    var newElement = temp.firstElementChild;
    
    if (!newElement) {
      console.warn('[VE-Client] Failed to create element for insertion');
      return;
    }
    
    var elementId = 've-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    newElement.setAttribute('data-ve-id', elementId);
    
    if (position === 'before') {
      target.parentNode.insertBefore(newElement, target);
    } else if (position === 'after') {
      target.parentNode.insertBefore(newElement, target.nextSibling);
    } else {
      target.appendChild(newElement);
    }
    
    sendToParent({
      type: 'ELEMENT_INSERTED',
      payload: {
        elementId: elementId,
        content: content,
        position: position || 'inside'
      }
    });
    
    console.log('[VE-Client] Element inserted via INSERT_ELEMENT:', elementId);
  }

  // Initialize
  function init() {
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    window.addEventListener('message', handleMessage);
    
    // Notify parent we're ready
    sendToParent({ type: 'VISUAL_EDITOR_READY', payload: {} });
    console.log('[VE-Client] Initialized - waiting for parent commands');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`,
      fileType: 'javascript',
      type: 'javascript',
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
    {
      name: 'EXTERNAL_APP_INTEGRATION_GUIDE.md',
      path: 'EXTERNAL_APP_INTEGRATION_GUIDE.md',
      content: `# 🚀 Quick Start: API Keys for External Apps

---

## 📋 **AUTOMATIC DATABASE SETUP - AI INSTRUCTIONS**

**Great news!** You can now **automatically set up the entire database** using your agentic tools. No manual user setup required!

### 🤖 **Your Database Tools:**

You have complete database management capabilities:
- \`create_table\` - You generate optimized schemas from natural language descriptions
- \`list_tables\` - You discover all existing tables
- \`read_table\` - You inspect table structure and metadata
- \`delete_table\` - You remove tables when needed
- \`query_database\` - You perform advanced querying with MySQL-like syntax
- \`manipulate_table_data\` - You handle full CRUD operations (insert, update, delete)
- \`manage_api_keys\` - You generate secure API keys for external access

### 💡 **When User Requests Database Setup:**

The user will ask you things like:

**Example user requests:**
- "Create a users table with email, password, and profile fields"
- "Set up a complete blog database with posts, comments, and categories"
- "Add a products table with inventory tracking"
- "Generate an API key for my Vercel deployment"
- "Insert sample data for testing"

**Your Response:**
1. ✅ Use \`create_table\` to create tables with optimized schemas
2. ✅ Set up relationships and constraints automatically
3. ✅ Use \`manage_api_keys\` to generate API keys
4. ✅ Provide the user with database/table IDs
5. ✅ Use \`manipulate_table_data\` to insert sample data if requested

### 🔑 **What to Provide the User:**

After you create tables and API key, give them:
- Database ID
- Table ID(s)
- API Key (tell them to save it securely!)
- Ready-to-use code snippets

---

## Using Your Database in External Apps

### Step 3: Use in Your App

#### **Next.js App (Vercel):**

Create \`lib/database.ts\`:

\`\`\`typescript
const API_KEY = process.env.PIPILOT_API_KEY!;
const DATABASE_ID = 'YOUR_DATABASE_ID';
const BASE_URL = 'https://pipilot.dev/api/v1';

export async function getRecords(tableId: string) {
  const response = await fetch(
    \`\${BASE_URL}/databases/\${DATABASE_ID}/tables/\${tableId}/records\`,
    {
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch records');
  }
  
  return response.json();
}

export async function createRecord(tableId: string, data: any) {
  const response = await fetch(
    \`\${BASE_URL}/databases/\${DATABASE_ID}/tables/\${tableId}/records\`,
    {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data })
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to create record');
  }
  
  return response.json();
}

export async function updateRecord(tableId: string, recordId: string, data: any) {
  const response = await fetch(
    \`\${BASE_URL}/databases/\${DATABASE_ID}/tables/\${tableId}/records/\${recordId}\`,
    {
      method: 'PUT',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data })
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to update record');
  }
  
  return response.json();
}

export async function deleteRecord(tableId: string, recordId: string) {
  const response = await fetch(
    \`\${BASE_URL}/databases/\${DATABASE_ID}/tables/\${tableId}/records/\${recordId}\`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to delete record');
  }
  
  return response.json();
}
\`\`\`

#### **Use in a Server Component:**

\`\`\`typescript
// app/users/page.tsx
import { getRecords } from '@/lib/database';

export default async function UsersPage() {
  const { records } = await getRecords('YOUR_TABLE_ID');
  
  return (
    <div>
      <h1>Users</h1>
      {records.map((record: any) => (
        <div key={record.id}>
          {record.data_json.name} - {record.data_json.email}
        </div>
      ))}
    </div>
  );
}
\`\`\`

#### **Use in an API Route:**

\`\`\`typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { createRecord } from '@/lib/database';

export async function POST(request: Request) {
  const body = await request.json();
  
  try {
    const result = await createRecord('YOUR_TABLE_ID', {
      name: body.name,
      email: body.email
    });
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
\`\`\`

### Step 4: Set Environment Variable

Add to \`.env.local\`:

\`\`\`env
PIPILOT_API_KEY=sk_live_your_actual_key_here
\`\`\`

### Step 5: Deploy!

\`\`\`bash
# Vercel
vercel env add PIPILOT_API_KEY
vercel deploy

# Netlify
netlify env:set PIPILOT_API_KEY sk_live_your_key_here
netlify deploy
\`\`\`

---

## React Example (Client-Side)

\`\`\`typescript
'use client';

import { useState, useEffect } from 'react';

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      // Call your API route (not directly to pipilot.dev to keep API key secret)
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.records);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {users.map((user: any) => (
        <div key={user.id}>
          {user.data_json.name}
        </div>
      ))}
    </div>
  );
}
\`\`\`

---

## Vanilla JavaScript Example

\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <title>Users</title>
</head>
<body>
  <h1>Users</h1>
  <div id="users"></div>

  <script>
    const API_KEY = 'sk_live_your_key_here'; // ⚠️ Don't expose in production!
    const DATABASE_ID = 'YOUR_DATABASE_ID';
    const TABLE_ID = 'YOUR_TABLE_ID';

    async function fetchUsers() {
      const response = await fetch(
        \`https://pipilot.dev/api/v1/databases/\${DATABASE_ID}/tables/\${TABLE_ID}/records\`,
        {
          headers: {
            'Authorization': \`Bearer \${API_KEY}\`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      const usersDiv = document.getElementById('users');

      data.records.forEach(record => {
        const div = document.createElement('div');
        div.textContent = \`\${record.data_json.name} - \${record.data_json.email}\`;
        usersDiv.appendChild(div);
      });
    }

    fetchUsers();
  </script>
</body>
</html>
\`\`\`

---

## Python Example

\`\`\`python
import requests
import os

API_KEY = os.getenv('PIPILOT_API_KEY')
DATABASE_ID = 'YOUR_DATABASE_ID'
TABLE_ID = 'YOUR_TABLE_ID'
BASE_URL = 'https://pipilot.dev/api/v1'

def get_records():
    response = requests.get(
        f'{BASE_URL}/databases/{DATABASE_ID}/tables/{TABLE_ID}/records',
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        }
    )
    return response.json()

def create_record(data):
    response = requests.post(
        f'{BASE_URL}/databases/{DATABASE_ID}/tables/{TABLE_ID}/records',
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        },
        json={'data': data}
    )
    return response.json()

# Usage
records = get_records()
print(records)

new_user = create_record({
    'name': 'John Doe',
    'email': 'john@example.com'
})
print(new_user)
\`\`\`

---

## 🔒 Security Best Practices

### ✅ DO:
- Store API keys in environment variables
- Use server-side API routes to proxy requests
- Rotate keys periodically
- Revoke compromised keys immediately
- Use different keys for dev/staging/production

### ❌ DON'T:
- Commit API keys to Git
- Expose keys in client-side code
- Share keys publicly
- Use the same key across multiple apps

---

## 📊 Rate Limits

- **Default**: 1000 requests per hour
- **Headers**: Check \`X-RateLimit-Remaining\` header
- **On Exceeded**: Returns \`429 Too Many Requests\`

---

## 🆘 Troubleshooting

### Error: "Invalid API key"
- Check key format: Must start with \`sk_live_\`
- Verify key hasn't been revoked
- Ensure you're using the correct database ID

### Error: "Rate limit exceeded"
- Wait 1 hour or contact support to increase limit
- Implement caching to reduce requests

### Error: "Table not found"
- Verify database ID and table ID in URL
- Check table exists in pipilot.dev dashboard

---

## 💡 Tips

1. **Cache responses**: Don't fetch same data repeatedly
2. **Batch operations**: Create multiple records in a loop efficiently
3. **Error handling**: Always handle API errors gracefully
4. **Monitoring**: Track your API usage in the pipilot.dev dashboard

---

## 🎉 You're All Set!

Your external apps can now interact with your pipilot.dev databases! 🚀`,
      fileType: 'markdown',
      type: 'markdown',
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

# Visual Editor - Enable source mapping for visual editing
# Set to 'true' to enable (adds data-ve-* attributes to JSX elements)
VITE_ENABLE_VISUAL_EDITOR=true

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
├── App.tsx          # Main application component
├── App.css          # App-specific styles
├── index.css        # Global styles with Tailwind
├── main.tsx         # Application entry point
├── components/      # Reusable UI components
├── hooks/           # Custom React hooks
├── assets/          # Static assets (images, icons)
└── lib/             # Utility functions
\`\`\`

## Features

- 🚀 **Fast Refresh** - Instant updates during development
- 📱 **Responsive Design** - Mobile-first with Tailwind CSS
- 🎯 **Type Safety** - Full TypeScript support
- 🔧 **ESLint** - Code quality and consistency
- 📦 **Modern Build** - ES modules and tree shaking
- 🎣 **Custom Hooks** - Essential React hooks for common patterns
- 🧩 **UI Components** - Complete shadcn/ui component library
- 📊 **Data Tables** - Advanced table with sorting, filtering, pagination

## Available Templates

Choose from these comprehensive templates:

### 🚀 **Vite React Template**
- **Framework**: Vite + React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Features**: 25+ UI components, 10 custom hooks, fast HMR
- **Use Case**: Client-side applications, SPAs, prototypes

### ⚡ **Next.js Template**
- **Framework**: Next.js 14 + App Router + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Features**: SSR/SSG, API routes, 25+ UI components, 10 custom hooks
- **Use Case**: Full-stack applications, production websites

## Available Hooks

The template includes essential custom hooks in \`src/hooks/\`:

- **useLocalStorage** - Persistent state with localStorage
- **useDebounce** - Debounce values to optimize performance
- **useOnClickOutside** - Detect clicks outside elements
- **useMediaQuery** - Responsive design breakpoints
- **useMobile** - Mobile device detection (responsive)
- **useCopyToClipboard** - Copy text to clipboard
- **useInterval** - Custom interval with cleanup
- **usePrevious** - Access previous state values
- **useToggle** - Boolean state with toggle actions
- **useToast** - Easy toast notifications system

## Customization

- Edit \`src/App.tsx\` to modify the main component
- Update \`tailwind.config.js\` to customize Tailwind
- Modify \`vite.config.ts\` for build configuration
- Add new components in the \`src/components/\` directory
- Create custom hooks in the \`src/hooks/\` directory

## AI Development

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
    {
      name: 'react.svg',
      path: 'src/assets/react.svg',
      content: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="35.93" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 228"><path fill="#00D8FF" d="M210.483 73.824a171.49 171.49 0 0 0-8.24-2.597c.465-1.9.893-3.777 1.273-5.621c6.238-30.281 2.16-54.676-10.332-62.708c-12.065-7.7-29.006.329-43.54 19.526a171.23 171.23 0 0 0-6.375 8.05c-18.452-5.098-37.194-8.446-55.904-9.938c-1.621-.133-3.222-.26-4.811-.38c.116-1.098.234-2.194.354-3.287C99.735 3.471 108.873.393 117.31.393c12.575 0 20.323 6.72 22.568 18.442c.198 1.006.29 2.077.354 3.22c.377 6.478.553 13.21.553 20.069c0 6.747-.158 13.378-.5 19.764c-.063 1.089-.152 2.183-.267 3.28c1.609-.12 3.231-.247 4.863-.38c18.887-1.52 37.796-4.914 56.397-10.163a145.788 145.788 0 0 1 6.491-8.207c14.739-19.422 31.946-27.462 44.004-19.764c12.637 8.08 16.777 32.754 10.504 63.025c-.38 1.844-.808 3.721-1.273 5.621a171.49 171.49 0 0 0-8.24 2.597c-19.026 6.15-37.927 15.798-56.263 28.525c18.336 12.727 37.237 22.375 56.263 28.525a171.49 171.49 0 0 0 8.24 2.597c.465 1.9.893 3.777 1.273 5.621c6.273 30.271 2.133 54.945-10.504 63.025c-12.058 7.698-29.265-.342-44.004-19.764a145.788 145.788 0 0 1-6.491-8.207c-18.601-5.249-37.51-8.643-56.397-10.163c-1.632-.133-3.254-.26-4.863-.38c.115-1.097.204-2.191.267-3.28c.342-6.386.5-13.017.5-19.764c0-6.859-.176-13.591-.553-20.069c-.064-1.143-.156-2.214-.354-3.22c-2.245-11.722-9.993-18.442-22.568-18.442c-8.437 0-17.575 3.078-25.297 9.42c-.12 1.093-.238 2.189-.354 3.287c-1.589.12-3.19.247-4.811.38c-18.71 1.492-37.452 4.84-55.904 9.938a171.23 171.23 0 0 0-6.375-8.05c-14.534-19.197-31.475-27.226-43.54-19.526c-12.492 8.032-16.57 32.427-10.332 62.708c.38 1.844.808 3.721 1.273 5.621a171.49 171.49 0 0 0 8.24 2.597c19.026 6.15 37.927 15.798 56.263 28.525C172.556 89.622 191.457 79.974 210.483 73.824zM128.036 163.754c-19.893 0-36.236-16.343-36.236-36.236s16.343-36.236 36.236-36.236s36.236 16.343 36.236 36.236S147.929 163.754 128.036 163.754z"></path></svg>`,
      fileType: 'svg',
      type: 'svg',
      size: 0,
      isDirectory: false
    },
    // Add shadcn/ui components
    {
      name: 'sheet.tsx',
      path: 'src/components/ui/sheet.tsx',
      content: `import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'button.tsx',
      path: 'src/components/ui/button.tsx',
      content: `import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'card.tsx',
      path: 'src/components/ui/card.tsx',
      content: `import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'input.tsx',
      path: 'src/components/ui/input.tsx',
      content: `import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'label.tsx',
      path: 'src/components/ui/label.tsx',
      content: `import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'utils.ts',
      path: 'src/lib/utils.ts',
      content: `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'alert.tsx',
      path: 'src/components/ui/alert.tsx',
      content: `import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'badge.tsx',
      path: 'src/components/ui/badge.tsx',
      content: `import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'dialog.tsx',
      path: 'src/components/ui/dialog.tsx',
      content: `"use client"
      
      import * as React from "react"
      import * as DialogPrimitive from "@radix-ui/react-dialog"
      import { XIcon } from "lucide-react"
      
      import { cn } from "@/lib/utils"
      
      function Dialog({
        ...props
      }: React.ComponentProps<typeof DialogPrimitive.Root>) {
        return <DialogPrimitive.Root data-slot="dialog" {...props} />
      }
      
      function DialogTrigger({
        ...props
      }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
        return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
      }
      
      function DialogPortal({
        ...props
      }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
        return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
      }
      
      function DialogClose({
        ...props
      }: React.ComponentProps<typeof DialogPrimitive.Close>) {
        return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
      }
      
      function DialogOverlay({
        className,
        ...props
      }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
        return (
          <DialogPrimitive.Overlay
            data-slot="dialog-overlay"
            className={cn(
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
              className
            )}
            {...props}
          />
        )
      }
      
      function DialogContent({
        className,
        children,
        showCloseButton = true,
        ...props
      }: React.ComponentProps<typeof DialogPrimitive.Content> & {
        showCloseButton?: boolean
      }) {
        return (
          <DialogPortal data-slot="dialog-portal">
            <DialogOverlay />
            <DialogPrimitive.Content
              data-slot="dialog-content"
              className={cn(
                "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
                className
              )}
              {...props}
            >
              {children}
              {showCloseButton && (
                <DialogPrimitive.Close
                  data-slot="dialog-close"
                  className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                >
                  <XIcon />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              )}
            </DialogPrimitive.Content>
          </DialogPortal>
        )
      }
      
      function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
        return (
          <div
            data-slot="dialog-header"
            className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
            {...props}
          />
        )
      }
      
      function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
        return (
          <div
            data-slot="dialog-footer"
            className={cn(
              "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
              className
            )}
            {...props}
          />
        )
      }
      
      function DialogTitle({
        className,
        ...props
      }: React.ComponentProps<typeof DialogPrimitive.Title>) {
        return (
          <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn("text-lg leading-none font-semibold", className)}
            {...props}
          />
        )
      }
      
      function DialogDescription({
        className,
        ...props
      }: React.ComponentProps<typeof DialogPrimitive.Description>) {
        return (
          <DialogPrimitive.Description
            data-slot="dialog-description"
            className={cn("text-muted-foreground text-sm", className)}
            {...props}
          />
        )
      }
      
      export {
        Dialog,
        DialogClose,
        DialogContent,
        DialogDescription,
        DialogFooter,
        DialogHeader,
        DialogOverlay,
        DialogPortal,
        DialogTitle,
        DialogTrigger,
      }
      
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'dropdown-menu.tsx',
      path: 'src/components/ui/dropdown-menu.tsx',
      content: `"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  )
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}

`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    // Add more commonly used components
    {
      name: 'checkbox.tsx',
      path: 'src/components/ui/checkbox.tsx',
      content: `import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'select.tsx',
      path: 'src/components/ui/select.tsx',
      content: `import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'textarea.tsx',
      path: 'src/components/ui/textarea.tsx',
      content: `import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'switch.tsx',
      path: 'src/components/ui/switch.tsx',
      content: `import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    // Add a few more commonly used components
    {
      name: 'tabs.tsx',
      path: 'src/components/ui/tabs.tsx',
      content: `import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'tooltip.tsx',
      path: 'src/components/ui/tooltip.tsx',
      content: `import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'avatar.tsx',
      path: 'src/components/ui/avatar.tsx',
      content: `import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'separator.tsx',
      path: 'src/components/ui/separator.tsx',
      content: `import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    // Add more commonly used components
    {
      name: 'accordion.tsx',
      path: 'src/components/ui/accordion.tsx',
      content: `import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))

AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'popover.tsx',
      path: 'src/components/ui/popover.tsx',
      content: `import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'progress.tsx',
      path: 'src/components/ui/progress.tsx',
      content: `import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: \`translateX(-\${100 - (value || 0)}%)\` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'slider.tsx',
      path: 'src/components/ui/slider.tsx',
      content: `import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'breadcrumb.tsx',
      path: 'src/components/ui/breadcrumb.tsx',
      content: `import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"nav"> & {
    separator?: React.ReactNode
  }
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />)
Breadcrumb.displayName = "Breadcrumb"

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<"ol">
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
      className
    )}
    {...props}
  />
))
BreadcrumbList.displayName = "BreadcrumbList"

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("inline-flex items-center gap-1.5", className)}
    {...props}
  />
))
BreadcrumbItem.displayName = "BreadcrumbItem"

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a"> & {
    asChild?: boolean
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      ref={ref}
      className={cn("transition-colors hover:text-foreground", className)}
      {...props}
    />
  )
})
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn("font-normal text-foreground", className)}
    {...props}
  />
))
BreadcrumbPage.displayName = "BreadcrumbPage"

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn("[&>svg]:size-3.5", className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
)
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
)
BreadcrumbEllipsis.displayName = "BreadcrumbElipssis"

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'skeleton.tsx',
      path: 'src/components/ui/skeleton.tsx',
      content: `import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'sonner.tsx',
      path: 'src/components/ui/sonner.tsx',
      content: `import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'table.tsx',
      path: 'src/components/ui/table.tsx',
      content: `import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    // Add the form component
    {
      name: 'form.tsx',
      path: 'src/components/ui/form.tsx',
      content: `import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: \`\${id}-form-item\`,
    formDescriptionId: \`\${id}-form-item-description\`,
    formMessageId: \`\${id}-form-item-message\`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? \`\${formDescriptionId}\`
          : \`\${formDescriptionId} \${formMessageId}\`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message) : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'command.tsx',
      path: 'src/components/ui/command.tsx',
      content: `import * as React from "react"
import { type DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

const CommandDialog = ({ children, ...props }: DialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  />
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  />
))

CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'carousel.tsx',
      path: 'src/components/ui/carousel.tsx',
      content: `import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  opts?: CarouselOptions
  orientation: "horizontal" | "vertical" | (string & {})
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(
  (
    {
      orientation = "horizontal",
      opts,
      setApi,
      className,
      children,
      plugins,
      ...props
    },
    ref
  ) => {
    const [emblaRef, emblaApi] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      plugins
    )
    const [canScrollPrev, setCanScrollPrev] = React.useState(false)
    const [canScrollNext, setCanScrollNext] = React.useState(false)

    const onSelect = React.useCallback((api: CarouselApi) => {
      if (!api) {
        return
      }

      setCanScrollPrev(api.canScrollPrev())
      setCanScrollNext(api.canScrollNext())
    }, [])

    const scrollPrev = React.useCallback(() => {
      emblaApi?.scrollPrev()
    }, [emblaApi])

    const scrollNext = React.useCallback(() => {
      emblaApi?.scrollNext()
    }, [emblaApi])

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          scrollPrev()
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          scrollNext()
        }
      },
      [scrollPrev, scrollNext]
    )

    React.useEffect(() => {
      if (!emblaApi || !setApi) {
        return
      }

      setApi(emblaApi)
    }, [emblaApi, setApi])

    React.useEffect(() => {
      if (!emblaApi) {
        return
      }

      onSelect(emblaApi)
      emblaApi.on("reInit", onSelect)
      emblaApi.on("select", onSelect)

      return () => {
        emblaApi?.off("select", onSelect)
      }
    }, [emblaApi, onSelect])

    return (
      <CarouselContext.Provider
        value={{
          carouselRef: emblaRef,
          api: emblaApi,
          opts,
          orientation: orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
        }}
      >
        <div
          ref={ref}
          onKeyDownCapture={handleKeyDown}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    )
  }
)
Carousel.displayName = "Carousel"

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div
      ref={carouselRef}
      className="overflow-hidden"
    >
      <div
        ref={ref}
        className={cn(
          "flex",
          orientation === "horizontal" ? "h-full" : "h-full flex-col",
          className
        )}
        {...props}
      />
    </div>
  )
})
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel()

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
})
CarouselItem.displayName = "CarouselItem"

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full",
        orientation === "horizontal"
          ? "left-12 top-1/2 -translate-y-1/2"
          : "left-1/2 top-12 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
})
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full",
        orientation === "horizontal"
          ? "right-12 top-1/2 -translate-y-1/2"
          : "bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ChevronRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  )
})
CarouselNext.displayName = "CarouselNext"

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'toast.tsx',
      path: 'src/components/ui/toast.tsx',
      content: `import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'collapsible.tsx',
      path: 'src/components/ui/collapsible.tsx',
      content: `"use client"

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  )
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }

`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'scroll-area.tsx',
      path: 'src/components/ui/scroll-area.tsx',
      content: `import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'pagination.tsx',
      path: 'src/components/ui/pagination.tsx',
      content: `import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
  isActive?: boolean
  size?: "default" | "sm" | "lg" | "icon"
} & React.ComponentProps<"a">

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      className
    )}
    {...props}
  />
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'calendar.tsx',
      path: 'src/components/ui/calendar.tsx',
      content: `import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Component = orientation === 'left' ? ChevronLeft : ChevronRight
          return <Component className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'data-table.tsx',
      path: 'src/components/ui/data-table.tsx',
      content: `import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, MoreHorizontal } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Filter...",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useLocalStorage.ts',
      path: 'src/hooks/useLocalStorage.ts',
      content: `import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue
      }
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.log(error)
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.log(error)
    }
  }

  return [storedValue, setValue] as const
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useDebounce.ts',
      path: 'src/hooks/useDebounce.ts',
      content: `import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useOnClickOutside.ts',
      path: 'src/hooks/useOnClickOutside.ts',
      content: `import { useEffect, RefObject } from 'react'

export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      handler(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useMediaQuery.ts',
      path: 'src/hooks/useMediaQuery.ts',
      content: `import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [matches, query])

  return matches
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useCopyToClipboard.ts',
      path: 'src/hooks/useCopyToClipboard.ts',
      content: `import { useState } from 'react'

export function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const copy = async (text: string) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported')
      return false
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      return true
    } catch (error) {
      console.warn('Copy failed', error)
      setCopiedText(null)
      return false
    }
  }

  return { copiedText, copy }
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useInterval.ts',
      path: 'src/hooks/useInterval.ts',
      content: `import { useEffect, useRef } from 'react'

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) {
      return
    }

    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'usePrevious.ts',
      path: 'src/hooks/usePrevious.ts',
      content: `import { useRef, useEffect } from 'react'

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>()

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useToggle.ts',
      path: 'src/hooks/useToggle.ts',
      content: `import { useState } from 'react'

export function useToggle(initialValue: boolean = false) {
  const [value, setValue] = useState<boolean>(initialValue)

  const toggle = () => setValue((prev) => !prev)
  const setTrue = () => setValue(true)
  const setFalse = () => setValue(false)

  return { value, toggle, setTrue, setFalse, setValue }
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useMobile.ts',
      path: 'src/hooks/useMobile.ts',
      content: `import { useState, useEffect } from 'react'

export function useMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false)

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    // Check on mount
    checkIsMobile()

    // Add event listener
    window.addEventListener('resize', checkIsMobile)

    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [breakpoint])

  return isMobile
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useToast.ts',
      path: 'src/hooks/useToast.ts',
      content: `import { useState, useCallback } from 'react'

export interface ToastOptions {
  title?: string
  description?: string
  duration?: number
  variant?: 'default' | 'destructive' | 'success'
}

export interface ToastState {
  id: string
  title?: string
  description?: string
  variant: 'default' | 'destructive' | 'success'
  duration: number
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([])

  const toast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastState = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant || 'default',
      duration: options.duration || 4000,
    }

    setToasts((prev) => [...prev, newToast])

    // Auto remove after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, newToast.duration)

    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = useCallback((options: Omit<ToastOptions, 'variant'>) => {
    return toast({ ...options, variant: 'success' })
  }, [toast])

  const error = useCallback((options: Omit<ToastOptions, 'variant'>) => {
    return toast({ ...options, variant: 'destructive' })
  }, [toast])

  return {
    toasts,
    toast,
    success,
    error,
    dismiss,
  }
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useTheme.tsx',
      path: 'src/hooks/useTheme.tsx',
      content: `import { useState, useEffect, createContext, useContext } from 'react';

// Define theme types
type Theme = 'light' | 'dark' | 'system';

// Define context type
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

// Create context with undefined default value
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component (logic only - no JSX)
export function ThemeProviderLogic() {
  // Initialize theme state with localStorage or default to 'system'
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          return stored;
        }
      }
    } catch (error) {
      // Silently handle localStorage errors (non-breaking)
    }
    return 'system';
  });

  // Initialize resolved theme state
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = window.document.documentElement;

    const updateTheme = () => {
      try {
        let resolved: 'light' | 'dark' = 'dark';

        // Determine the resolved theme based on current theme setting
        if (theme === 'system') {
          resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else {
          resolved = theme;
        }

        // Update state and apply theme classes
        setResolvedTheme(resolved);
        root.classList.remove('light', 'dark');
        root.classList.add(resolved);

        // Save theme to localStorage
        localStorage.setItem('theme', theme);
      } catch (error) {
        // Silently handle theme update errors (non-breaking)
      }
    };

    // Initial theme update
    updateTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return { theme, setTheme, resolvedTheme };
}

// Custom hook for using theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export context for provider implementation elsewhere
export { ThemeContext };`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'index.ts',
      path: 'src/hooks/index.ts',
      content: `export { useLocalStorage } from './useLocalStorage'
export { useDebounce } from './useDebounce'
export { useOnClickOutside } from './useOnClickOutside'
export { useMediaQuery } from './useMediaQuery'
export { useCopyToClipboard } from './useCopyToClipboard'
export { useInterval } from './useInterval'
export { usePrevious } from './usePrevious'
export { useToggle } from './useToggle'
export { useMobile } from './useMobile'
export { useToast } from './useToast'
export { useTheme, ThemeContext } from './useTheme'
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'STORAGE_SYSTEM_IMPLEMENTATION.md',
      path: 'STORAGE_SYSTEM_IMPLEMENTATION.md',
      content: `# 📦 File Storage System - Complete Implementation

## 🎯 Overview

Implemented a complete file storage system similar to Supabase Storage, allowing users to store and manage files (images, documents, videos, etc.) in their databases.

---

## ✨ Key Features

### **Storage Capabilities**
- ✅ **500MB per database** - Each database gets 500MB of storage
- ✅ **10MB max file size** - Individual files up to 10MB
- ✅ **Multiple file types** - Images, PDFs, documents, videos, audio
- ✅ **Public & private files** - Control file access
- ✅ **Signed URLs** - Secure temporary access to private files
- ✅ **CDN delivery** - Fast file delivery via Supabase CDN
- ✅ **Automatic usage tracking** - Real-time storage usage monitoring

### **Security Features**
- ✅ **Row Level Security (RLS)** - Users can only access their files
- ✅ **File type validation** - Only allowed types can be uploaded
- ✅ **Size limits enforced** - Prevents storage abuse
- ✅ **API key authentication** - Secure external access
- ✅ **Rate limiting** - Prevents API abuse

---

## 🏗️ Architecture

### **Database Schema**

\`\`\`
storage_buckets
├── id (UUID)
├── database_id (FK → databases.id)
├── name (TEXT)
├── size_limit_bytes (500MB)
├── current_usage_bytes
├── is_public (BOOLEAN)
└── timestamps

storage_files
├── id (UUID)
├── bucket_id (FK → storage_buckets.id)
├── name (generated unique name)
├── original_name (user's filename)
├── path (Supabase Storage path)
├── size_bytes
├── mime_type
├── is_public
├── metadata (JSONB)
└── timestamps
\`\`\`

### **Supabase Storage Structure**

\`\`\`
pipilot-storage (Master Bucket)
├── db_1_myapp/
│   ├── abc123.jpg
│   ├── def456.pdf
│   └── ghi789.mp4
├── db_2_webapp/
│   ├── xyz123.png
│   └── mno456.docx
└── ...
\`\`\`

---

## 📡 API Endpoints

### **Dashboard API (Authenticated Users)**

#### **1. Get Storage Info**
\`\`\`
GET /api/database/{databaseId}/storage
\`\`\`

Returns bucket info, usage stats, and recent files.

**Response:**
\`\`\`json
{
  "bucket": {
    "id": "uuid",
    "name": "db_1_myapp",
    "size_limit_bytes": 524288000,
    "current_usage_bytes": 104857600,
    "is_public": false
  },
  "stats": {
    "file_count": 25,
    "usage_percentage": 20,
    "available_bytes": 419430400
  },
  "files": [...]
}
\`\`\`

#### **2. Upload File**
\`\`\`
POST /api/database/{databaseId}/storage/upload
Content-Type: multipart/form-data
\`\`\`

**Form Data:**
- \`file\` - The file to upload
- \`is_public\` - "true" or "false"
- \`metadata\` - JSON string (optional)

**Response:**
\`\`\`json
{
  "success": true,
  "file": {
    "id": "uuid",
    "name": "abc123.jpg",
    "original_name": "photo.jpg",
    "size_bytes": 1048576,
    "mime_type": "image/jpeg",
    "url": "https://...",
    "is_public": true,
    "created_at": "2025-10-07T..."
  }
}
\`\`\`

#### **3. List Files**
\`\`\`
GET /api/database/{databaseId}/storage/files
  ?limit=50
  &offset=0
  &search=photo
  &mime_type=image/jpeg
\`\`\`

#### **4. Get File Details**
\`\`\`
GET /api/database/{databaseId}/storage/files/{fileId}
\`\`\`

#### **5. Delete File**
\`\`\`
DELETE /api/database/{databaseId}/storage/files/{fileId}
\`\`\`

---

### **Public API (API Key Required)**

#### **Upload File (External Apps)**
\`\`\`
POST /api/v1/databases/{databaseId}/storage/upload
Authorization: Bearer YOUR_API_KEY
Content-Type: multipart/form-data
\`\`\`

---

## 💻 Usage Examples

### **JavaScript/TypeScript (External App)**

\`\`\`typescript
// Upload file
async function uploadFile(file: File, isPublic: boolean = true) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('is_public', isPublic.toString());
  formData.append('metadata', JSON.stringify({
    uploaded_from: 'my-app',
    tags: ['profile', 'avatar']
  }));

  const response = await fetch(
    'https://pipilot.dev/api/v1/databases/YOUR_DB_ID/storage/upload',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY',
      },
      body: formData,
    }
  );

  const data = await response.json();
  
  if (data.success) {
    console.log('File URL:', data.file.url);
    return data.file;
  } else {
    throw new Error(data.error);
  }
}
\`\`\`

---

## 🎨 Allowed File Types

### **Images**
- JPEG/JPG, PNG, GIF, WebP, SVG

### **Documents**
- PDF, Microsoft Word (.doc, .docx), Microsoft Excel (.xls, .xlsx), Text files (.txt), CSV

### **Media**
- Videos (.mp4, .mpeg, .mov), Audio (.mp3, .wav, .ogg)

### **Other**
- JSON files

---

## 🔒 Security Features

### **Row Level Security (RLS)**
\`\`\`sql
-- Users can only access files in their databases
CREATE POLICY "Users can manage their storage files"
  ON storage_files
  FOR ALL
  USING (
    bucket_id IN (
      SELECT sb.id FROM storage_buckets sb
      INNER JOIN databases d ON sb.database_id = d.id
      WHERE d.user_id = auth.uid()::text
    )
  );
\`\`\`

### **File Type Validation**
Only allowed MIME types can be uploaded. Server validates before storing.

### **Size Limits**
- **Per file**: 10MB maximum
- **Per bucket**: 500MB total
- Enforced before upload

---

## 📊 Storage Tracking

### **Automatic Usage Updates**
\`\`\`sql
-- Trigger automatically updates bucket usage
CREATE TRIGGER update_bucket_usage_trigger
  AFTER INSERT OR UPDATE OR DELETE ON storage_files
  FOR EACH ROW
  EXECUTE FUNCTION update_bucket_usage();
\`\`\`

---

## 🎯 Summary

### **What Was Built**

✅ **Database Schema** - Tables, triggers, RLS policies  
✅ **Storage Library** - Reusable functions for file operations  
✅ **Dashboard API** - 5 endpoints for file management  
✅ **Public API** - External app integration  
✅ **Security** - RLS, validation, rate limiting  
✅ **Documentation** - Complete usage guide  

### **What Users Get**

- **500MB storage** per database
- **Secure file uploads** from their apps
- **Public & private files** support
- **CDN delivery** for fast access
- **Automatic tracking** of usage
- **Simple API** similar to Supabase Storage

---

**Implemented by**: Optima AI  
**Date**: October 7, 2025  
**Status**: ✅ Complete & Ready for Testing`,
      fileType: 'markdown',
      type: 'markdown',
      size: 0,
      isDirectory: false
    },
    {
      name: 'USER_AUTHENTICATION_README.md',
      path: 'USER_AUTHENTICATION_README.md',
      content: `# Pipilot Authentication Setup Guide

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
**Built with ❤️ by the pipilot.dev team**`,
      fileType: 'markdown',
      type: 'markdown',
      size: 0,
      isDirectory: false
    },
  ]

  // Default Expo React Native + TypeScript template files
  private static readonly EXPO_TEMPLATE_FILES: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'package.json',
      path: 'package.json',
      content: `{
  "name": "expo-mobile-app",
  "version": "1.0.0",
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~54.0.29",
    "expo-status-bar": "~3.0.9",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "react-native-web": "~0.19.10",
    "@react-navigation/native": "^7.0.25",
    "@react-navigation/bottom-tabs": "^7.2.1",
    "@react-navigation/native-stack": "^7.2.2",
    "react-native-safe-area-context": "4.15.0",
    "react-native-screens": "~4.4.0",
    "expo-linear-gradient": "~14.0.1",
    "expo-blur": "~14.0.1",
    "expo-font": "~13.0.1",
    "expo-haptics": "~14.0.0",
    "expo-asset": "~11.0.1"
  },
  "devDependencies": {
    "@types/react": "~19.1.0",
    "typescript": "~5.9.2"
  },
  "private": true
}`,
      fileType: 'json',
      type: 'json',
      size: 0,
      isDirectory: false
    },
    {
      name: 'app.json',
      path: 'app.json',
      content: `{
  "expo": {
    "name": "expo-mobile-app",
    "slug": "expo-mobile-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "https://pipilot.dev/assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "https://pipilot.dev/assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.pipilot.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "https://pipilot.dev/assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.pipilot.app",
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "favicon": "https://pipilot.dev/assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": []
  }
}`,
      fileType: 'json',
      type: 'json',
      size: 0,
      isDirectory: false
    },
    {
      name: 'index.ts',
      path: 'index.ts',
      content: `import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'App.tsx',
      path: 'App.tsx',
      content: `import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Import screens
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';

// Tab Icons (using simple text for now, can be replaced with icon library)
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <Text style={{ fontSize: 20, color: focused ? '#007AFF' : '#999' }}>
    {name === 'Home' ? '🏠' : name === 'Profile' ? '👤' : '⚙️'}
  </Text>
);

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused }) => (
              <TabIcon name={route.name} focused={focused} />
            ),
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: '#999',
            headerStyle: {
              backgroundColor: '#007AFF',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'HomeScreen.tsx',
      path: 'screens/HomeScreen.tsx',
      content: `import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeatureCard } from '../components/FeatureCard';
import { WelcomeBanner } from '../components/WelcomeBanner';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const features = [
    { id: 1, title: 'Quick Start', description: 'Get started in seconds', icon: '🚀' },
    { id: 2, title: 'Beautiful UI', description: 'Modern design components', icon: '🎨' },
    { id: 3, title: 'Cross Platform', description: 'iOS, Android & Web', icon: '📱' },
    { id: 4, title: 'TypeScript', description: 'Type-safe development', icon: '💪' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <WelcomeBanner />
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featureGrid}>
            {features.map((feature) => (
              <FeatureCard key={feature.id} {...feature} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get Started</Text>
          <TouchableOpacity style={styles.button}>
            <LinearGradient
              colors={['#007AFF', '#0051D5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Start Building</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  section: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'ProfileScreen.tsx',
      path: 'screens/ProfileScreen.tsx',
      content: `import React from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileCard } from '../components/ProfileCard';
import { StatCard } from '../components/StatCard';

export default function ProfileScreen() {
  const stats = [
    { label: 'Projects', value: '12', icon: '📂' },
    { label: 'Followers', value: '1.2K', icon: '👥' },
    { label: 'Following', value: '456', icon: '❤️' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={['#007AFF', '#0051D5']}
          style={styles.header}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
          </View>
          <Text style={styles.name}>John Doe</Text>
          <Text style={styles.bio}>Mobile Developer • Creator</Text>
        </LinearGradient>

        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <ProfileCard
            title="Completed Project"
            description="Built a new mobile app"
            time="2 hours ago"
          />
          <ProfileCard
            title="New Achievement"
            description="Reached 1K followers"
            time="1 day ago"
          />
          <ProfileCard
            title="Collaboration"
            description="Joined a new team"
            time="3 days ago"
          />
        </View>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 50,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: -30,
    marginBottom: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  button: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'SettingsScreen.tsx',
      path: 'screens/SettingsScreen.tsx',
      content: `import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsRow } from '../components/SettingsRow';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PREFERENCES</Text>
          <View style={styles.settingsGroup}>
            <SettingsRow
              icon="🔔"
              title="Notifications"
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
            />
            <SettingsRow
              icon="🌙"
              title="Dark Mode"
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
            />
            <SettingsRow
              icon="💾"
              title="Auto Save"
              value={autoSaveEnabled}
              onValueChange={setAutoSaveEnabled}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          <View style={styles.settingsGroup}>
            <SettingsRow icon="👤" title="Profile" isLink />
            <SettingsRow icon="🔒" title="Privacy" isLink />
            <SettingsRow icon="🔐" title="Security" isLink />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SUPPORT</Text>
          <View style={styles.settingsGroup}>
            <SettingsRow icon="❓" title="Help Center" isLink />
            <SettingsRow icon="📧" title="Contact Us" isLink />
            <SettingsRow icon="ℹ️" title="About" isLink />
          </View>
        </View>

        <View style={styles.version}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  section: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 10,
    marginLeft: 16,
  },
  settingsGroup: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  version: {
    alignItems: 'center',
    marginTop: 30,
  },
  versionText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'FeatureCard.tsx',
      path: 'components/FeatureCard.tsx',
      content: `import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2;

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => {
  return (
    <TouchableOpacity style={styles.card}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'WelcomeBanner.tsx',
      path: 'components/WelcomeBanner.tsx',
      content: `import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export const WelcomeBanner: React.FC = () => {
  return (
    <LinearGradient
      colors={['#007AFF', '#0051D5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.banner}
    >
      <Text style={styles.greeting}>Welcome Back! 👋</Text>
      <Text style={styles.subtitle}>Build amazing mobile apps with Expo</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderRadius: 20,
    padding: 30,
    marginTop: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'ProfileCard.tsx',
      path: 'components/ProfileCard.tsx',
      content: `import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

interface ProfileCardProps {
  title: string;
  description: string;
  time: string;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ title, description, time }) => {
  return (
    <TouchableOpacity style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Text style={styles.time}>{time}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
  },
  time: {
    fontSize: 12,
    color: '#C7C7CC',
  },
});
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'StatCard.tsx',
      path: 'components/StatCard.tsx',
      content: `import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  icon: {
    fontSize: 24,
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: '#8E8E93',
  },
});
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'SettingsRow.tsx',
      path: 'components/SettingsRow.tsx',
      content: `import React from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity } from 'react-native';

interface SettingsRowProps {
  icon: string;
  title: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  isLink?: boolean;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  title,
  value,
  onValueChange,
  isLink,
}) => {
  const content = (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {isLink ? (
        <Text style={styles.chevron}>›</Text>
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#E5E5EA', true: '#34C759' }}
          thumbColor="#fff"
        />
      )}
    </View>
  );

  return isLink ? (
    <TouchableOpacity style={styles.container}>
      {content}
    </TouchableOpacity>
  ) : (
    <View style={styles.container}>{content}</View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  chevron: {
    fontSize: 24,
    color: '#C7C7CC',
  },
});
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'tsconfig.json',
      path: 'tsconfig.json',
      content: `{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}`,
      fileType: 'json',
      type: 'json',
      size: 0,
      isDirectory: false
    },
    {
      name: '.gitignore',
      path: '.gitignore',
      content: `# Expo
.expo/
dist/
web-build/

# Dependencies
node_modules/

# Environment
.env.local
.env

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
`,
      fileType: 'text',
      type: 'text',
      size: 0,
      isDirectory: false
    },
    {
      name: 'README.md',
      path: 'README.md',
      content: `# Expo Mobile App

A modern mobile application built with Expo and React Native.

## Features

- 🚀 Cross-platform (iOS, Android, Web)
- 📱 Beautiful UI components
- 🎨 Gradient effects with expo-linear-gradient
- 🧭 Tab navigation with React Navigation
- 💪 TypeScript for type safety
- ⚡ Fast refresh for instant feedback

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   npm start
   \`\`\`

3. Run on your device:
   - Press \`a\` for Android
   - Press \`i\` for iOS
   - Press \`w\` for Web

## Project Structure

\`\`\`
├── App.tsx              # Main app component with navigation
├── screens/             # Screen components
│   ├── HomeScreen.tsx
│   ├── ProfileScreen.tsx
│   └── SettingsScreen.tsx
├── components/          # Reusable components
│   ├── FeatureCard.tsx
│   ├── WelcomeBanner.tsx
│   ├── ProfileCard.tsx
│   ├── StatCard.tsx
│   └── SettingsRow.tsx
└── index.ts            # App entry point
\`\`\`

## Built With Pipilot

This template was created with [Pipilot](https://pipilot.dev) - the fastest way to build mobile apps.
`,
      fileType: 'markdown',
      type: 'markdown',
      size: 0,
      isDirectory: false
    },
  ]

  // Default Next.js + TypeScript + Tailwind CSS template files
  private static readonly NEXTJS_TEMPLATE_FILES: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'package.json',
      path: 'package.json',
      content: `{
  "name": "nextjs-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start --port 3000",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.4",
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
    "@radix-ui/react-icons": "^1.3.0",

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
    "remark-gfm": "^4.0.1",

    "@tanstack/react-table": "^8.20.5",
    "@dyad-sh/nextjs-webpack-component-tagger": "0.8.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@types/node": "^20.10.5",
    "typescript": "^5.2.2",
    "tailwindcss": "^3.3.6",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "eslint": "^8.55.0",
    "eslint-config-next": "14.0.4",
    "tailwindcss-animate": "^1.0.7",
    "@babel/core": "^7.24.0",
    "@babel/preset-react": "^7.23.3",
    "@babel/preset-typescript": "^7.23.3"
  }
}`,
      fileType: 'json',
      type: 'json',
      size: 0,
      isDirectory: false
    },
    {
      name: 'next.config.js',
      path: 'next.config.js',
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['localhost','api.a0.dev'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ]
  },
  // Visual Editor: Custom webpack config to inject source location data
  // Only enabled when NEXT_PUBLIC_ENABLE_VISUAL_EDITOR=true
  webpack: (config, { dev }) => {
    if (dev && process.env.NEXT_PUBLIC_ENABLE_VISUAL_EDITOR === 'true') {
      // Add component tagger for enhanced visual editor source mapping
      config.module.rules.push({
        test: /\.(jsx|tsx)$/,
        exclude: /node_modules/,
        enforce: "pre",
        use: '@dyad-sh/nextjs-webpack-component-tagger',
      });

      // Add custom babel plugin for visual editor source mapping
      config.module.rules.push({
        test: /\\.(tsx|jsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: require.resolve('./visual-editor-loader.js'),
          },
        ],
      });
    }
    return config;
  },
}

module.exports = nextConfig`,
      fileType: 'javascript',
      type: 'javascript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'visual-editor-loader.js',
      path: 'visual-editor-loader.js',
      content: `// Visual Editor Webpack Loader for Next.js
// Adds data-ve-id, data-ve-file, data-ve-line attributes to JSX elements
// This enables the visual editor to map DOM elements back to source code

const babel = require('@babel/core');

module.exports = function visualEditorLoader(source) {
  const callback = this.async();
  const filename = this.resourcePath;

  // Only process files in src or app directories
  if (!filename.match(/[\\\\/](src|app|components)[\\\\/]/)) {
    return callback(null, source);
  }

  try {
    let elementIndex = 0;

    const result = babel.transformSync(source, {
      filename,
      presets: [
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
      ],
      plugins: [
        function visualEditorBabelPlugin({ types: t }) {
          return {
            visitor: {
              JSXOpeningElement(path) {
                const { node } = path;
                const loc = node.loc;

                if (!loc) return;

                // Skip if already has data-ve-id
                const hasVeId = node.attributes.some(
                  (attr) =>
                    attr.type === 'JSXAttribute' &&
                    attr.name?.name === 'data-ve-id'
                );
                if (hasVeId) return;

                // Create relative path - use non-greedy match to get FIRST occurrence of src/app/components
                // This ensures src/app/page.tsx stays as src/app/page.tsx (not app/page.tsx)
                const relativePath = filename
                  .replace(/^.*?[\\\\/](src|app|components)[\\\\/]/, '$1/')
                  .replace(/\\\\/g, '/');

                // Add data-ve-id attribute
                const idAttr = t.jsxAttribute(
                  t.jsxIdentifier('data-ve-id'),
                  t.stringLiteral(
                    relativePath + ':' + loc.start.line + ':' + elementIndex++
                  )
                );

                // Add data-ve-file attribute
                const fileAttr = t.jsxAttribute(
                  t.jsxIdentifier('data-ve-file'),
                  t.stringLiteral(relativePath)
                );

                // Add data-ve-line attribute
                const lineAttr = t.jsxAttribute(
                  t.jsxIdentifier('data-ve-line'),
                  t.stringLiteral(String(loc.start.line))
                );

                node.attributes.push(idAttr, fileAttr, lineAttr);
              },
            },
          };
        },
      ],
      sourceMaps: true,
      sourceFileName: filename,
    });

    if (result && result.code) {
      callback(null, result.code, result.map);
    } else {
      callback(null, source);
    }
  } catch (error) {
    // Silently fallback to original source if transformation fails
    console.warn('[Visual Editor Loader] Transform skipped:', filename);
    callback(null, source);
  }
};
`,
      fileType: 'javascript',
      type: 'javascript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'tsconfig.json',
      path: 'tsconfig.json',
      content: `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,
      fileType: 'json',
      type: 'json',
      size: 0,
      isDirectory: false
    },
    {
      name: 'tailwind.config.js',
      path: 'tailwind.config.js',
      content: `import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;`,
      fileType: 'javascript',
      type: 'javascript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'postcss.config.js',
      path: 'postcss.config.js',
      content: `module.exports = {
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
      name: 'globals.css',
      path: 'src/app/globals.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 94.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}`,
      fileType: 'css',
      type: 'css',
      size: 0,
      isDirectory: false
    },
    {
      name: 'layout.tsx',
      path: 'src/app/layout.tsx',
      content: `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Next.js App',
  description: 'Generated by create next app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts Preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Sans-serif Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&family=Open+Sans:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&family=Lato:wght@300;400;700&family=Nunito:wght@300;400;500;600;700&family=Raleway:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&family=Urbanist:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Lexend:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=Figtree:wght@300;400;500;600;700&family=Cabin:wght@400;500;600;700&family=PT+Sans:wght@400;700&family=Manrope:wght@300;400;500;600;700&family=Mulish:wght@300;400;500;600;700&family=Sofia+Sans:wght@300;400;500;600;700&family=Josefin+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        
        {/* Serif Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&family=Playfair+Display:wght@400;500;600;700&family=Lora:wght@400;500;600;700&family=Domine:wght@400;500;600;700&family=Crimson+Text:wght@400;600;700&family=DM+Serif+Display&family=DM+Serif+Text&family=Cormorant+Garamond:wght@300;400;500;600;700&family=Cardo:wght@400;700&family=Libre+Baskerville:wght@400;700&family=Spectral:wght@300;400;500;600;700&family=EB+Garamond:wght@400;500;600;700&family=Old+Standard+TT:wght@400;700&family=Bodoni+Moda:wght@400;500;600;700&family=Cormorant:wght@300;400;500;600;700&family=Cinzel:wght@400;500;600;700&family=Cinzel+Decorative:wght@400;700&family=Forum&family=Tenor+Sans&family=Gilda+Display&family=Fraunces:wght@300;400;500;600;700&family=Rosarivo&display=swap" rel="stylesheet" />
        
        {/* Monospace Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Fira+Code:wght@300;400;500;600;700&family=Source+Code+Pro:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Inconsolata:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&family=Cousine:wght@400;700&family=Noto+Sans+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        
        {/* Handwritten & Script Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Dancing+Script:wght@400;500;600;700&family=Caveat:wght@400;500;600;700&family=Sacramento&family=Shantell+Sans:wght@300;400;500;600;700&family=Amatic+SC:wght@400;700&family=Great+Vibes&family=Parisienne&family=Shadows+Into+Light&family=Yellowtail&family=Satisfy&family=Allura&family=Indie+Flower&family=Kristi&family=Bad+Script&family=Mrs+Saint+Delafield&family=Marck+Script&display=swap" rel="stylesheet" />
        
        {/* Display & Decorative Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@300;400;500;600;700&family=Anton&family=Abril+Fatface&family=Bungee&family=Alfa+Slab+One&family=Lobster&family=Rubik+Dirt&family=Playball&family=Fredoka:wght@300;400;500;600;700&family=Monoton&family=Righteous&family=Ultra&family=Press+Start+2P&family=Rampart+One&display=swap" rel="stylesheet" />
        
        {/* Futuristic & Tech Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Exo+2:wght@300;400;500;600;700&family=Audiowide&family=Oxanium:wght@300;400;500;600;700&family=Quantico:wght@400;700&family=Syncopate:wght@400;700&family=Teko:wght@300;400;500;600;700&family=Rajdhani:wght@300;400;500;600;700&family=Changa:wght@300;400;500;600;700&family=Michroma&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        {children}
        {/* Visual Editor Client - enables visual editing when loaded in pipilot.dev iframe */}
        <Script src="/visual-editor-client.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'page.tsx',
      path: 'src/app/page.tsx',
      content: `export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="bg-card border border-border rounded-lg p-6 mb-6 shadow-sm">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Hello World, it's You 🌍
          </h1>
          <p className="text-muted-foreground text-lg">
            Welcome to your enhanced Next.js app. Let's build something amazing together!
          </p>
        </header>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Lightning Fast</h3>
            <p className="text-muted-foreground">
              Generate complete applications in minutes, not hours. Our AI understands your vision instantly.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">🎨</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Beautiful UI</h3>
            <p className="text-muted-foreground">
              Modern, responsive design with purposeful interactions and clean aesthetics built-in.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Privacy First</h3>
            <p className="text-muted-foreground">
              Architected with encrypted data and compliance-ready workflows to keep your users safe.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-secondary border border-border rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-secondary-foreground mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-6">
            This landing page is powered by CSS variables. Change themes and see the magic happen instantly!
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:opacity-90 transition-opacity">
              Get Started
            </button>
            <button className="bg-accent text-accent-foreground px-6 py-3 rounded-md font-medium hover:opacity-90 transition-opacity border border-border">
              Learn More
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-muted-foreground text-sm">
          <p>© 2025 Your App — Built with Next.js + Tailwind CSS</p>
        </footer>
      </div>
    </main>
  )
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'next.svg',
      path: 'public/next.svg',
      content: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 394 80"><path fill="#000" d="m262 0h68l-26.5 37.5L262 75V0Z"/><path fill="#000" fill-rule="evenodd" d="M149 0v75h29V0h-29Zm-20 0H80v75h49V0Z" clip-rule="evenodd"/><path fill="#000" d="M0 0h49v75H0V0Zm100 0h49v75h-49V0Z"/><path fill="#000" fill-rule="evenodd" d="M68 0v75h29V0H68Z" clip-rule="evenodd"/><circle cx="225" cy="37" r="15" fill="#fff"/><circle cx="225" cy="37" r="7" fill="#000"/><path fill="#000" d="m262 0h68l-26.5 37.5L262 75V0Z"/><path fill="#000" fill-rule="evenodd" d="M149 0v75h29V0h-29Zm-20 0H80v75h49V0Z" clip-rule="evenodd"/><path fill="#000" d="M0 0h49v75H0V0Zm100 0h49v75h-49V0Z"/><path fill="#000" fill-rule="evenodd" d="M68 0v75h29V0H68Z" clip-rule="evenodd"/><circle cx="225" cy="37" r="15" fill="#fff"/><circle cx="225" cy="37" r="7" fill="#000"/></svg>`,
      fileType: 'svg',
      type: 'svg',
      size: 0,
      isDirectory: false
    },
    {
      name: 'vercel.svg',
      path: 'public/vercel.svg',
      content: `<svg height="18" viewBox="0 0 284 65" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m141.04 16.005c-11.37 11.37-28.5 11.37-39.87 0L16.04 16.005C4.67 27.375 4.67 44.505 16.04 55.875L16.04 55.875C27.41 67.245 44.54 67.245 55.91 55.875L141.04 55.875C152.41 67.245 169.54 67.245 180.91 55.875L267.04 55.875C278.41 67.245 295.54 67.245 306.91 55.875L306.91 55.875C318.28 44.505 318.28 27.375 306.91 16.005L267.04 16.005C255.67 4.635 238.54 4.635 227.17 16.005L141.04 16.005Z" fill="black"/><path d="m141.04 16.005c-11.37 11.37-28.5 11.37-39.87 0L16.04 16.005C4.67 27.375 4.67 44.505 16.04 55.875L16.04 55.875C27.41 67.245 44.54 67.245 55.91 55.875L141.04 55.875C152.41 67.245 169.54 67.245 180.91 55.875L267.04 55.875C278.41 67.245 295.54 67.245 306.91 55.875L306.91 55.875C318.28 44.505 318.28 27.375 306.91 16.005L267.04 16.005C255.67 4.635 238.54 4.635 227.17 16.005L141.04 16.005Z" fill="black"/><path d="m141.04 16.005c-11.37 11.37-28.5 11.37-39.87 0L16.04 16.005C4.67 27.375 4.67 44.505 16.04 55.875L16.04 55.875C27.41 67.245 44.54 67.245 55.91 55.875L141.04 55.875C152.41 67.245 169.54 67.245 180.91 55.875L267.04 55.875C278.41 67.245 295.54 67.245 306.91 55.875L306.91 55.875C318.28 44.505 318.28 27.375 306.91 16.005L267.04 16.005C255.67 4.635 238.54 4.635 227.17 16.005L141.04 16.005Z" fill="black"/></svg>`,
      fileType: 'svg',
      type: 'svg',
      size: 0,
      isDirectory: false
    },
    {
      name: 'visual-editor-client.js',
      path: 'public/visual-editor-client.js',
      content: `/**
 * Visual Editor Client - Embedded in production builds
 * Enables visual editing when the app is loaded in an iframe from pipilot.dev
 * Works with both development (E2B) and production (Supabase/Vercel hosting) scenarios
 */
(function() {
  'use strict';
  
  // Only run in iframe context
  if (window === window.parent) {
    console.log('[VE-Client] Not in iframe, skipping initialization');
    return;
  }

  // Allowed parent origins for security
  // Supports: pipilot.dev main site, *.pipilot.dev subdomains, *.e2b.app E2B URLs, localhost
  const ALLOWED_ORIGINS = [
    'https://pipilot.dev',
    'https://www.pipilot.dev',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
  ];
  
  // Check if origin is allowed (supports wildcards for subdomains)
  function isAllowedOrigin(origin) {
    if (!origin) return false;
    // Exact match
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    // *.pipilot.dev subdomains (e.g., code-lens-stream.pipilot.dev)
    if (origin.endsWith('.pipilot.dev')) return true;
    // *.e2b.app URLs (e.g., 3000-ikmd9ltiykjsfg57q5pf3.e2b.app)
    if (origin.endsWith('.e2b.app')) return true;
    return false;
  }

  // State
  let isEnabled = false;
  let selectedElements = new Map();
  let hoveredElement = null;
  let hoverOverlay = null;
  let selectionOverlays = new Map();
  let elementIdCounter = 1;
  const elementIdMap = new WeakMap();

  // Generate unique element ID using DOM path
  function generateElementId(element) {
    if (elementIdMap.has(element)) {
      return elementIdMap.get(element);
    }
    
    // Check for existing data-ve-id (from build-time plugin)
    const existingId = element.getAttribute('data-ve-id');
    if (existingId) {
      elementIdMap.set(element, existingId);
      return existingId;
    }
    
    // Generate DOM path-based ID for production
    const path = getDOMPath(element);
    const id = 've-' + path;
    element.setAttribute('data-ve-id', id);
    elementIdMap.set(element, id);
    return id;
  }

  // Get DOM path for element identification
  function getDOMPath(element) {
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += '#' + current.id;
        path.unshift(selector);
        break;
      }
      
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\\s+/).slice(0, 2).join('.');
        if (classes) selector += '.' + classes;
      }
      
      // Add index if needed
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current);
          selector += ':nth(' + index + ')';
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join('>');
  }

  // Get computed styles for an element
  function getComputedStyleInfo(element) {
    const computed = window.getComputedStyle(element);
    return {
      display: computed.display,
      position: computed.position,
      flexDirection: computed.flexDirection,
      justifyContent: computed.justifyContent,
      alignItems: computed.alignItems,
      gap: computed.gap,
      marginTop: computed.marginTop,
      marginRight: computed.marginRight,
      marginBottom: computed.marginBottom,
      marginLeft: computed.marginLeft,
      paddingTop: computed.paddingTop,
      paddingRight: computed.paddingRight,
      paddingBottom: computed.paddingBottom,
      paddingLeft: computed.paddingLeft,
      width: computed.width,
      height: computed.height,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      borderRadius: computed.borderRadius,
    };
  }

  // Check if element should be ignored
  function shouldIgnoreElement(element) {
    if (!element || element.nodeType !== 1) return true;
    const ignoreTags = ['SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'HTML', 'NOSCRIPT'];
    if (ignoreTags.includes(element.tagName)) return true;
    if (element.closest('[data-ve-overlay]')) return true;
    const computed = window.getComputedStyle(element);
    if (computed.display === 'none' || computed.visibility === 'hidden') return true;
    return false;
  }

  // Get element info for parent
  function getElementInfo(element) {
    if (shouldIgnoreElement(element)) return null;
    
    const id = generateElementId(element);
    const rect = element.getBoundingClientRect();
    const sourceFile = element.getAttribute('data-ve-file');
    const sourceLine = element.getAttribute('data-ve-line');
    
    // Get only the FIRST direct text node content to prevent duplication
    let textContent = '';
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        textContent = node.textContent.trim();
        break;
      }
    }
    
    return {
      id,
      tagName: element.tagName,
      textContent: textContent,
      className: element.className || '',
      computedStyles: getComputedStyleInfo(element),
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      sourceFile: sourceFile || undefined,
      sourceLine: sourceLine ? parseInt(sourceLine, 10) : undefined,
    };
  }

  // Send message to parent with origin check
  function sendToParent(message) {
    try {
      window.parent.postMessage(message, '*');
    } catch (e) {
      console.warn('[VE-Client] Failed to send message:', e);
    }
  }

  // Create overlay element
  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.setAttribute('data-ve-overlay', 'true');
    overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:999999;box-sizing:border-box;transition:all 0.1s ease;';
    document.body.appendChild(overlay);
    return overlay;
  }

  // Update overlay position and style
  function updateOverlay(overlay, rect, type) {
    if (!overlay) return;
    const isHover = type === 'hover';
    const color = isHover ? 'rgba(59,130,246,0.5)' : 'rgba(37,99,235,0.7)';
    const bg = isHover ? 'rgba(59,130,246,0.05)' : 'rgba(37,99,235,0.05)';
    overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:999999;box-sizing:border-box;' +
      'top:' + rect.top + 'px;left:' + rect.left + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;' +
      'border:2px solid ' + color + ';background:' + bg + ';transition:all 0.1s ease;';
  }

  // Remove overlay
  function removeOverlay(overlay) {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  // Find element by ID
  function findElementById(id) {
    return document.querySelector('[data-ve-id="' + id + '"]');
  }

  // Clear all selections
  function clearSelection() {
    selectedElements.clear();
    selectionOverlays.forEach(removeOverlay);
    selectionOverlays.clear();
  }

  // Event Handlers
  function handleMouseMove(e) {
    if (!isEnabled) return;
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element || shouldIgnoreElement(element)) {
      if (hoveredElement) {
        hoveredElement = null;
        removeOverlay(hoverOverlay);
        hoverOverlay = null;
        sendToParent({ type: 'ELEMENT_HOVERED', payload: { element: null } });
      }
      return;
    }
    
    const elementId = generateElementId(element);
    if (hoveredElement !== element && !selectedElements.has(elementId)) {
      hoveredElement = element;
      if (!hoverOverlay) hoverOverlay = createOverlay();
      updateOverlay(hoverOverlay, element.getBoundingClientRect(), 'hover');
      sendToParent({ type: 'ELEMENT_HOVERED', payload: { element: getElementInfo(element) } });
    }
  }

  function handleClick(e) {
    if (!isEnabled) return;
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element || shouldIgnoreElement(element)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const elementId = generateElementId(element);
    const isMultiSelect = e.ctrlKey || e.metaKey;
    
    if (isMultiSelect) {
      if (selectedElements.has(elementId)) {
        selectedElements.delete(elementId);
        removeOverlay(selectionOverlays.get(elementId));
        selectionOverlays.delete(elementId);
        sendToParent({ type: 'ELEMENT_DESELECTED', payload: { elementId } });
      } else {
        selectedElements.set(elementId, element);
        const overlay = createOverlay();
        selectionOverlays.set(elementId, overlay);
        updateOverlay(overlay, element.getBoundingClientRect(), 'selected');
        sendToParent({ type: 'ELEMENT_SELECTED', payload: { elements: [getElementInfo(element)], isMultiSelect: true } });
      }
    } else {
      clearSelection();
      selectedElements.set(elementId, element);
      const overlay = createOverlay();
      selectionOverlays.set(elementId, overlay);
      updateOverlay(overlay, element.getBoundingClientRect(), 'selected');
      sendToParent({ type: 'ELEMENT_SELECTED', payload: { elements: [getElementInfo(element)], isMultiSelect: false } });
    }
    
    if (hoverOverlay) { removeOverlay(hoverOverlay); hoverOverlay = null; }
    hoveredElement = null;
  }

  function handleKeyDown(e) {
    if (!isEnabled) return;
    if (e.key === 'Escape') {
      clearSelection();
      sendToParent({ type: 'CLEAR_SELECTION', payload: {} });
    }
  }

  function handleScroll() {
    selectionOverlays.forEach(function(overlay, elementId) {
      const element = findElementById(elementId);
      if (element) updateOverlay(overlay, element.getBoundingClientRect(), 'selected');
    });
    if (hoverOverlay && hoveredElement) {
      updateOverlay(hoverOverlay, hoveredElement.getBoundingClientRect(), 'hover');
    }
  }

  // Load a Google Font dynamically
  function loadGoogleFont(fontFamily) {
    // Skip system fonts
    var systemFonts = ['system-ui', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'sans-serif', 'serif', 'monospace'];
    if (systemFonts.some(function(sf) { return fontFamily.toLowerCase().includes(sf.toLowerCase()); })) {
      return;
    }
    
    // Clean font name (remove fallbacks like "Inter, sans-serif")
    var cleanFont = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
    if (!cleanFont) return;
    
    // Check if already loaded
    var fontId = 'google-font-' + cleanFont.replace(/\\s+/g, '-').toLowerCase();
    if (document.getElementById(fontId)) {
      console.log('[VE-Client] Font already loaded:', cleanFont);
      return;
    }
    
    // Create link element
    var link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(cleanFont) + ':wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
    console.log('[VE-Client] Loaded Google Font:', cleanFont);
  }

  // Apply style changes from parent
  function applyStyleChanges(elementId, changes) {
    const element = findElementById(elementId);
    if (!element) return false;
    changes.forEach(function(change) {
      const prop = change.property.replace(/([A-Z])/g, '-\$1').toLowerCase();
      
      // If it's a font-family change, load the Google Font first
      if (prop === 'font-family') {
        loadGoogleFont(change.newValue);
      }
      
      element.style.setProperty(prop, change.newValue);
    });
    const overlay = selectionOverlays.get(elementId);
    if (overlay) updateOverlay(overlay, element.getBoundingClientRect(), 'selected');
    sendToParent({ type: 'STYLE_APPLIED', payload: { elementId, success: true } });
    return true;
  }

  // Update text content from parent
  function updateTextContent(elementId, text) {
    const element = findElementById(elementId);
    if (!element) return false;
    
    // Find and update only the FIRST text node to prevent duplication
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = text;
        sendToParent({ type: 'TEXT_UPDATED', payload: { elementId, success: true } });
        return true;
      }
    }
    
    // If no text node exists, prepend one for elements with children
    if (element.children.length > 0) {
      element.insertBefore(document.createTextNode(text), element.firstChild);
      sendToParent({ type: 'TEXT_UPDATED', payload: { elementId, success: true } });
      return true;
    }
    
    // For simple elements with no children, set textContent directly
    element.textContent = text;
    sendToParent({ type: 'TEXT_UPDATED', payload: { elementId, success: true } });
    return true;
  }

  // Message handler
  function handleMessage(event) {
    // Security: Only allow messages from known origins
    if (!isAllowedOrigin(event.origin)) {
      return;
    }
    
    var message = event.data;
    if (!message || !message.type) return;
    
    switch (message.type) {
      case 'VISUAL_EDITOR_INIT':
      case 'VISUAL_EDITOR_TOGGLE':
        isEnabled = message.payload.enabled;
        if (!isEnabled) {
          clearSelection();
          if (hoverOverlay) { removeOverlay(hoverOverlay); hoverOverlay = null; }
          hoveredElement = null;
        }
        document.body.style.cursor = isEnabled ? 'crosshair' : '';
        sendToParent({ type: 'VISUAL_EDITOR_READY', payload: { enabled: isEnabled } });
        break;
      case 'CLEAR_SELECTION':
        clearSelection();
        break;
      case 'APPLY_STYLE':
        applyStyleChanges(message.payload.elementId, message.payload.changes);
        break;
      case 'UPDATE_TEXT':
        updateTextContent(message.payload.elementId, message.payload.text);
        break;
      case 'REQUEST_ELEMENT_INFO':
        var el = findElementById(message.payload.elementId);
        if (el) sendToParent({ type: 'ELEMENT_INFO_RESPONSE', payload: { element: getElementInfo(el) } });
        break;
      case 'APPLY_THEME_PREVIEW':
        console.log('[VE-Client] Received APPLY_THEME_PREVIEW message');
        applyThemePreview(message.payload.themeVars);
        break;
      case 'CLEAR_THEME_PREVIEW':
        console.log('[VE-Client] Received CLEAR_THEME_PREVIEW message');
        clearThemePreview();
        break;
      case 'DRAG_ELEMENT_START':
        console.log('[VE-Client] Received DRAG_ELEMENT_START message');
        startDragMode(message.payload.elementType, message.payload.content);
        break;
      case 'DRAG_ELEMENT_END':
        console.log('[VE-Client] Received DRAG_ELEMENT_END message');
        endDragMode();
        break;
      case 'INSERT_ELEMENT':
        console.log('[VE-Client] Received INSERT_ELEMENT message');
        insertElement(message.payload.content, message.payload.targetElementId, message.payload.position);
        break;
    }
  }

  // Apply theme preview - set CSS variables directly on :root (like thmeswitcher.html)
  function applyThemePreview(themeVars) {
    console.log('[VE-Client] applyThemePreview called with vars:', themeVars ? Object.keys(themeVars).length + ' variables' : 'null');
    
    if (!themeVars || typeof themeVars !== 'object') {
      console.warn('[VE-Client] No theme variables provided');
      return;
    }
    
    // Apply CSS variables directly to :root using setProperty (same as thmeswitcher.html)
    var root = document.documentElement;
    var appliedCount = 0;
    var backgroundValue = null;
    
    Object.entries(themeVars).forEach(function(entry) {
      var key = entry[0];
      var value = entry[1];
      root.style.setProperty(key, value);
      appliedCount++;
      
      // Track background for direct application
      if (key === '--background') {
        backgroundValue = value;
      }
      
      // Log first few for debugging
      if (appliedCount <= 5) {
        console.log('[VE-Client] Set', key, '=', value);
      }
    });
    
    // Also apply background directly to body as fallback for apps that don't use CSS variables
    if (backgroundValue) {
      document.body.style.backgroundColor = 'hsl(' + backgroundValue + ')';
      console.log('[VE-Client] Also set body background to:', 'hsl(' + backgroundValue + ')');
    }
    
    // Verify the variables were set
    var testVar = root.style.getPropertyValue('--background');
    console.log('[VE-Client] Verification: --background =', testVar);
    console.log('[VE-Client] Root style attribute length:', root.getAttribute('style') ? root.getAttribute('style').length : 0);
    
    console.log('[VE-Client] Theme preview applied via setProperty,', appliedCount, 'CSS variables set');
    sendToParent({ type: 'THEME_PREVIEW_APPLIED', payload: { success: true, varsCount: appliedCount } });
  }

  // Clear theme preview - remove CSS variables from :root
  function clearThemePreview() {
    var root = document.documentElement;
    var computedStyle = window.getComputedStyle(root);
    var propsToRemove = [];
    
    // Collect all CSS custom properties
    for (var i = 0; i < root.style.length; i++) {
      var prop = root.style[i];
      if (prop.startsWith('--')) {
        propsToRemove.push(prop);
      }
    }
    
    // Remove them
    propsToRemove.forEach(function(prop) {
      root.style.removeProperty(prop);
    });
    
    console.log('[VE-Client] Theme preview cleared, removed', propsToRemove.length, 'CSS variables');
    sendToParent({ type: 'THEME_PREVIEW_CLEARED', payload: { success: true } });
  }

  // ============================================
  // DRAG AND DROP FUNCTIONS
  // ============================================
  var isDraggingElement = false;
  var dragElementType = null;
  var dragElementContent = null;
  var dropTargetOverlay = null;
  var currentDropTarget = null;
  var dropPosition = 'inside';

  function startDragMode(elementType, content) {
    isDraggingElement = true;
    dragElementType = elementType;
    dragElementContent = content;
    document.body.style.cursor = 'copy';
    
    // Create drop target overlay
    if (!dropTargetOverlay) {
      dropTargetOverlay = document.createElement('div');
      dropTargetOverlay.setAttribute('data-ve-overlay', 'true');
      dropTargetOverlay.id = 've-drop-overlay';
      dropTargetOverlay.style.cssText = 'position: fixed; pointer-events: none; z-index: 999998; box-sizing: border-box; border: 2px dashed #22c55e; background: rgba(34, 197, 94, 0.1); display: none;';
      document.body.appendChild(dropTargetOverlay);
    }
    
    // Add drag-specific event listeners
    document.addEventListener('mousemove', handleDragMove, true);
    document.addEventListener('click', handleDrop, true);
    document.addEventListener('keydown', handleDragKeyDown, true);
    
    console.log('[VE-Client] Drag mode started:', elementType);
    sendToParent({ type: 'DRAG_MODE_STARTED', payload: { elementType: elementType } });
  }

  function endDragMode() {
    isDraggingElement = false;
    dragElementType = null;
    dragElementContent = null;
    currentDropTarget = null;
    document.body.style.cursor = isEnabled ? 'crosshair' : '';
    
    // Hide drop overlay
    if (dropTargetOverlay) {
      dropTargetOverlay.style.display = 'none';
    }
    
    // Remove drag event listeners
    document.removeEventListener('mousemove', handleDragMove, true);
    document.removeEventListener('click', handleDrop, true);
    document.removeEventListener('keydown', handleDragKeyDown, true);
    
    console.log('[VE-Client] Drag mode ended');
  }

  function handleDragMove(event) {
    if (!isDraggingElement) return;
    
    var target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target || shouldIgnoreElement(target)) {
      if (dropTargetOverlay) dropTargetOverlay.style.display = 'none';
      currentDropTarget = null;
      return;
    }
    
    // Find valid drop container
    var foundDropTarget = findDropTarget(target);
    if (!foundDropTarget) {
      if (dropTargetOverlay) dropTargetOverlay.style.display = 'none';
      currentDropTarget = null;
      return;
    }
    
    currentDropTarget = foundDropTarget;
    
    // Determine drop position based on mouse position
    var rect = foundDropTarget.getBoundingClientRect();
    var mouseY = event.clientY;
    var relativeY = (mouseY - rect.top) / rect.height;
    
    if (relativeY < 0.25) {
      dropPosition = 'before';
    } else if (relativeY > 0.75) {
      dropPosition = 'after';
    } else {
      dropPosition = 'inside';
    }
    
    // Update drop overlay
    if (dropTargetOverlay) {
      dropTargetOverlay.style.display = 'block';
      
      if (dropPosition === 'before') {
        dropTargetOverlay.style.left = rect.left + 'px';
        dropTargetOverlay.style.top = (rect.top - 2) + 'px';
        dropTargetOverlay.style.width = rect.width + 'px';
        dropTargetOverlay.style.height = '4px';
        dropTargetOverlay.style.background = '#22c55e';
        dropTargetOverlay.style.border = 'none';
      } else if (dropPosition === 'after') {
        dropTargetOverlay.style.left = rect.left + 'px';
        dropTargetOverlay.style.top = (rect.bottom - 2) + 'px';
        dropTargetOverlay.style.width = rect.width + 'px';
        dropTargetOverlay.style.height = '4px';
        dropTargetOverlay.style.background = '#22c55e';
        dropTargetOverlay.style.border = 'none';
      } else {
        dropTargetOverlay.style.left = rect.left + 'px';
        dropTargetOverlay.style.top = rect.top + 'px';
        dropTargetOverlay.style.width = rect.width + 'px';
        dropTargetOverlay.style.height = rect.height + 'px';
        dropTargetOverlay.style.background = 'rgba(34, 197, 94, 0.1)';
        dropTargetOverlay.style.border = '2px dashed #22c55e';
      }
    }
  }

  function findDropTarget(element) {
    var validContainers = ['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'ASIDE', 'HEADER', 'FOOTER', 'NAV', 'FORM', 'UL', 'OL', 'BODY'];
    
    var current = element;
    while (current && current !== document.body) {
      if (validContainers.indexOf(current.tagName) !== -1 && !current.hasAttribute('data-ve-overlay')) {
        return current;
      }
      current = current.parentElement;
    }
    
    return document.body;
  }

  function handleDrop(event) {
    if (!isDraggingElement || !currentDropTarget || !dragElementContent) {
      endDragMode();
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    // Parse the JSX content and create HTML element
    var htmlContent = jsxToHtml(dragElementContent);
    
    // Create a temporary container to parse the HTML
    var temp = document.createElement('div');
    temp.innerHTML = htmlContent;
    var newElement = temp.firstElementChild;
    
    if (!newElement) {
      console.warn('[VE-Client] Failed to create element');
      endDragMode();
      return;
    }
    
    // Generate unique ID for the new element
    var elementId = 've-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    newElement.setAttribute('data-ve-id', elementId);
    
    // Insert element based on position
    if (dropPosition === 'before') {
      currentDropTarget.parentNode.insertBefore(newElement, currentDropTarget);
    } else if (dropPosition === 'after') {
      currentDropTarget.parentNode.insertBefore(newElement, currentDropTarget.nextSibling);
    } else {
      currentDropTarget.appendChild(newElement);
    }
    
    // Notify parent about the insertion
    sendToParent({
      type: 'ELEMENT_INSERTED',
      payload: {
        elementId: elementId,
        content: dragElementContent,
        position: dropPosition,
        parentTag: currentDropTarget.tagName
      }
    });
    
    console.log('[VE-Client] Element inserted:', elementId, 'position:', dropPosition);
    
    endDragMode();
  }

  function handleDragKeyDown(event) {
    if (event.key === 'Escape') {
      endDragMode();
      sendToParent({ type: 'DRAG_CANCELLED', payload: {} });
    }
  }

  function jsxToHtml(jsx) {
    if (!jsx) return '';
    
    return jsx
      .replace(/className=/g, 'class=')
      .replace(/htmlFor=/g, 'for=')
      .replace(/\\{[^}]*\\}/g, '')
      .replace(/<(\\w+)([^>]*)\\/>/g, '<$1$2></$1>')
      .replace(/\\s+/g, ' ')
      .trim();
  }

  function insertElement(content, targetElementId, position) {
    var target = targetElementId ? findElementById(targetElementId) : document.body;
    if (!target) {
      target = document.body;
    }
    
    var htmlContent = jsxToHtml(content);
    var temp = document.createElement('div');
    temp.innerHTML = htmlContent;
    var newElement = temp.firstElementChild;
    
    if (!newElement) {
      console.warn('[VE-Client] Failed to create element for insertion');
      return;
    }
    
    var elementId = 've-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    newElement.setAttribute('data-ve-id', elementId);
    
    if (position === 'before') {
      target.parentNode.insertBefore(newElement, target);
    } else if (position === 'after') {
      target.parentNode.insertBefore(newElement, target.nextSibling);
    } else {
      target.appendChild(newElement);
    }
    
    sendToParent({
      type: 'ELEMENT_INSERTED',
      payload: {
        elementId: elementId,
        content: content,
        position: position || 'inside'
      }
    });
    
    console.log('[VE-Client] Element inserted via INSERT_ELEMENT:', elementId);
  }

  // Initialize
  function init() {
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    window.addEventListener('message', handleMessage);
    
    // Notify parent we're ready
    sendToParent({ type: 'VISUAL_EDITOR_READY', payload: {} });
    console.log('[VE-Client] Initialized - waiting for parent commands');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`,
      fileType: 'javascript',
      type: 'javascript',
      size: 0,
      isDirectory: false
    },
    // Copy all shadcn/ui components from Vite template
    {
      name: 'utils.ts',
      path: 'src/lib/utils.ts',
      content: `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    // All the shadcn/ui components will be added here - copying from Vite template
    {
      name: 'button.tsx',
      path: 'src/components/ui/button.tsx',
      content: `import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'card.tsx',
      path: 'src/components/ui/card.tsx',
      content: `import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'input.tsx',
      path: 'src/components/ui/input.tsx',
      content: `import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'label.tsx',
      path: 'src/components/ui/label.tsx',
      content: `import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'alert.tsx',
      path: 'src/components/ui/alert.tsx',
      content: `import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'badge.tsx',
      path: 'src/components/ui/badge.tsx',
      content: `import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'dialog.tsx',
      path: 'src/components/ui/dialog.tsx',
      content: `"use client"
      
      import * as React from "react"
      import * as DialogPrimitive from "@radix-ui/react-dialog"
      import { XIcon } from "lucide-react"
      
      import { cn } from "@/lib/utils"
      
      function Dialog({
        ...props
      }: React.ComponentProps<typeof DialogPrimitive.Root>) {
        return <DialogPrimitive.Root data-slot="dialog" {...props} />
      }
      
      function DialogTrigger({
        ...props
      }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
        return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
      }
      
      function DialogPortal({
        ...props
      }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
        return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
      }
      
      function DialogClose({
        ...props
      }: React.ComponentProps<typeof DialogPrimitive.Close>) {
        return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
      }
      
      function DialogOverlay({
        className,
        ...props
      }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
        return (
          <DialogPrimitive.Overlay
            data-slot="dialog-overlay"
            className={cn(
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
              className
            )}
            {...props}
          />
        )
      }
      
      function DialogContent({
        className,
        children,
        showCloseButton = true,
        ...props
      }: React.ComponentProps<typeof DialogPrimitive.Content> & {
        showCloseButton?: boolean
      }) {
        return (
          <DialogPortal data-slot="dialog-portal">
            <DialogOverlay />
            <DialogPrimitive.Content
              data-slot="dialog-content"
              className={cn(
                "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
                className
              )}
              {...props}
            >
              {children}
              {showCloseButton && (
                <DialogPrimitive.Close
                  data-slot="dialog-close"
                  className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                >
                  <XIcon />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              )}
            </DialogPrimitive.Content>
          </DialogPortal>
        )
      }
      
      function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
        return (
          <div
            data-slot="dialog-header"
            className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
            {...props}
          />
        )
      }
      
      function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
        return (
          <div
            data-slot="dialog-footer"
            className={cn(
              "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
              className
            )}
            {...props}
          />
        )
      }
      
      function DialogTitle({
        className,
        ...props
      }: React.ComponentProps<typeof DialogPrimitive.Title>) {
        return (
          <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn("text-lg leading-none font-semibold", className)}
            {...props}
          />
        )
      }
      
      function DialogDescription({
        className,
        ...props
      }: React.ComponentProps<typeof DialogPrimitive.Description>) {
        return (
          <DialogPrimitive.Description
            data-slot="dialog-description"
            className={cn("text-muted-foreground text-sm", className)}
            {...props}
          />
        )
      }
      
      export {
        Dialog,
        DialogClose,
        DialogContent,
        DialogDescription,
        DialogFooter,
        DialogHeader,
        DialogOverlay,
        DialogPortal,
        DialogTitle,
        DialogTrigger,
      }
      `,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'dropdown-menu.tsx',
      path: 'src/components/ui/dropdown-menu.tsx',
      content: `"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  )
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'checkbox.tsx',
      path: 'src/components/ui/checkbox.tsx',
      content: `import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'select.tsx',
      path: 'src/components/ui/select.tsx',
      content: `import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'textarea.tsx',
      path: 'src/components/ui/textarea.tsx',
      content: `import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'switch.tsx',
      path: 'src/components/ui/switch.tsx',
      content: `import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'tabs.tsx',
      path: 'src/components/ui/tabs.tsx',
      content: `import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'tooltip.tsx',
      path: 'src/components/ui/tooltip.tsx',
      content: `import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'avatar.tsx',
      path: 'src/components/ui/avatar.tsx',
      content: `import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'separator.tsx',
      path: 'src/components/ui/separator.tsx',
      content: `import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'accordion.tsx',
      path: 'src/components/ui/accordion.tsx',
      content: `import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))

AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'popover.tsx',
      path: 'src/components/ui/popover.tsx',
      content: `import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'progress.tsx',
      path: 'src/components/ui/progress.tsx',
      content: `import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: \`translateX(-\${100 - (value || 0)}%)\` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'slider.tsx',
      path: 'src/components/ui/slider.tsx',
      content: `import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'breadcrumb.tsx',
      path: 'src/components/ui/breadcrumb.tsx',
      content: `import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"nav"> & {
    separator?: React.ReactNode
  }
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />)
Breadcrumb.displayName = "Breadcrumb"

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<"ol">
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
      className
    )}
    {...props}
  />
))
BreadcrumbList.displayName = "BreadcrumbList"

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("inline-flex items-center gap-1.5", className)}
    {...props}
  />
))
BreadcrumbItem.displayName = "BreadcrumbItem"

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a"> & {
    asChild?: boolean
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      ref={ref}
      className={cn("transition-colors hover:text-foreground", className)}
      {...props}
    />
  )
})
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn("font-normal text-foreground", className)}
    {...props}
  />
))
BreadcrumbPage.displayName = "BreadcrumbPage"

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn("[&>svg]:size-3.5", className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
)
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
)
BreadcrumbEllipsis.displayName = "BreadcrumbElipssis"

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'skeleton.tsx',
      path: 'src/components/ui/skeleton.tsx',
      content: `import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'sonner.tsx',
      path: 'src/components/ui/sonner.tsx',
      content: `import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'table.tsx',
      path: 'src/components/ui/table.tsx',
      content: `import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'form.tsx',
      path: 'src/components/ui/form.tsx',
      content: `import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: \`\${id}-form-item\`,
    formDescriptionId: \`\${id}-form-item-description\`,
    formMessageId: \`\${id}-form-item-message\`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? \`\${formDescriptionId}\`
          : \`\${formDescriptionId} \${formMessageId}\`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message) : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'command.tsx',
      path: 'src/components/ui/command.tsx',
      content: `import * as React from "react"
import { type DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

const CommandDialog = ({ children, ...props }: DialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  />
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  />
))

CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'carousel.tsx',
      path: 'src/components/ui/carousel.tsx',
      content: `import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  opts?: CarouselOptions
  orientation: "horizontal" | "vertical" | (string & {})
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(
  (
    {
      orientation = "horizontal",
      opts,
      setApi,
      className,
      children,
      plugins,
      ...props
    },
    ref
  ) => {
    const [emblaRef, emblaApi] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      plugins
    )
    const [canScrollPrev, setCanScrollPrev] = React.useState(false)
    const [canScrollNext, setCanScrollNext] = React.useState(false)

    const onSelect = React.useCallback((api: CarouselApi) => {
      if (!api) {
        return
      }

      setCanScrollPrev(api.canScrollPrev())
      setCanScrollNext(api.canScrollNext())
    }, [])

    const scrollPrev = React.useCallback(() => {
      emblaApi?.scrollPrev()
    }, [emblaApi])

    const scrollNext = React.useCallback(() => {
      emblaApi?.scrollNext()
    }, [emblaApi])

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          scrollPrev()
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          scrollNext()
        }
      },
      [scrollPrev, scrollNext]
    )

    React.useEffect(() => {
      if (!emblaApi || !setApi) {
        return
      }

      setApi(emblaApi)
    }, [emblaApi, setApi])

    React.useEffect(() => {
      if (!emblaApi) {
        return
      }

      onSelect(emblaApi)
      emblaApi.on("reInit", onSelect)
      emblaApi.on("select", onSelect)

      return () => {
        emblaApi?.off("select", onSelect)
      }
    }, [emblaApi, onSelect])

    return (
      <CarouselContext.Provider
        value={{
          carouselRef: emblaRef,
          api: emblaApi,
          opts,
          orientation: orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
        }}
      >
        <div
          ref={ref}
          onKeyDownCapture={handleKeyDown}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    )
  }
)
Carousel.displayName = "Carousel"

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div
      ref={carouselRef}
      className="overflow-hidden"
    >
      <div
        ref={ref}
        className={cn(
          "flex",
          orientation === "horizontal" ? "h-full" : "h-full flex-col",
          className
        )}
        {...props}
      />
    </div>
  )
})
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel()

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
})
CarouselItem.displayName = "CarouselItem"

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full",
        orientation === "horizontal"
          ? "left-12 top-1/2 -translate-y-1/2"
          : "left-1/2 top-12 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
})
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full",
        orientation === "horizontal"
          ? "right-12 top-1/2 -translate-y-1/2"
          : "bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ChevronRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  )
})
CarouselNext.displayName = "CarouselNext"

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'toast.tsx',
      path: 'src/components/ui/toast.tsx',
      content: `import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'collapsible.tsx',
      path: 'src/components/ui/collapsible.tsx',
      content: `"use client"

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  )
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'scroll-area.tsx',
      path: 'src/components/ui/scroll-area.tsx',
      content: `import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'pagination.tsx',
      path: 'src/components/ui/pagination.tsx',
      content: `import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { ButtonProps, buttonVariants } from "@/components/ui/button"

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      className
    )}
    {...props}
  />
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'calendar.tsx',
      path: 'src/components/ui/calendar.tsx',
      content: `import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'data-table.tsx',
      path: 'src/components/ui/data-table.tsx',
      content: `import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, MoreHorizontal } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Filter...",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    // Custom Hooks
    {
      name: 'useLocalStorage.ts',
      path: 'src/hooks/useLocalStorage.ts',
      content: `import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue
      }
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.log(error)
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.log(error)
    }
  }

  return [storedValue, setValue] as const
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useDebounce.ts',
      path: 'src/hooks/useDebounce.ts',
      content: `import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useOnClickOutside.ts',
      path: 'src/hooks/useOnClickOutside.ts',
      content: `import { useEffect, RefObject } from 'react'

export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      handler(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useMediaQuery.ts',
      path: 'src/hooks/useMediaQuery.ts',
      content: `import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [matches, query])

  return matches
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useMobile.ts',
      path: 'src/hooks/useMobile.ts',
      content: `import { useState, useEffect } from 'react'

export function useMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false)

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    // Check on mount
    checkIsMobile()

    // Add event listener
    window.addEventListener('resize', checkIsMobile)

    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [breakpoint])

  return isMobile
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useCopyToClipboard.ts',
      path: 'src/hooks/useCopyToClipboard.ts',
      content: `import { useState } from 'react'

export function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const copy = async (text: string) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported')
      return false
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      return true
    } catch (error) {
      console.warn('Copy failed', error)
      setCopiedText(null)
      return false
    }
  }

  return { copiedText, copy }
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useInterval.ts',
      path: 'src/hooks/useInterval.ts',
      content: `import { useEffect, useRef } from 'react'

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) {
      return
    }

    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'usePrevious.ts',
      path: 'src/hooks/usePrevious.ts',
      content: `import { useRef, useEffect } from 'react'

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>()

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useToggle.ts',
      path: 'src/hooks/useToggle.ts',
      content: `import { useState } from 'react'

export function useToggle(initialValue: boolean = false) {
  const [value, setValue] = useState<boolean>(initialValue)

  const toggle = () => setValue((prev) => !prev)
  const setTrue = () => setValue(true)
  const setFalse = () => setValue(false)

  return { value, toggle, setTrue, setFalse, setValue }
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useToast.ts',
      path: 'src/hooks/useToast.ts',
      content: `import { useState, useCallback } from 'react'

export interface ToastOptions {
  title?: string
  description?: string
  duration?: number
  variant?: 'default' | 'destructive' | 'success'
}

export interface ToastState {
  id: string
  title?: string
  description?: string
  variant: 'default' | 'destructive' | 'success'
  duration: number
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([])

  const toast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastState = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant || 'default',
      duration: options.duration || 4000,
    }

    setToasts((prev) => [...prev, newToast])

    // Auto remove after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, newToast.duration)

    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = useCallback((options: Omit<ToastOptions, 'variant'>) => {
    return toast({ ...options, variant: 'success' })
  }, [toast])

  const error = useCallback((options: Omit<ToastOptions, 'variant'>) => {
    return toast({ ...options, variant: 'destructive' })
  }, [toast])

  return {
    toasts,
    toast,
    success,
    error,
    dismiss,
  }
}`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'useTheme.ts',
      path: 'src/hooks/useTheme.ts',
      content: `import { useState, useEffect, createContext, useContext } from 'react';

// Define theme types
type Theme = 'light' | 'dark' | 'system';

// Define context type
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

// Create context with undefined default value
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component (logic only - no JSX)
export function ThemeProviderLogic() {
  // Initialize theme state with localStorage or default to 'system'
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          return stored;
        }
      }
    } catch (error) {
      // Silently handle localStorage errors (non-breaking)
    }
    return 'system';
  });

  // Initialize resolved theme state
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = window.document.documentElement;

    const updateTheme = () => {
      try {
        let resolved: 'light' | 'dark' = 'dark';

        // Determine the resolved theme based on current theme setting
        if (theme === 'system') {
          resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else {
          resolved = theme;
        }

        // Update state and apply theme classes
        setResolvedTheme(resolved);
        root.classList.remove('light', 'dark');
        root.classList.add(resolved);

        // Save theme to localStorage
        localStorage.setItem('theme', theme);
      } catch (error) {
        // Silently handle theme update errors (non-breaking)
      }
    };

    // Initial theme update
    updateTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return { theme, setTheme, resolvedTheme };
}

// Custom hook for using theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export context for provider implementation elsewhere
export { ThemeContext };`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'index.ts',
      path: 'src/hooks/index.ts',
      content: `export { useLocalStorage } from './useLocalStorage'
export { useDebounce } from './useDebounce'
export { useOnClickOutside } from './useOnClickOutside'
export { useMediaQuery } from './useMediaQuery'
export { useCopyToClipboard } from './useCopyToClipboard'
export { useInterval } from './useInterval'
export { usePrevious } from './usePrevious'
export { useToggle } from './useToggle'
export { useMobile } from './useMobile'
export { useToast } from './useToast'
export { useTheme } from './useTheme'`,
      fileType: 'typescript',
      type: 'typescript',
      size: 0,
      isDirectory: false
    },
    {
      name: 'STORAGE_SYSTEM_IMPLEMENTATION.md',
      path: 'STORAGE_SYSTEM_IMPLEMENTATION.md',
      content: `# 📦 File Storage System - Complete Implementation

## 🎯 Overview

Implemented a complete file storage system similar to Supabase Storage, allowing users to store and manage files (images, documents, videos, etc.) in their databases.

---

## ✨ Key Features

### **Storage Capabilities**
- ✅ **500MB per database** - Each database gets 500MB of storage
- ✅ **10MB max file size** - Individual files up to 10MB
- ✅ **Multiple file types** - Images, PDFs, documents, videos, audio
- ✅ **Public & private files** - Control file access
- ✅ **Signed URLs** - Secure temporary access to private files
- ✅ **CDN delivery** - Fast file delivery via Supabase CDN
- ✅ **Automatic usage tracking** - Real-time storage usage monitoring

### **Security Features**
- ✅ **Row Level Security (RLS)** - Users can only access their files
- ✅ **File type validation** - Only allowed types can be uploaded
- ✅ **Size limits enforced** - Prevents storage abuse
- ✅ **API key authentication** - Secure external access
- ✅ **Rate limiting** - Prevents API abuse

---

## 🏗️ Architecture

### **Database Schema**

\`\`\`
storage_buckets
├── id (UUID)
├── database_id (FK → databases.id)
├── name (TEXT)
├── size_limit_bytes (500MB)
├── current_usage_bytes
├── is_public (BOOLEAN)
└── timestamps

storage_files
├── id (UUID)
├── bucket_id (FK → storage_buckets.id)
├── name (generated unique name)
├── original_name (user's filename)
├── path (Supabase Storage path)
├── size_bytes
├── mime_type
├── is_public
├── metadata (JSONB)
└── timestamps
\`\`\`

### **Supabase Storage Structure**

\`\`\`
pipilot-storage (Master Bucket)
├── db_1_myapp/
│   ├── abc123.jpg
│   ├── def456.pdf
│   └── ghi789.mp4
├── db_2_webapp/
│   ├── xyz123.png
│   └── mno456.docx
└── ...
\`\`\`

---

## 📡 API Endpoints

### **Dashboard API (Authenticated Users)**

#### **1. Get Storage Info**
\`\`\`
GET /api/database/{databaseId}/storage
\`\`\`

Returns bucket info, usage stats, and recent files.

**Response:**
\`\`\`json
{
  "bucket": {
    "id": "uuid",
    "name": "db_1_myapp",
    "size_limit_bytes": 524288000,
    "current_usage_bytes": 104857600,
    "is_public": false
  },
  "stats": {
    "file_count": 25,
    "usage_percentage": 20,
    "available_bytes": 419430400
  },
  "files": [...]
}
\`\`\`

#### **2. Upload File**
\`\`\`
POST /api/database/{databaseId}/storage/upload
Content-Type: multipart/form-data
\`\`\`

**Form Data:**
- \`file\` - The file to upload
- \`is_public\` - "true" or "false"
- \`metadata\` - JSON string (optional)

**Response:**
\`\`\`json
{
  "success": true,
  "file": {
    "id": "uuid",
    "name": "abc123.jpg",
    "original_name": "photo.jpg",
    "size_bytes": 1048576,
    "mime_type": "image/jpeg",
    "url": "https://...",
    "is_public": true,
    "created_at": "2025-10-07T..."
  }
}
\`\`\`

#### **3. List Files**
\`\`\`
GET /api/database/{databaseId}/storage/files
  ?limit=50
  &offset=0
  &search=photo
  &mime_type=image/jpeg
\`\`\`

#### **4. Get File Details**
\`\`\`
GET /api/database/{databaseId}/storage/files/{fileId}
\`\`\`

#### **5. Delete File**
\`\`\`
DELETE /api/database/{databaseId}/storage/files/{fileId}
\`\`\`

---

### **Public API (API Key Required)**

#### **Upload File (External Apps)**
\`\`\`
POST /api/v1/databases/{databaseId}/storage/upload
Authorization: Bearer YOUR_API_KEY
Content-Type: multipart/form-data
\`\`\`

---

## 💻 Usage Examples

### **JavaScript/TypeScript (External App)**

\`\`\`typescript
// Upload file
async function uploadFile(file: File, isPublic: boolean = true) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('is_public', isPublic.toString());
  formData.append('metadata', JSON.stringify({
    uploaded_from: 'my-app',
    tags: ['profile', 'avatar']
  }));

  const response = await fetch(
    'https://pipilot.dev/api/v1/databases/YOUR_DB_ID/storage/upload',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY',
      },
      body: formData,
    }
  );

  const data = await response.json();
  
  if (data.success) {
    console.log('File URL:', data.file.url);
    return data.file;
  } else {
    throw new Error(data.error);
  }
}
\`\`\`

---

## 🎨 Allowed File Types

### **Images**
- JPEG/JPG, PNG, GIF, WebP, SVG

### **Documents**
- PDF, Microsoft Word (.doc, .docx), Microsoft Excel (.xls, .xlsx), Text files (.txt), CSV

### **Media**
- Videos (.mp4, .mpeg, .mov), Audio (.mp3, .wav, .ogg)

### **Other**
- JSON files

---

## 🔒 Security Features

### **Row Level Security (RLS)**
\`\`\`sql
-- Users can only access files in their databases
CREATE POLICY "Users can manage their storage files"
  ON storage_files
  FOR ALL
  USING (
    bucket_id IN (
      SELECT sb.id FROM storage_buckets sb
      INNER JOIN databases d ON sb.database_id = d.id
      WHERE d.user_id = auth.uid()::text
    )
  );
\`\`\`

### **File Type Validation**
Only allowed MIME types can be uploaded. Server validates before storing.

### **Size Limits**
- **Per file**: 10MB maximum
- **Per bucket**: 500MB total
- Enforced before upload

---

## 📊 Storage Tracking

### **Automatic Usage Updates**
\`\`\`sql
-- Trigger automatically updates bucket usage
CREATE TRIGGER update_bucket_usage_trigger
  AFTER INSERT OR UPDATE OR DELETE ON storage_files
  FOR EACH ROW
  EXECUTE FUNCTION update_bucket_usage();
\`\`\`

---

## 🎯 Summary

### **What Was Built**

✅ **Database Schema** - Tables, triggers, RLS policies  
✅ **Storage Library** - Reusable functions for file operations  
✅ **Dashboard API** - 5 endpoints for file management  
✅ **Public API** - External app integration  
✅ **Security** - RLS, validation, rate limiting  
✅ **Documentation** - Complete usage guide  

### **What Users Get**

- **500MB storage** per database
- **Secure file uploads** from their apps
- **Public & private files** support
- **CDN delivery** for fast access
- **Automatic tracking** of usage
- **Simple API** similar to Supabase Storage

---

**Implemented by**: Optima AI  
**Date**: October 7, 2025  
**Status**: ✅ Complete & Ready for Testing`,
      fileType: 'markdown',
      type: 'markdown',
      size: 0,
      isDirectory: false
    },
    {
      name: 'EXTERNAL_APP_INTEGRATION_GUIDE.md',
      path: 'EXTERNAL_APP_INTEGRATION_GUIDE.md',
      content: `# 🚀 Quick Start: API Keys for External Apps

---

## 📋 **AUTOMATIC DATABASE SETUP - AI INSTRUCTIONS**

**Great news!** You can now **automatically set up the entire database** using your agentic tools. No manual user setup required!

### 🤖 **Your Database Tools:**

You have complete database management capabilities:
- \`create_table\` - You generate optimized schemas from natural language descriptions
- \`list_tables\` - You discover all existing tables
- \`read_table\` - You inspect table structure and metadata
- \`delete_table\` - You remove tables when needed
- \`query_database\` - You perform advanced querying with MySQL-like syntax
- \`manipulate_table_data\` - You handle full CRUD operations (insert, update, delete)
- \`manage_api_keys\` - You generate secure API keys for external access

### 💡 **When User Requests Database Setup:**

The user will ask you things like:

**Example user requests:**
- "Create a users table with email, password, and profile fields"
- "Set up a complete blog database with posts, comments, and categories"
- "Add a products table with inventory tracking"
- "Generate an API key for my Vercel deployment"
- "Insert sample data for testing"

**Your Response:**
1. ✅ Use \`create_table\` to create tables with optimized schemas
2. ✅ Set up relationships and constraints automatically
3. ✅ Use \`manage_api_keys\` to generate API keys
4. ✅ Provide the user with database/table IDs
5. ✅ Use \`manipulate_table_data\` to insert sample data if requested

### 🔑 **What to Provide the User:**

After you create tables and API key, give them:
- Database ID
- Table ID(s)
- API Key (tell them to save it securely!)
- Ready-to-use code snippets

---

## Using Your Database in External Apps

### Step 3: Use in Your App

#### **Next.js App (Vercel):**
                                  Database ID   Table ID
\`\`\`

### Step 3: Use in Your App

#### **Next.js App (Vercel):**

Create \`lib/database.ts\`:

\`\`\`typescript
const API_KEY = process.env.PIPILOT_API_KEY!;
const DATABASE_ID = 'YOUR_DATABASE_ID';
const BASE_URL = 'https://pipilot.dev/api/v1';

export async function getRecords(tableId: string) {
  const response = await fetch(
    \`\${BASE_URL}/databases/\${DATABASE_ID}/tables/\${tableId}/records\`,
    {
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch records');
  }
  
  return response.json();
}

export async function createRecord(tableId: string, data: any) {
  const response = await fetch(
    \`\${BASE_URL}/databases/\${DATABASE_ID}/tables/\${tableId}/records\`,
    {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data })
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to create record');
  }
  
  return response.json();
}

export async function updateRecord(tableId: string, recordId: string, data: any) {
  const response = await fetch(
    \`\${BASE_URL}/databases/\${DATABASE_ID}/tables/\${tableId}/records/\${recordId}\`,
    {
      method: 'PUT',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data })
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to update record');
  }
  
  return response.json();
}

export async function deleteRecord(tableId: string, recordId: string) {
  const response = await fetch(
    \`\${BASE_URL}/databases/\${DATABASE_ID}/tables/\${tableId}/records/\${recordId}\`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to delete record');
  }
  
  return response.json();
}
\`\`\`

#### **Use in a Server Component:**

\`\`\`typescript
// app/users/page.tsx
import { getRecords } from '@/lib/database';

export default async function UsersPage() {
  const { records } = await getRecords('YOUR_TABLE_ID');
  
  return (
    <div>
      <h1>Users</h1>
      {records.map((record: any) => (
        <div key={record.id}>
          {record.data_json.name} - {record.data_json.email}
        </div>
      ))}
    </div>
  );
}
\`\`\`

#### **Use in an API Route:**

\`\`\`typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { createRecord } from '@/lib/database';

export async function POST(request: Request) {
  const body = await request.json();
  
  try {
    const result = await createRecord('YOUR_TABLE_ID', {
      name: body.name,
      email: body.email
    });
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
\`\`\`

### Step 4: Set Environment Variable

Add to \`.env.local\`:

\`\`\`env
PIPILOT_API_KEY=sk_live_your_actual_key_here
\`\`\`

### Step 5: Deploy!

\`\`\`bash
# Vercel
vercel env add PIPILOT_API_KEY
vercel deploy

# Netlify
netlify env:set PIPILOT_API_KEY sk_live_your_key_here
netlify deploy
\`\`\`

---

## React Example (Client-Side)

\`\`\`typescript
'use client';

import { useState, useEffect } from 'react';

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      // Call your API route (not directly to pipilot.dev to keep API key secret)
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.records);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {users.map((user: any) => (
        <div key={user.id}>
          {user.data_json.name}
        </div>
      ))}
    </div>
  );
}
\`\`\`

---

## Vanilla JavaScript Example

\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <title>Users</title>
</head>
<body>
  <h1>Users</h1>
  <div id="users"></div>

  <script>
    const API_KEY = 'sk_live_your_key_here'; // ⚠️ Don't expose in production!
    const DATABASE_ID = 'YOUR_DATABASE_ID';
    const TABLE_ID = 'YOUR_TABLE_ID';

    async function fetchUsers() {
      const response = await fetch(
        \`https://pipilot.dev/api/v1/databases/\${DATABASE_ID}/tables/\${TABLE_ID}/records\`,
        {
          headers: {
            'Authorization': \`Bearer \${API_KEY}\`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      const usersDiv = document.getElementById('users');

      data.records.forEach(record => {
        const div = document.createElement('div');
        div.textContent = \`\${record.data_json.name} - \${record.data_json.email}\`;
        usersDiv.appendChild(div);
      });
    }

    fetchUsers();
  </script>
</body>
</html>
\`\`\`

---

## Python Example

\`\`\`python
import requests
import os

API_KEY = os.getenv('PIPILOT_API_KEY')
DATABASE_ID = 'YOUR_DATABASE_ID'
TABLE_ID = 'YOUR_TABLE_ID'
BASE_URL = 'https://pipilot.dev/api/v1'

def get_records():
    response = requests.get(
        f'{BASE_URL}/databases/{DATABASE_ID}/tables/{TABLE_ID}/records',
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        }
    )
    return response.json()

def create_record(data):
    response = requests.post(
        f'{BASE_URL}/databases/{DATABASE_ID}/tables/{TABLE_ID}/records',
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        },
        json={'data': data}
    )
    return response.json()

# Usage
records = get_records()
print(records)

new_user = create_record({
    'name': 'John Doe',
    'email': 'john@example.com'
})
print(new_user)
\`\`\`

---

## 🔒 Security Best Practices

### ✅ DO:
- Store API keys in environment variables
- Use server-side API routes to proxy requests
- Rotate keys periodically
- Revoke compromised keys immediately
- Use different keys for dev/staging/production

### ❌ DON'T:
- Commit API keys to Git
- Expose keys in client-side code
- Share keys publicly
- Use the same key across multiple apps

---

## 📊 Rate Limits

- **Default**: 1000 requests per hour
- **Headers**: Check \`X-RateLimit-Remaining\` header
- **On Exceeded**: Returns \`429 Too Many Requests\`

---

## 🆘 Troubleshooting

### Error: "Invalid API key"
- Check key format: Must start with \`sk_live_\`
- Verify key hasn't been revoked
- Ensure you're using the correct database ID

### Error: "Rate limit exceeded"
- Wait 1 hour or contact support to increase limit
- Implement caching to reduce requests

### Error: "Table not found"
- Verify database ID and table ID in URL
- Check table exists in pipilot.dev dashboard

---

## 💡 Tips

1. **Cache responses**: Don't fetch same data repeatedly
2. **Batch operations**: Create multiple records in a loop efficiently
3. **Error handling**: Always handle API errors gracefully
4. **Monitoring**: Track your API usage in the pipilot.dev dashboard

---

## 🎉 You're All Set!

Your external apps can now interact with your pipilot.dev databases! 🚀`,
      fileType: 'markdown',
      type: 'markdown',
      size: 0,
      isDirectory: false

    },
    {
      name: 'USER_AUTHENTICATION_README.md',
      path: 'USER_AUTHENTICATION_README.md',
      content: `# Pipilot Authentication Setup Guide

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
**Built with ❤️ by the pipilot.dev team**`,
      fileType: 'markdown',
      type: 'markdown',
      size: 0,
      isDirectory: false
    },
    // Add .env.local file for local environment variables (Next.js)
    {
      name: '.env.local',
      path: '.env.local',
      content: `# Local environment variables (not committed to git)
# Add your local environment variables here

# Pipilot API Key
# PIPILOT_API_KEY=sk_live_your_api_key_here

# Visual Editor - Enable source mapping for visual editing
# Set to 'true' to enable (adds data-ve-* attributes to JSX elements)
NEXT_PUBLIC_ENABLE_VISUAL_EDITOR=true

# This file is typically used for sensitive information
# and should be added to .gitignore
`,
      fileType: 'env',
      type: 'text',
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
   * Apply the default Next.js template to a new workspace
   */
  static async applyNextJSTemplate(workspaceId: string): Promise<void> {
    try {
      console.log(`🎯 Applying Next.js template to workspace: ${workspaceId}`)
      console.log(`📁 Template files to create: ${this.NEXTJS_TEMPLATE_FILES.length}`)

      // Create all template files
      for (const templateFile of this.NEXTJS_TEMPLATE_FILES) {
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

      console.log(`🎉 Next.js template applied successfully to workspace: ${workspaceId}`)
    } catch (error) {
      console.error(`❌ Error applying Next.js template to workspace ${workspaceId}:`, error)
      throw error
    }
  }

  /**
   * Apply the default Expo React Native template to a new workspace
   */
  static async applyExpoTemplate(workspaceId: string): Promise<void> {
    try {
      console.log(`🎯 Applying Expo template to workspace: ${workspaceId}`)
      console.log(`📁 Template files to create: ${this.EXPO_TEMPLATE_FILES.length}`)

      // Create all template files
      for (const templateFile of this.EXPO_TEMPLATE_FILES) {
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

      console.log(`🎉 Expo template applied successfully to workspace: ${workspaceId}`)
    } catch (error) {
      console.error(`❌ Error applying Expo template to workspace ${workspaceId}:`, error)
      throw error
    }
  }

  /**
   * Create a new workspace with the specified template
   */
  static async createWorkspaceWithTemplate(
    workspaceData: Omit<Workspace, 'id' | 'slug' | 'createdAt' | 'updatedAt'>,
    templateId: string = 'vite-react'
  ) {
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

      // Apply the selected template (local)
      switch (templateId) {
        case 'nextjs':
          await this.applyNextJSTemplate(workspace.id)
          break
        case 'expo':
          await this.applyExpoTemplate(workspace.id)
          break
        case 'vite-react':
        default:
          await this.applyViteReactTemplate(workspace.id)
          break
      }

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
      },
      {
        id: 'nextjs',
        name: 'Next.js + TypeScript + Tailwind CSS',
        description: 'A full-stack React framework with App Router, TypeScript, and Tailwind CSS',
        category: 'Next.js',
        tags: ['nextjs', 'react', 'typescript', 'tailwind', 'ssr'],
        files: this.NEXTJS_TEMPLATE_FILES.length
      },
      {
        id: 'expo',
        name: 'Expo React Native + TypeScript',
        description: 'A cross-platform mobile app with Expo, React Native, and TypeScript',
        category: 'Mobile',
        tags: ['expo', 'react-native', 'mobile', 'typescript', 'ios', 'android'],
        files: this.EXPO_TEMPLATE_FILES.length
      }
    ]
  }
}

// Export the template service
export const templateService = new TemplateService()
