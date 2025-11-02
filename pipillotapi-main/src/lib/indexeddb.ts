// Comprehensive IndexedDB manager for workspace, file, template, and deployment management
// Auth system remains separate and untouched

// Core interfaces
interface Workspace {
  id: string
  name: string
  description?: string
  slug: string
  userId: string
  isPublic: boolean
  isTemplate: boolean
  lastActivity: string
  // Deployment tracking
  githubRepoUrl?: string
  githubRepoName?: string
  vercelProjectId?: string
  vercelDeploymentUrl?: string
  netlifySiteId?: string
  netlifyDeploymentUrl?: string
  deploymentStatus: 'not_deployed' | 'in_progress' | 'deployed' | 'failed'
  createdAt: string
  updatedAt: string
}

interface File {
  id: string
  workspaceId: string
  name: string
  path: string
  content: string
  fileType: string
  type: string // Alias for fileType
  folderId?: string
  size: number
  isDirectory: boolean
  createdAt: string
  updatedAt: string
}

interface Folder {
  id: string
  workspaceId: string
  name: string
  path: string
  parentFolderId?: string
  createdAt: string
  updatedAt: string
}

interface ChatSession {
  id: string
  workspaceId?: string
  userId: string
  title: string
  isActive: boolean
  lastMessageAt: string
  messageCount?: number
  endedAt?: string
  createdAt: string
  updatedAt: string
}

interface Message {
  id: string
  chatSessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata: Record<string, any>
  tokensUsed: number
  createdAt: string
}

interface Deployment {
  id: string
  workspaceId: string
  url: string
  status: 'ready' | 'building' | 'error' | 'cancelled'
  createdAt: string
  commitSha?: string
  commitMessage?: string
  branch?: string
  environment: string
  externalId?: string
  provider: 'vercel' | 'netlify' | 'github'
}

interface EnvironmentVariable {
  id: string
  workspaceId: string
  key: string
  value: string
  environment: string
  isSecret: boolean
  createdAt: string
  updatedAt: string
}

interface Template {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  files: File[]
  isOfficial: boolean
  createdAt: string
  updatedAt: string
}

class IndexedDBManager {
  private dbName = 'AIAppBuilderDB'
  private version = 2
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create workspaces store
        if (!db.objectStoreNames.contains('workspaces')) {
          const workspaceStore = db.createObjectStore('workspaces', { keyPath: 'id' })
          workspaceStore.createIndex('userId', 'userId', { unique: false })
          workspaceStore.createIndex('slug', 'slug', { unique: true })
          workspaceStore.createIndex('isTemplate', 'isTemplate', { unique: false })
          workspaceStore.createIndex('lastActivity', 'lastActivity', { unique: false })
        }

