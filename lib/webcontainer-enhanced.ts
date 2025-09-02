import { WebContainer } from '@webcontainer/api'

export enum WebContainerErrorType {
  CREATION_FAILED = 'CREATION_FAILED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  COMMAND_FAILED = 'COMMAND_FAILED',
  FILE_OPERATION_FAILED = 'FILE_OPERATION_FAILED',
  MOUNT_FAILED = 'MOUNT_FAILED',
  TIMEOUT = 'TIMEOUT'
}

export class WebContainerError extends Error {
  constructor(
    public type: WebContainerErrorType,
    message: string,
    public containerId?: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'WebContainerError'
  }
}

export interface WebContainerFile {
  path: string
  content: string
}

export interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
}

export interface FileOperationResult {
  success: boolean
  path: string
  error?: string
}

export interface BatchFileOperationResult {
  success: boolean
  results: FileOperationResult[]
  totalFiles: number
  successCount: number
  errorCount: number
}

export interface WebContainerInfo {
  id: string
  url?: string
  status: 'running' | 'stopped' | 'error'
  createdAt: Date
}

export class EnhancedWebContainer {
  private container: WebContainer | null = null
  private devServerProcess: any = null
  private devServerUrl: string | null = null
  private isReady: boolean = false

  constructor(
    public readonly id: string
  ) {
    console.log(`[WebContainer ${this.id}] Initializing WebContainer instance`)
  }

