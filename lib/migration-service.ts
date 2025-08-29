// Migration service to transition from Supabase to IndexedDB
// Auth system remains untouched and separate

import { createClient } from '@/lib/supabase/client'
import { dbManager } from './indexeddb'
import type { Workspace, File, Folder, ChatSession, Message, Deployment, EnvironmentVariable, Template } from './indexeddb'

export class MigrationService {
  private supabase = createClient()

  // Migrate all workspace data from Supabase to IndexedDB
  async migrateAllData(userId: string): Promise<{
    workspaces: number
    files: number
    folders: number
    chatSessions: number
    messages: number
    deployments: number
    environmentVariables: number
    templates: number
  }> {
    console.log('Starting migration from Supabase to IndexedDB...')

    try {
      // Migrate workspaces
      const workspaces = await this.migrateWorkspaces(userId)
      console.log(`Migrated ${workspaces.length} workspaces`)

      // Migrate files for each workspace
      let totalFiles = 0
      for (const workspace of workspaces) {
        const files = await this.migrateFiles(workspace.id)
        totalFiles += files.length
      }
      console.log(`Migrated ${totalFiles} files`)

      // Migrate folders for each workspace
      let totalFolders = 0
      for (const workspace of workspaces) {
        const folders = await this.migrateFolders(workspace.id)
        totalFolders += folders.length
      }
      console.log(`Migrated ${totalFolders} folders`)

      // Migrate chat sessions
      const chatSessions = await this.migrateChatSessions(userId)
      console.log(`Migrated ${chatSessions.length} chat sessions`)

      // Migrate messages for each chat session
      let totalMessages = 0
      for (const chatSession of chatSessions) {
        const messages = await this.migrateMessages(chatSession.id)
        totalMessages += messages.length
      }
      console.log(`Migrated ${totalMessages} messages`)

      // Migrate deployments
      const deployments = await this.migrateDeployments()
      console.log(`Migrated ${deployments.length} deployments`)

      // Migrate environment variables
      const environmentVariables = await this.migrateEnvironmentVariables()
      console.log(`Migrated ${environmentVariables.length} environment variables`)

      // Migrate templates
      const templates = await this.migrateTemplates()
      console.log(`Migrated ${templates.length} templates`)

      console.log('Migration completed successfully!')

      return {
        workspaces: workspaces.length,
        files: totalFiles,
        folders: totalFolders,
        chatSessions: chatSessions.length,
        messages: totalMessages,
        deployments: deployments.length,
        environmentVariables: environmentVariables.length,
        templates: templates.length
      }

    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    }
  }

  // Migrate workspaces (projects in Supabase)
  private async migrateWorkspaces(userId: string): Promise<Workspace[]> {
    const { data: projects, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching projects:', error)
      return []
    }

    const workspaces: Workspace[] = []
    for (const project of projects || []) {
      const workspace: Workspace = {
        id: project.id,
        name: project.name,
        description: project.description,
        slug: project.slug,
        userId: project.user_id,
        isPublic: project.is_public || false,
        isTemplate: project.is_template || false,
        lastActivity: project.last_activity || project.created_at,
        githubRepoUrl: project.github_repo_url,
        githubRepoName: project.github_repo_name,
        vercelProjectId: project.vercel_project_id,
        vercelDeploymentUrl: project.vercel_deployment_url,
        netlifySiteId: project.netlify_site_id,
        netlifyDeploymentUrl: project.netlify_deployment_url,
        deploymentStatus: project.deployment_status || 'not_deployed',
        createdAt: project.created_at,
        updatedAt: project.updated_at
      }

      await dbManager.createWorkspace(workspace)
      workspaces.push(workspace)
    }

    return workspaces
  }

  // Migrate files
  private async migrateFiles(workspaceId: string): Promise<File[]> {
    const { data: files, error } = await this.supabase
      .from('files')
      .select('*')
      .eq('project_id', workspaceId)

    if (error) {
      console.error('Error fetching files:', error)
      return []
    }

    const migratedFiles: File[] = []
    for (const file of files || []) {
      const migratedFile: File = {
        id: file.id,
        workspaceId: file.project_id,
        name: file.name,
        path: file.path,
        content: file.content || '',
        fileType: file.file_type || file.type || 'text',
        type: file.type || file.file_type || 'text',
        folderId: file.folder_id,
        size: file.size || 0,
        isDirectory: file.is_directory || false,
        createdAt: file.created_at,
        updatedAt: file.updated_at
      }

      await dbManager.createFile(migratedFile)
      migratedFiles.push(migratedFile)
    }

    return migratedFiles
  }