        // Create files store
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' })
          fileStore.createIndex('workspaceId', 'workspaceId', { unique: false })
          fileStore.createIndex('path', 'path', { unique: false })
          fileStore.createIndex('folderId', 'folderId', { unique: false })
          fileStore.createIndex('workspacePath', ['workspaceId', 'path'], { unique: true })
        }

        // Create folders store
        if (!db.objectStoreNames.contains('folders')) {
          const folderStore = db.createObjectStore('folders', { keyPath: 'id' })
          folderStore.createIndex('workspaceId', 'workspaceId', { unique: false })
          folderStore.createIndex('path', 'path', { unique: false })
          folderStore.createIndex('parentFolderId', 'parentFolderId', { unique: false })
          folderStore.createIndex('workspacePath', ['workspaceId', 'path'], { unique: true })
        }

        // Create chat sessions store
        if (!db.objectStoreNames.contains('chatSessions')) {
          const chatSessionStore = db.createObjectStore('chatSessions', { keyPath: 'id' })
          chatSessionStore.createIndex('userId', 'userId', { unique: false })
          chatSessionStore.createIndex('workspaceId', 'workspaceId', { unique: false })
          chatSessionStore.createIndex('isActive', 'isActive', { unique: false })
          chatSessionStore.createIndex('lastMessageAt', 'lastMessageAt', { unique: false })
        }

        // Create messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' })
          messageStore.createIndex('chatSessionId', 'chatSessionId', { unique: false })
          messageStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        // Create deployments store
        if (!db.objectStoreNames.contains('deployments')) {
          const deploymentStore = db.createObjectStore('deployments', { keyPath: 'id' })
          deploymentStore.createIndex('workspaceId', 'workspaceId', { unique: false })
          deploymentStore.createIndex('createdAt', 'createdAt', { unique: false })
          deploymentStore.createIndex('status', 'status', { unique: false })
        }

        // Create environment variables store
        if (!db.objectStoreNames.contains('environmentVariables')) {
          const envStore = db.createObjectStore('environmentVariables', { keyPath: 'id' })
          envStore.createIndex('workspaceId', 'workspaceId', { unique: false })
          envStore.createIndex('key_env', ['key', 'environment'], { unique: false })
        }

        // Create templates store
        if (!db.objectStoreNames.contains('templates')) {
          const templateStore = db.createObjectStore('templates', { keyPath: 'id' })
          templateStore.createIndex('category', 'category', { unique: false })
          templateStore.createIndex('isOfficial', 'isOfficial', { unique: false })
          templateStore.createIndex('tags', 'tags', { unique: false })
        }

        // Create template files store
        if (!db.objectStoreNames.contains('templateFiles')) {
          const templateFileStore = db.createObjectStore('templateFiles', { keyPath: 'id' })
          templateFileStore.createIndex('templateId', 'templateId', { unique: false })
          templateFileStore.createIndex('path', 'path', { unique: false })
        }
      }
    })
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  // Workspace operations
  async createWorkspace(workspace: Omit<Workspace, 'id' | 'slug' | 'createdAt' | 'updatedAt'>): Promise<Workspace> {
    await this.init()
    
    // Generate unique slug
    let slug = this.generateSlug(workspace.name)
    let counter = 1
    while (await this.getWorkspaceBySlug(slug)) {
      slug = `${this.generateSlug(workspace.name)}-${counter}`
      counter++
    }

    const newWorkspace: Workspace = {
      ...workspace,
      id: this.generateId(),
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['workspaces'], 'readwrite')
      const store = transaction.objectStore('workspaces')
      const request = store.add(newWorkspace)

      request.onsuccess = async () => {
        // Apply default template if this is not a template workspace
        if (!workspace.isTemplate) {
          try {
            const { TemplateService } = await import('./template-service')
            await TemplateService.applyViteReactTemplate(newWorkspace.id)
          } catch (error) {
            console.warn('Failed to apply default template:', error)
            // Don't fail the workspace creation if template application fails
          }
        }
        resolve(newWorkspace)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getWorkspaces(userId?: string): Promise<Workspace[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['workspaces'], 'readonly')
      const store = transaction.objectStore('workspaces')
      
      let request: IDBRequest
      if (userId) {
        const index = store.index('userId')
        request = index.getAll(userId)
      } else {
        request = store.getAll()
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['workspaces'], 'readonly')
      const store = transaction.objectStore('workspaces')
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['workspaces'], 'readonly')
      const store = transaction.objectStore('workspaces')
      const index = store.index('slug')
      const request = index.get(slug)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async updateWorkspace(id: string, updates: Partial<Workspace>): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['workspaces'], 'readwrite')
      const store = transaction.objectStore('workspaces')
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const workspace = getRequest.result
        if (workspace) {
          const updatedWorkspace = { ...workspace, ...updates, updatedAt: new Date().toISOString() }
          const putRequest = store.put(updatedWorkspace)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          reject(new Error('Workspace not found'))
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['workspaces', 'files', 'folders', 'chatSessions', 'deployments', 'environmentVariables'], 'readwrite')
      
      // Delete workspace
      const workspaceStore = transaction.objectStore('workspaces')
      const workspaceRequest = workspaceStore.delete(id)

      // Delete related files
      const fileStore = transaction.objectStore('files')
      const fileIndex = fileStore.index('workspaceId')
      const fileRequest = fileIndex.openCursor(IDBKeyRange.only(id))
      fileRequest.onsuccess = () => {
        const cursor = fileRequest.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }

      // Delete related folders
      const folderStore = transaction.objectStore('folders')
      const folderIndex = folderStore.index('workspaceId')
      const folderRequest = folderIndex.openCursor(IDBKeyRange.only(id))
      folderRequest.onsuccess = () => {
        const cursor = folderRequest.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }

      // Delete related chat sessions
      const chatSessionStore = transaction.objectStore('chatSessions')
      const chatSessionIndex = chatSessionStore.index('workspaceId')
      const chatSessionRequest = chatSessionIndex.openCursor(IDBKeyRange.only(id))
      chatSessionRequest.onsuccess = () => {
        const cursor = chatSessionRequest.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }

      // Delete related deployments
      const deploymentStore = transaction.objectStore('deployments')
      const deploymentIndex = deploymentStore.index('workspaceId')
      const deploymentRequest = deploymentIndex.openCursor(IDBKeyRange.only(id))
      deploymentRequest.onsuccess = () => {
        const cursor = deploymentRequest.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }

      // Delete related environment variables
      const envStore = transaction.objectStore('environmentVariables')
      const envIndex = envStore.index('workspaceId')
      const envRequest = envIndex.openCursor(IDBKeyRange.only(id))
      envRequest.onsuccess = () => {
        const cursor = envRequest.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }

      workspaceRequest.onsuccess = () => resolve()
      workspaceRequest.onerror = () => reject(workspaceRequest.error)
    })
  }

  // File operations
  async createFile(file: Omit<File, 'id' | 'createdAt' | 'updatedAt'>): Promise<File> {
    await this.init()
    const newFile: File = {
      ...file,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite')
      const store = transaction.objectStore('files')
      const request = store.add(newFile)

      request.onsuccess = () => resolve(newFile)
      request.onerror = () => reject(request.error)
    })
  }

  async getFiles(workspaceId: string): Promise<File[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly')
      const store = transaction.objectStore('files')
      const index = store.index('workspaceId')
      const request = index.getAll(workspaceId)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getFile(workspaceId: string, path: string): Promise<File | null> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly')
      const store = transaction.objectStore('files')
      const index = store.index('workspacePath')
      const request = index.get([workspaceId, path])

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async updateFile(workspaceId: string, path: string, updates: Partial<File>): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite')
      const store = transaction.objectStore('files')
      const index = store.index('workspacePath')
      const getRequest = index.get([workspaceId, path])

      getRequest.onsuccess = () => {
        const file = getRequest.result
        if (file) {
          const updatedFile = { ...file, ...updates, updatedAt: new Date().toISOString() }
          const putRequest = store.put(updatedFile)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          reject(new Error('File not found'))
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async deleteFile(workspaceId: string, path: string): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite')
      const store = transaction.objectStore('files')
      // IDBIndex does not have a .delete() method; must use .get() to find the key, then .delete() on the store
      const index = store.index('workspacePath')
      const getRequest = index.get([workspaceId, path])

      getRequest.onsuccess = () => {
        const file = getRequest.result
        if (file && file.id) {
          const deleteRequest = store.delete(file.id)
          deleteRequest.onsuccess = () => resolve()
          deleteRequest.onerror = () => reject(deleteRequest.error)
        } else {
          // File not found, treat as success or error as needed
          resolve()
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  // Folder operations
  async createFolder(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder> {
    await this.init()
    const newFolder: Folder = {
      ...folder,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['folders'], 'readwrite')
      const store = transaction.objectStore('folders')
      const request = store.add(newFolder)

      request.onsuccess = () => resolve(newFolder)
      request.onerror = () => reject(request.error)
    })
  }

  async getFolders(workspaceId: string): Promise<Folder[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['folders'], 'readonly')
      const store = transaction.objectStore('folders')
      const index = store.index('workspaceId')
      const request = index.getAll(workspaceId)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Chat operations
  async createChatSession(chatSession: Omit<ChatSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChatSession> {
    await this.init()
    const newChatSession: ChatSession = {
      ...chatSession,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chatSessions'], 'readwrite')
      const store = transaction.objectStore('chatSessions')
      const request = store.add(newChatSession)

      request.onsuccess = () => resolve(newChatSession)
      request.onerror = () => reject(request.error)
    })
  }

  async getChatSessions(userId: string, workspaceId?: string): Promise<ChatSession[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chatSessions'], 'readonly')
      const store = transaction.objectStore('chatSessions')
      
      let request: IDBRequest
      if (workspaceId) {
        const index = store.index('workspaceId')
        request = index.getAll(workspaceId)
      } else {
        const index = store.index('userId')
        request = index.getAll(userId)
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async createMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    await this.init()
    const newMessage: Message = {
      ...message,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite')
      const store = transaction.objectStore('messages')
      const request = store.add(newMessage)

      request.onsuccess = () => resolve(newMessage)
      request.onerror = () => reject(request.error)
    })
  }

  async getMessages(chatSessionId: string): Promise<Message[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly')
      const store = transaction.objectStore('messages')
      const index = store.index('chatSessionId')
      const request = index.getAll(chatSessionId)

      request.onsuccess = () => resolve(request.result.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ))
      request.onerror = () => reject(request.error)
    })
  }

  // Template operations
  async createTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template> {
    await this.init()
    const newTemplate: Template = {
      ...template,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['templates', 'templateFiles'], 'readwrite')
      const templateStore = transaction.objectStore('templates')
      const templateRequest = templateStore.add(newTemplate)

      // Add template files
      const templateFileStore = transaction.objectStore('templateFiles')
      for (const file of template.files) {
        const { id: _ignoredId, ...restFile } = file
        const templateFile = {
          id: this.generateId(),
          templateId: newTemplate.id,
          ...restFile
        }
        templateFileStore.add(templateFile)
      }

      templateRequest.onsuccess = () => resolve(newTemplate)
      templateRequest.onerror = () => reject(templateRequest.error)
    })
  }

  async getTemplates(category?: string): Promise<Template[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['templates'], 'readonly')
      const store = transaction.objectStore('templates')
      
      let request: IDBRequest
      if (category) {
        const index = store.index('category')
        request = index.getAll(category)
      } else {
        request = store.getAll()
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getTemplateFiles(templateId: string): Promise<File[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['templateFiles'], 'readonly')
      const store = transaction.objectStore('templateFiles')
      const index = store.index('templateId')
      const request = index.getAll(templateId)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Deployment operations (keeping existing functionality)
  async createDeployment(deployment: Omit<Deployment, 'id' | 'createdAt'>): Promise<Deployment> {
    await this.init()
    const newDeployment: Deployment = {
      ...deployment,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['deployments'], 'readwrite')
      const store = transaction.objectStore('deployments')
      const request = store.add(newDeployment)

      request.onsuccess = () => resolve(newDeployment)
      request.onerror = () => reject(request.error)
    })
  }

  async getDeployments(workspaceId?: string): Promise<Deployment[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['deployments'], 'readonly')
      const store = transaction.objectStore('deployments')
      
      let request: IDBRequest
      if (workspaceId) {
        const index = store.index('workspaceId')
        request = index.getAll(workspaceId)
      } else {
        request = store.getAll()
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async updateDeployment(id: string, updates: Partial<Deployment>): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['deployments'], 'readwrite')
      const store = transaction.objectStore('deployments')
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const deployment = getRequest.result
        if (deployment) {
          const updatedDeployment = { ...deployment, ...updates }
          const putRequest = store.put(updatedDeployment)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          reject(new Error('Deployment not found'))
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  // Environment variable operations (keeping existing functionality)
  async createEnvironmentVariable(envVar: Omit<EnvironmentVariable, 'id' | 'createdAt' | 'updatedAt'>): Promise<EnvironmentVariable> {
    await this.init()
    const newEnvVar: EnvironmentVariable = {
      ...envVar,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['environmentVariables'], 'readwrite')
      const store = transaction.objectStore('environmentVariables')
      const request = store.add(newEnvVar)

      request.onsuccess = () => resolve(newEnvVar)
      request.onerror = () => reject(request.error)
    })
  }

  async getEnvironmentVariables(workspaceId?: string): Promise<EnvironmentVariable[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['environmentVariables'], 'readonly')
      const store = transaction.objectStore('environmentVariables')
      
      let request: IDBRequest
      if (workspaceId) {
        const index = store.index('workspaceId')
        request = index.getAll(workspaceId)
      } else {
        request = store.getAll()
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async updateEnvironmentVariable(id: string, updates: Partial<EnvironmentVariable>): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['environmentVariables'], 'readwrite')
      const store = transaction.objectStore('environmentVariables')
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const envVar = getRequest.result
        if (envVar) {
          const updatedEnvVar = { ...envVar, ...updates, updatedAt: new Date().toISOString() }
          const putRequest = store.put(updatedEnvVar)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          reject(new Error('Environment variable not found'))
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async deleteEnvironmentVariable(id: string): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['environmentVariables'], 'readwrite')
      const store = transaction.objectStore('environmentVariables')
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Utility methods
  async clearAll(): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([
        'workspaces', 'files', 'folders', 'chatSessions', 'messages',
        'deployments', 'environmentVariables', 'templates', 'templateFiles'
      ], 'readwrite')
      
      const clearPromises = [
        'workspaces', 'files', 'folders', 'chatSessions', 'messages',
        'deployments', 'environmentVariables', 'templates', 'templateFiles'
      ].map(storeName => {
        return new Promise<void>((res, rej) => {
          const store = transaction.objectStore(storeName)
          const request = store.clear()
          request.onsuccess = () => res()
          request.onerror = () => rej(request.error)
        })
      })

      Promise.all(clearPromises)
        .then(() => resolve())
        .catch(reject)
    })
  }

  async exportData(): Promise<{
    workspaces: Workspace[]
    files: File[]
    folders: Folder[]
    chatSessions: ChatSession[]
    messages: Message[]
    deployments: Deployment[]
    environmentVariables: EnvironmentVariable[]
    templates: Template[]
  }> {
    const [
      workspaces, files, folders, chatSessions, messages,
      deployments, environmentVariables, templates
    ] = await Promise.all([
      this.getWorkspaces(),
      this.getAllFiles(),
      this.getAllFolders(),
      this.getAllChatSessions(),
      this.getAllMessages(),
      this.getDeployments(),
      this.getEnvironmentVariables(),
      this.getTemplates()
    ])

    return {
      workspaces, files, folders, chatSessions, messages,
      deployments, environmentVariables, templates
    }
  }

  async importData(data: {
    workspaces: Workspace[]
    files: File[]
    folders: Folder[]
    chatSessions: ChatSession[]
    messages: Message[]
    deployments: Deployment[]
    environmentVariables: EnvironmentVariable[]
    templates: Template[]
  }): Promise<void> {
    await this.clearAll()
    
    const transaction = this.db!.transaction([
      'workspaces', 'files', 'folders', 'chatSessions', 'messages',
      'deployments', 'environmentVariables', 'templates', 'templateFiles'
    ], 'readwrite')
    
    // Import all data
    const workspaceStore = transaction.objectStore('workspaces')
    for (const workspace of data.workspaces) {
      workspaceStore.add(workspace)
    }

    const fileStore = transaction.objectStore('files')
    for (const file of data.files) {
      fileStore.add(file)
    }

    const folderStore = transaction.objectStore('folders')
    for (const folder of data.folders) {
      folderStore.add(folder)
    }

    const chatSessionStore = transaction.objectStore('chatSessions')
    for (const chatSession of data.chatSessions) {
      chatSessionStore.add(chatSession)
    }

    const messageStore = transaction.objectStore('messages')
    for (const message of data.messages) {
      messageStore.add(message)
    }

    const deploymentStore = transaction.objectStore('deployments')
    for (const deployment of data.deployments) {
      deploymentStore.add(deployment)
    }

    const envStore = transaction.objectStore('environmentVariables')
    for (const envVar of data.environmentVariables) {
      envStore.add(envVar)
    }

    const templateStore = transaction.objectStore('templates')
    for (const template of data.templates) {
      templateStore.add(template)
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // Helper methods for getting all data
  async getAllFiles(): Promise<File[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly')
      const store = transaction.objectStore('files')
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllFolders(): Promise<Folder[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['folders'], 'readonly')
      const store = transaction.objectStore('folders')
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllChatSessions(): Promise<ChatSession[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chatSessions'], 'readonly')
      const store = transaction.objectStore('chatSessions')
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllMessages(): Promise<Message[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly')
      const store = transaction.objectStore('messages')
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Additional helper methods for compatibility
  async getProjects(): Promise<Workspace[]> {
    return this.getWorkspaces()
  }

  async createProject(project: any): Promise<Workspace> {
    const workspaceData = {
      name: project.name,
      description: project.description,
      userId: project.userId || project.user_id,
      isPublic: project.isPublic || project.is_public || false,
      isTemplate: project.isTemplate || project.is_template || false,
      lastActivity: project.lastActivity || project.last_activity || new Date().toISOString(),
      githubRepoUrl: project.githubRepoUrl || project.github_repo_url,
      githubRepoName: project.githubRepoName || project.github_repo_name,
      vercelProjectId: project.vercelProjectId || project.vercel_project_id,
      vercelDeploymentUrl: project.vercelDeploymentUrl || project.vercel_deployment_url,
      netlifySiteId: project.netlifySiteId || project.netlify_site_id,
      netlifyDeploymentUrl: project.netlifyDeploymentUrl || project.netlify_deployment_url,
      deploymentStatus: project.deploymentStatus || project.deployment_status || 'not_deployed'
    }
    return this.createWorkspace(workspaceData)
  }

  async updateProject(id: string, updates: Partial<Workspace>): Promise<void> {
    return this.updateWorkspace(id, updates)
  }

  async deleteProject(id: string): Promise<void> {
    return this.deleteWorkspace(id)
  }
}

// Create and export a singleton instance
export const dbManager = new IndexedDBManager()

// Export types for use in other files
export type { 
  Workspace, File, Folder, ChatSession, Message, 
  Deployment, EnvironmentVariable, Template 
}