  /**
   * Initialize the WebContainer instance
   */
  async init(): Promise<void> {
    try {
      if (!this.container) {
        console.log(`[WebContainer ${this.id}] Booting WebContainer...`)
        this.container = await WebContainer.boot()
        this.isReady = true
        console.log(`[WebContainer ${this.id}] WebContainer booted successfully`)
      }
    } catch (error) {
      throw new WebContainerError(
        WebContainerErrorType.CREATION_FAILED,
        `Failed to boot WebContainer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.id,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Sync/update files in the WebContainer filesystem
   */
  async syncFiles(files: WebContainerFile[]): Promise<BatchFileOperationResult> {
    try {
      await this.init()
      
      if (!this.container) {
        throw new Error('WebContainer not initialized')
      }

      console.log(`[WebContainer ${this.id}] Syncing ${files.length} files...`)
      
      const results: FileOperationResult[] = []
      
      // Write files individually to update existing ones
      for (const file of files) {
        try {
          await this.container.fs.writeFile(file.path, file.content)
          results.push({ success: true, path: file.path })
        } catch (error) {
          console.error(`[WebContainer ${this.id}] Failed to sync file ${file.path}:`, error)
          results.push({ 
            success: false, 
            path: file.path, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }

      const successCount = results.filter(r => r.success).length
      const errorCount = results.filter(r => !r.success).length
      
      console.log(`[WebContainer ${this.id}] Synced ${successCount}/${files.length} files successfully`)

      return {
        success: errorCount === 0,
        results,
        totalFiles: files.length,
        successCount,
        errorCount
      }
    } catch (error) {
      throw new WebContainerError(
        WebContainerErrorType.FILE_OPERATION_FAILED,
        `File sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.id,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Mount files to the WebContainer filesystem
   */
  async mountFiles(files: WebContainerFile[]): Promise<BatchFileOperationResult> {
    try {
      await this.init()
      
      if (!this.container) {
        throw new Error('WebContainer not initialized')
      }

      console.log(`[WebContainer ${this.id}] Mounting ${files.length} files...`)
      
      // Convert files to WebContainer file tree format
      const fileTree = this.buildFileTree(files)
      
      await this.container.mount(fileTree)
      
      const results: FileOperationResult[] = files.map(file => ({
        success: true,
        path: file.path
      }))

      console.log(`[WebContainer ${this.id}] Successfully mounted ${files.length} files`)

      return {
        success: true,
        results,
        totalFiles: files.length,
        successCount: files.length,
        errorCount: 0
      }
    } catch (error) {
      throw new WebContainerError(
        WebContainerErrorType.MOUNT_FAILED,
        `Failed to mount files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.id,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Build WebContainer file tree from flat file list
   */
  private buildFileTree(files: WebContainerFile[]): any {
    const tree: any = {}

    for (const file of files) {
      const parts = file.path.split('/')
      let current = tree

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (!current[part]) {
          current[part] = {
            directory: {}
          }
        }
        current = current[part].directory
      }

      const fileName = parts[parts.length - 1]
      current[fileName] = {
        file: {
          contents: file.content
        }
      }
    }

    return tree
  }

  /**
   * Execute a command in the WebContainer
   */
  async executeCommand(
    command: string,
    args: string[] = [],
    options?: {
      onOutput?: (data: string) => void
      onError?: (data: string) => void
    }
  ): Promise<CommandResult> {
    try {
      await this.init()
      
      if (!this.container) {
        throw new Error('WebContainer not initialized')
      }

      console.log(`[WebContainer ${this.id}] Executing command: ${command} ${args.join(' ')}`)

      const process = await this.container.spawn(command, args)
      
      let stdout = ''
      let stderr = ''

      // Handle output streams
      if (process.output) {
        const reader = process.output.getReader()
        const decoder = new TextDecoder()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            if (value) {
              const text = typeof value === 'string' ? value : new TextDecoder().decode(value as Uint8Array)
              stdout += text
              
              if (options?.onOutput) {
                options.onOutput(text)
              }
            }
          }
        } finally {
          reader.releaseLock()
        }
      }

      const exitCode = await process.exit

      return {
        stdout,
        stderr,
        exitCode
      }
    } catch (error) {
      throw new WebContainerError(
        WebContainerErrorType.COMMAND_FAILED,
        `Command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.id,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Install dependencies using pnpm (faster than npm)
   */
  async installDependencies(
    options?: {
      onOutput?: (data: string) => void
      onError?: (data: string) => void
    }
  ): Promise<CommandResult> {
    console.log(`[WebContainer ${this.id}] Installing dependencies with pnpm...`)
    
    try {
      // First, ensure pnpm is available
      await this.executeCommand('pnpm', ['--version'], {
        onOutput: (data) => console.log(`[pnpm version] ${data}`)
      })
    } catch (error) {
      // If pnpm is not available, install it globally
      console.log(`[WebContainer ${this.id}] Installing pnpm globally...`)
      await this.executeCommand('npm', ['install', '-g', 'pnpm'], {
        onOutput: options?.onOutput || ((data: string) => console.log(`[npm] ${data}`)),
        onError: options?.onError || ((data: string) => console.error(`[npm Error] ${data}`))
      })
    }
    
    // Use pnpm for dependency installation
    return await this.executeCommand('pnpm', ['install'], {
      onOutput: options?.onOutput || ((data: string) => console.log(`[pnpm] ${data}`)),
      onError: options?.onError || ((data: string) => console.error(`[pnpm Error] ${data}`))
    })
  }

  /**
   * Start development server
   */
  async startDevServer(options?: {
    command?: string
    args?: string[]
    onOutput?: (data: string) => void
    onError?: (data: string) => void
    onReady?: (url: string, port: number) => void
  }): Promise<{ processId: string; url: string; port: number }> {
    try {
      await this.init()
      
      if (!this.container) {
        throw new Error('WebContainer not initialized')
      }

      // Use pnpm for dev server by default
      const command = options?.command || 'pnpm'
      const args = options?.args || ['run', 'dev']

      console.log(`[WebContainer ${this.id}] Starting dev server: ${command} ${args.join(' ')}`)

      // Start the development server process
      this.devServerProcess = await this.container.spawn(command, args)

      // Handle output
      if (this.devServerProcess.output) {
        const reader = this.devServerProcess.output.getReader()
        const decoder = new TextDecoder()

        // Don't await this - let it run in background
        this.handleDevServerOutput(reader, decoder, options)
      }

      // Wait for server to be ready
      const { url, port } = await this.waitForServerReady()

      return {
        processId: 'webcontainer-dev-server',
        url,
        port
      }
    } catch (error) {
      throw new WebContainerError(
        WebContainerErrorType.COMMAND_FAILED,
        `Failed to start dev server: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.id,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Handle dev server output in background
   */
  private async handleDevServerOutput(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    decoder: TextDecoder,
    options?: {
      onOutput?: (data: string) => void
      onError?: (data: string) => void
      onReady?: (url: string, port: number) => void
    }
  ): Promise<void> {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        if (value) {
          const text = typeof value === 'string' ? value : new TextDecoder().decode(value as Uint8Array)
          
          if (options?.onOutput) {
            options.onOutput(text)
          }

          // Check for server ready indicators
          if (text.includes('Local:') || text.includes('localhost:') || text.includes('ready')) {
            console.log(`[WebContainer ${this.id}] Dev server appears to be ready`)
          }
        }
      }
    } catch (error) {
      console.error(`[WebContainer ${this.id}] Error reading dev server output:`, error)
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Wait for development server to be ready
   */
  private async waitForServerReady(timeoutMs: number = 30000): Promise<{ url: string; port: number }> {
    if (!this.container) {
      throw new Error('WebContainer not initialized')
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new WebContainerError(
          WebContainerErrorType.TIMEOUT,
          `Dev server did not become ready within ${timeoutMs}ms`,
          this.id
        ))
      }, timeoutMs)

      // Listen for server-ready event
      this.container!.on('server-ready', (port, url) => {
        clearTimeout(timeout)
        this.devServerUrl = url
        console.log(`[WebContainer ${this.id}] Server ready at ${url}:${port}`)
        resolve({ url, port })
      })
    })
  }

  /**
   * Execute a terminal command interactively
   */
  async executeTerminalCommand(
    command: string,
    options?: {
      onOutput?: (data: string) => void
      onError?: (data: string) => void
    }
  ): Promise<{ output: string; error: string; exitCode: number }> {
    try {
      console.log(`[WebContainer ${this.id}] Terminal: ${command}`)
      
      const result = await this.executeCommand(command, [], {
        onOutput: options?.onOutput,
        onError: options?.onError
      })
      
      return {
        output: result.stdout,
        error: result.stderr,
        exitCode: result.exitCode
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Command failed'
      return {
        output: '',
        error: errorMessage,
        exitCode: 1
      }
    }
  }

  /**
   * Trigger hot reload by sending a signal to the dev server
   */
  async triggerHotReload(): Promise<void> {
    try {
      if (!this.container) {
        throw new Error('WebContainer not initialized')
      }

      console.log(`[WebContainer ${this.id}] Triggering hot reload...`)
      
      // Try to send HMR signal - this works for Vite
      try {
        await this.executeCommand('touch', ['src/main.tsx'], {
          onOutput: (data) => console.log(`[HMR] ${data}`)
        })
      } catch (error) {
        // Fallback: try touching App.tsx
        try {
          await this.executeCommand('touch', ['src/App.tsx'], {
            onOutput: (data) => console.log(`[HMR] ${data}`)
          })
        } catch (fallbackError) {
          console.warn(`[WebContainer ${this.id}] Hot reload trigger failed, changes should still be detected automatically`)
        }
      }
    } catch (error) {
      console.warn(`[WebContainer ${this.id}] Hot reload trigger failed:`, error)
      // Don't throw error - hot reload is a nice-to-have
    }
  }

  /**
   * Get the current dev server URL
   */
  getDevServerUrl(): string | null {
    return this.devServerUrl
  }

  /**
   * Check if WebContainer is ready
   */
  isContainerReady(): boolean {
    return this.isReady && this.container !== null
  }

  /**
   * Get container info
   */
  async getInfo(): Promise<WebContainerInfo> {
    return {
      id: this.id,
      url: this.devServerUrl || undefined,
      status: this.isReady ? 'running' : 'stopped',
      createdAt: new Date()
    }
  }

  /**
   * Terminate the WebContainer (cleanup)
   */
  async terminate(): Promise<void> {
    try {
      if (this.devServerProcess) {
        console.log(`[WebContainer ${this.id}] Terminating dev server process...`)
        this.devServerProcess.kill()
        this.devServerProcess = null
      }

      if (this.container) {
        console.log(`[WebContainer ${this.id}] Cleaning up WebContainer...`)
        // WebContainer doesn't have explicit cleanup in the current API
        // The browser will handle garbage collection
        this.container = null
      }

      this.isReady = false
      this.devServerUrl = null
      
      console.log(`[WebContainer ${this.id}] WebContainer terminated successfully`)
    } catch (error) {
      console.error(`[WebContainer ${this.id}] Error during termination:`, error)
    }
  }
}

/**
 * Check if WebContainer is supported in the current environment
 */
export function isWebContainerSupported(): boolean {
  try {
    // Check for basic requirements
    if (typeof window === 'undefined') return false
    if (!window.Worker) return false
    if (!window.SharedArrayBuffer) return false
    
    // Check for cross-origin isolation
    if (!window.crossOriginIsolated) {
      console.warn('WebContainer requires Cross-Origin Isolation. Please add the required headers to your Next.js config.')
      return false
    }
    
    return true
  } catch (error) {
    console.warn('WebContainer support check failed:', error)
    return false
  }
}

/**
 * Create a new WebContainer instance
 */
export async function createWebContainer(): Promise<EnhancedWebContainer> {
  // Check support first
  if (!isWebContainerSupported()) {
    throw new WebContainerError(
      WebContainerErrorType.CREATION_FAILED,
      'WebContainer is not supported in this environment. Please ensure Cross-Origin Isolation is enabled.',
      undefined,
      undefined
    )
  }

  const id = `webcontainer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const webContainer = new EnhancedWebContainer(id)
  
  try {
    await webContainer.init()
    return webContainer
  } catch (error) {
    throw new WebContainerError(
      WebContainerErrorType.CREATION_FAILED,
      `Failed to create WebContainer: ${error instanceof Error ? error.message : 'Unknown error'}`,
      id,
      error instanceof Error ? error : undefined
    )
  }
}