  // Migrate folders
  private async migrateFolders(workspaceId: string): Promise<Folder[]> {
    const { data: folders, error } = await this.supabase
      .from('folders')
      .select('*')
      .eq('project_id', workspaceId)

    if (error) {
      console.error('Error fetching folders:', error)
      return []
    }

    const migratedFolders: Folder[] = []
    for (const folder of folders || []) {
      const migratedFolder: Folder = {
        id: folder.id,
        workspaceId: folder.project_id,
        name: folder.name,
        path: folder.path,
        parentFolderId: folder.parent_folder_id,
        createdAt: folder.created_at,
        updatedAt: folder.updated_at
      }

      await dbManager.createFolder(migratedFolder)
      migratedFolders.push(migratedFolder)
    }

    return migratedFolders
  }

  // Migrate chat sessions
  private async migrateChatSessions(userId: string): Promise<ChatSession[]> {
    const { data: chatSessions, error } = await this.supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching chat sessions:', error)
      return []
    }

    const migratedChatSessions: ChatSession[] = []
    for (const chatSession of chatSessions || []) {
      const migratedChatSession: ChatSession = {
        id: chatSession.id,
        workspaceId: chatSession.project_id,
        userId: chatSession.user_id,
        title: chatSession.title || 'AI Chat Session',
        isActive: chatSession.is_active || true,
        lastMessageAt: chatSession.last_message_at || chatSession.created_at,
        createdAt: chatSession.created_at,
        updatedAt: chatSession.updated_at
      }

      await dbManager.createChatSession(migratedChatSession)
      migratedChatSessions.push(migratedChatSession)
    }

    return migratedChatSessions
  }

  // Migrate messages
  private async migrateMessages(chatSessionId: string): Promise<Message[]> {
    const { data: messages, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('chat_session_id', chatSessionId)

    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }

    const migratedMessages: Message[] = []
    for (const message of messages || []) {
      const migratedMessage: Message = {
        id: message.id,
        chatSessionId: message.chat_session_id,
        role: message.role,
        content: message.content,
        metadata: message.metadata || {},
        tokensUsed: message.tokens_used || 0,
        createdAt: message.created_at
      }

      await dbManager.createMessage(migratedMessage)
      migratedMessages.push(migratedMessage)
    }

    return migratedMessages
  }

  // Migrate deployments
  private async migrateDeployments(): Promise<Deployment[]> {
    // Note: This would need to be adapted based on your actual deployment table structure
    // For now, we'll create a basic migration
    const deployments: Deployment[] = []
    
    // You can extend this based on your actual deployment data structure
    console.log('Deployment migration placeholder - extend based on your deployment table structure')
    
    return deployments
  }

  // Migrate environment variables
  private async migrateEnvironmentVariables(): Promise<EnvironmentVariable[]> {
    // Note: This would need to be adapted based on your actual environment variables table structure
    // For now, we'll create a basic migration
    const environmentVariables: EnvironmentVariable[] = []
    
    // You can extend this based on your actual environment variables data structure
    console.log('Environment variables migration placeholder - extend based on your env vars table structure')
    
    return environmentVariables
  }

  // Migrate templates
  private async migrateTemplates(): Promise<Template[]> {
    // Create default templates
    const defaultTemplates: Template[] = [
      {
        id: 'vite-react-template',
        name: 'Vite React Template',
        description: 'Modern React application with Vite, TypeScript, and Tailwind CSS',
        category: 'React',
        tags: ['react', 'typescript', 'vite', 'tailwind'],
        files: [
          {
            id: 'package-json',
            workspaceId: 'template',
            name: 'package.json',
            path: 'package.json',
            content: JSON.stringify({
              name: 'vite-react-app',
              private: true,
              version: '0.0.0',
              type: 'module',
              scripts: {
                dev: 'vite',
                build: 'tsc && vite build',
                lint: 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
                preview: 'vite preview'
              },
              dependencies: {
                react: '^18.2.0',
                'react-dom': '^18.2.0'
              },
              devDependencies: {
                '@types/react': '^18.2.43',
                '@types/react-dom': '^18.2.17',
                '@typescript-eslint/eslint-plugin': '^6.14.0',
                '@typescript-eslint/parser': '^6.14.0',
                '@vitejs/plugin-react': '^4.2.1',
                eslint: '^8.55.0',
                'eslint-plugin-react-hooks': '^4.6.0',
                'eslint-plugin-react-refresh': '^0.4.5',
                typescript: '^5.2.2',
                vite: '^5.0.8'
              }
            }, { indent: 2 }),
            fileType: 'json',
            type: 'json',
            size: 0,
            isDirectory: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'vite-config',
            workspaceId: 'template',
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
            isDirectory: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'tsconfig',
            workspaceId: 'template',
            name: 'tsconfig.json',
            path: 'tsconfig.json',
            content: JSON.stringify({
              compilerOptions: {
                target: 'ES2020',
                useDefineForClassFields: true,
                lib: ['ES2020', 'DOM', 'DOM.Iterable'],
                module: 'ESNext',
                skipLibCheck: true,
                moduleResolution: 'bundler',
                allowImportingTsExtensions: true,
                resolveJsonModule: true,
                isolatedModules: true,
                noEmit: true,
                jsx: 'react-jsx',
                strict: true,
                noUnusedLocals: true,
                noUnusedParameters: true,
                noFallthroughCasesInSwitch: true
              },
              include: ['src'],
              references: [{ path: './tsconfig.node.json' }]
            }, { indent: 2 }),
            fileType: 'json',
            type: 'json',
            size: 0,
            isDirectory: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'index-html',
            workspaceId: 'template',
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
            isDirectory: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'main-tsx',
            workspaceId: 'template',
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
            isDirectory: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'app-tsx',
            workspaceId: 'template',
            name: 'App.tsx',
            path: 'src/App.tsx',
            content: `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src="/react.svg" className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App`,
            fileType: 'typescript',
            type: 'typescript',
            size: 0,
            isDirectory: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'app-css',
            workspaceId: 'template',
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
    animation: logo-spin infinite 20s linear;
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
            isDirectory: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'index-css',
            workspaceId: 'template',
            name: 'index.css',
            path: 'src/index.css',
            content: `:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}
a:hover {
  color: #535bf2;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: #646cff;
}
button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

@media (prefers-color-scheme: light) {
  :root {
    color: #213547;
    background-color: #ffffff;
  }
  a:hover {
    color: #747bff;
  }
  button {
    background-color: #f9f9f9;
  }
}`,
            fileType: 'css',
            type: 'css',
            size: 0,
            isDirectory: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'vite-svg',
            workspaceId: 'template',
            name: 'vite.svg',
            path: 'public/vite.svg',
            content: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFEA83"></stop><stop offset="8.333%" stop-color="#FFDD35"></stop><stop offset="100%" stop-color="#FFA800"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.922l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.88-4.114l16.646-57.705c.346-1.207-.07-2.48-1.097-3.079Z"></path></svg>`,
            fileType: 'svg',
            type: 'svg',
            size: 0,
            isDirectory: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'react-svg',
            workspaceId: 'template',
            name: 'react.svg',
            path: 'public/react.svg',
            content: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="35.93" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 228"><path fill="#00D8FF" d="M210.483 73.824a171.49 171.49 0 0 0-8.24-2.597c.465-1.9.893-3.777 1.273-5.621c6.238-30.281 2.16-54.676-10.332-62.708c-12.065-7.7-29.006.329-43.54 19.526a171.23 171.23 0 0 0-6.375 8.05c-18.452-5.098-37.194-8.446-55.904-9.938c-1.621-.133-3.222-.26-4.811-.38c.116-1.098.234-2.194.354-3.287C99.735 3.471 108.873.393 117.31.393c12.575 0 20.323 6.72 22.568 18.442c.198 1.006.29 2.077.354 3.22c.377 6.478.553 13.21.553 20.069c0 6.747-.158 13.378-.5 19.764c-.063 1.089-.152 2.183-.267 3.28c1.609-.12 3.231-.247 4.863-.38c18.887-1.52 37.796-4.914 56.397-10.163a145.788 145.788 0 0 1 6.491-8.207c14.739-19.422 31.946-27.462 44.004-19.764c12.637 8.08 16.777 32.754 10.504 63.025c-.38 1.844-.808 3.721-1.273 5.621a171.49 171.49 0 0 0-8.24 2.597c-19.026 6.15-37.927 15.798-56.263 28.525c18.336 12.727 37.237 22.375 56.263 28.525a171.49 171.49 0 0 0 8.24 2.597c.465 1.9.893 3.777 1.273 5.621c6.273 30.271 2.133 54.945-10.504 63.025c-12.058 7.698-29.265-.342-44.004-19.764a145.788 145.788 0 0 1-6.491-8.207c-18.601-5.249-37.51-8.643-56.397-10.163c-1.632-.133-3.254-.26-4.863-.38c.115-1.097.204-2.191.267-3.28c.342-6.386.5-13.017.5-19.764c0-6.859-.176-13.591-.553-20.069c-.064-1.143-.156-2.214-.354-3.22c-2.245-11.722-9.993-18.442-22.568-18.442c-8.437 0-17.575 3.078-25.297 9.42c-.12 1.093-.238 2.189-.354 3.287c-1.589.12-3.19.247-4.811.38c-18.71 1.492-37.452 4.84-55.904 9.938a171.23 171.23 0 0 0-6.375-8.05c-14.534-19.197-31.475-27.226-43.54-19.526c-12.492 8.032-16.57 32.427-10.332 62.708c.38 1.844.808 3.721 1.273 5.621a171.49 171.49 0 0 0 8.24 2.597c19.026 6.15 37.927 15.798 56.263 28.525C172.556 89.622 191.457 79.974 210.483 73.824zM128.036 163.754c-19.893 0-36.236-16.343-36.236-36.236s16.343-36.236 36.236-36.236s36.236 16.343 36.236 36.236S147.929 163.754 128.036 163.754z"></path></svg>`,
            fileType: 'svg',
            type: 'svg',
            size: 0,
            isDirectory: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        isOfficial: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    const migratedTemplates: Template[] = []
    for (const template of defaultTemplates) {
      await dbManager.createTemplate(template)
      migratedTemplates.push(template)
    }

    return migratedTemplates
  }

  // Check if migration is needed
  async checkMigrationStatus(userId: string): Promise<{
    needsMigration: boolean
    supabaseData: {
      workspaces: number
      files: number
      chatSessions: number
      messages: number
    }
    indexedDBData: {
      workspaces: number
      files: number
      chatSessions: number
      messages: number
    }
  }> {
    // Check Supabase data
    const [supabaseWorkspaces, supabaseFiles, supabaseChatSessions, supabaseMessages] = await Promise.all([
      this.supabase.from('projects').select('id', { count: 'exact' }).eq('user_id', userId),
      this.supabase.from('files').select('id', { count: 'exact' }).eq('user_id', userId),
      this.supabase.from('chat_sessions').select('id', { count: 'exact' }).eq('user_id', userId),
      this.supabase.from('messages').select('id', { count: 'exact' }).eq('user_id', userId)
    ])

    // Check IndexedDB data
    const indexedDBWorkspaces = await dbManager.getWorkspaces(userId)
    const indexedDBFiles = await dbManager.getAllFiles()
    const indexedDBChatSessions = await dbManager.getChatSessions(userId)
    const indexedDBMessages = await dbManager.getAllMessages()

    const supabaseData = {
      workspaces: supabaseWorkspaces.count || 0,
      files: supabaseFiles.count || 0,
      chatSessions: supabaseChatSessions.count || 0,
      messages: supabaseMessages.count || 0
    }

    const indexedDBData = {
      workspaces: indexedDBWorkspaces.length,
      files: indexedDBFiles.length,
      chatSessions: indexedDBChatSessions.length,
      messages: indexedDBMessages.length
    }

    const needsMigration = 
      supabaseData.workspaces > indexedDBData.workspaces ||
      supabaseData.files > indexedDBData.files ||
      supabaseData.chatSessions > indexedDBData.chatSessions ||
      supabaseData.messages > indexedDBData.messages

    return {
      needsMigration,
      supabaseData,
      indexedDBData
    }
  }

  // Clear all IndexedDB data
  async clearIndexedDBData(): Promise<void> {
    await dbManager.clearAll()
    console.log('IndexedDB data cleared')
  }

  // Export IndexedDB data
  async exportIndexedDBData(): Promise<any> {
    return await dbManager.exportData()
  }

  // Import data to IndexedDB
  async importToIndexedDB(data: any): Promise<void> {
    await dbManager.importData(data)
    console.log('Data imported to IndexedDB')
  }
}

// Create and export a singleton instance
export const migrationService = new MigrationService()
