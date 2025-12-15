import { Sandbox } from '@e2b/code-interpreter'

export enum SandboxErrorType {
  CREATION_FAILED = 'CREATION_FAILED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  COMMAND_FAILED = 'COMMAND_FAILED',
  FILE_OPERATION_FAILED = 'FILE_OPERATION_FAILED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  TIMEOUT = 'TIMEOUT'
}

export class SandboxError extends Error {
  constructor(
    public type: SandboxErrorType,
    message: string,
    public sandboxId?: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'SandboxError'
  }
}

export interface SandboxFile {
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

export interface SandboxInfo {
  id: string
  url?: string
  status: 'running' | 'stopped' | 'error'
  createdAt: Date
  processId?: string
}

export class EnhancedE2BSandbox {
  constructor(
    public readonly id: string,
    private container: any
  ) {
    console.log(`[${this.id}] Container methods available:`, {
      hasFiles: !!this.container.files,
      hasFilesystem: !!this.container.filesystem,
      hasCommands: !!this.container.commands,
      hasProcess: !!this.container.process,
      hasPty: !!this.container.pty,
      hasEnv: !!this.container.env,
      filesystemMethods: this.container.filesystem ? Object.getOwnPropertyNames(this.container.filesystem) : [],
      filesMethods: this.container.files ? Object.getOwnPropertyNames(this.container.files) : [],
      commandsMethods: this.container.commands ? Object.getOwnPropertyNames(this.container.commands) : [],
      processMethods: this.container.process ? Object.getOwnPropertyNames(this.container.process) : [],
      ptyMethods: this.container.pty ? Object.getOwnPropertyNames(this.container.pty) : [],
      containerMethods: Object.getOwnPropertyNames(this.container),
      containerType: typeof this.container,
      containerConstructor: this.container.constructor?.name
    })
    
    // Additional debugging for E2B v1 API structure
    console.log(`[${this.id}] E2B API structure analysis:`, {
      sandboxId: this.container.sandboxId,
      sandboxDomain: this.container.sandboxDomain,
      envdPort: this.container.envdPort,
      envdApiUrl: this.container.envdApiUrl,
      connectionConfig: this.container.connectionConfig,
      hasGetInfo: typeof this.container.getInfo === 'function',
      hasGetHost: typeof this.container.getHost === 'function',
      hasClose: typeof this.container.close === 'function',
      hasTerminate: typeof this.container.terminate === 'function',
      hasDestroy: typeof this.container.destroy === 'function'
    })
    
    console.log(`[${this.id}] Full container object:`, JSON.stringify(this.container, null, 2))
    
    this.testSandboxCapabilities()
  }

  /**
   * Test and log sandbox capabilities to understand the actual API structure
   */
  private async testSandboxCapabilities(): Promise<void> {
    try {
      console.log(`[${this.id}] Testing sandbox capabilities...`)
      
      // Test getInfo method if available
      if (typeof this.container.getInfo === 'function') {
        try {
          const info = await this.container.getInfo()
          console.log(`[${this.id}] getInfo result:`, info)
        } catch (error) {
          console.log(`[${this.id}] getInfo failed:`, error)
        }
      }
      
      // Test files methods if available
      if (this.container.files) {
        console.log(`[${this.id}] Files object methods:`, Object.getOwnPropertyNames(this.container.files))
        
        // Test if we can list files
        if (typeof this.container.files.list === 'function') {
          try {
            const files = await this.container.files.list('/')
            console.log(`[${this.id}] Root directory listing:`, files)
          } catch (error) {
            console.log(`[${this.id}] File listing failed:`, error)
          }
        }
      }
      
      // Test commands methods if available
      if (this.container.commands) {
        console.log(`[${this.id}] Commands object methods:`, Object.getOwnPropertyNames(this.container.commands))
        
        // Test if we can execute a simple command
        if (typeof this.container.commands.run === 'function') {
          try {
            console.log(`[${this.id}] Testing commands.run with simple echo command...`)
            const testResult = await this.container.commands.run('echo "test"')
            console.log(`[${this.id}] commands.run test result:`, testResult)
          } catch (error) {
            console.log(`[${this.id}] commands.run test failed:`, error)
          }
        }
      }
      
      // Test process methods if available
      if (this.container.process) {
        console.log(`[${this.id}] Process object methods:`, Object.getOwnPropertyNames(this.container.process))
      }
      
      // Test pty methods if available
      if (this.container.pty) {
        console.log(`[${this.id}] Pty object methods:`, Object.getOwnPropertyNames(this.container.pty))
      }
      
      // Test if container has direct methods
      const directMethods = ['run', 'execute', 'exec', 'start']
      for (const method of directMethods) {
        if (typeof this.container[method] === 'function') {
          console.log(`[${this.id}] Container has direct method: ${method}`)
        }
      }
      
      console.log(`[${this.id}] Sandbox capabilities test completed`)
    } catch (error) {
      console.error(`[${this.id}] Error testing sandbox capabilities:`, error)
    }
  }

  /**
   * Enhanced file writing with batch operations
   */
  async writeFiles(files: SandboxFile[]): Promise<BatchFileOperationResult> {
    try {
      console.log(`[${this.id}] Writing ${files.length} files using E2B v1 API...`)
      
      // Debug: Log the actual container structure
      console.log(`[${this.id}] Container structure:`, {
        hasFiles: !!this.container.files,
        hasFilesystem: !!this.container.filesystem,
        hasWrite: typeof this.container.write === 'function',
        hasWriteFile: typeof this.container.writeFile === 'function',
        allProps: Object.getOwnPropertyNames(this.container)
      })
      
      // Use the correct E2B v1 API structure
      const results: FileOperationResult[] = []
      
      for (const file of files) {
        try {
          // Try different possible API methods based on E2B v1 structure
          let writeSuccess = false
          
          if (this.container.files && typeof this.container.files.write === 'function') {
            await this.container.files.write(file.path, file.content)
            writeSuccess = true
          } else if (this.container.files && typeof this.container.files.writeFile === 'function') {
            await this.container.files.writeFile(file.path, file.content)
            writeSuccess = true
          } else if (typeof this.container.write === 'function') {
            await this.container.write(file.path, file.content)
            writeSuccess = true
          } else if (typeof this.container.writeFile === 'function') {
            await this.container.writeFile(file.path, file.content)
            writeSuccess = true
          } else if (this.container.filesystem && typeof this.container.filesystem.write === 'function') {
            await this.container.filesystem.write(file.path, file.content)
            writeSuccess = true
          } else {
            throw new Error('No valid file write method found on container')
          }
          
          results.push({ success: true, path: file.path })
        } catch (error) {
          console.error(`[${this.id}] Failed to write file ${file.path}:`, error)
          results.push({ 
            success: false, 
            path: file.path, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }
      
      const successCount = results.filter(r => r.success).length
      const errorCount = results.filter(r => !r.success).length
      
      return {
        success: errorCount === 0,
        results,
        totalFiles: files.length,
        successCount,
        errorCount
      }
    } catch (error) {
      throw new SandboxError(
        SandboxErrorType.FILE_OPERATION_FAILED,
        `Batch file operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.id,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Execute a command in the sandbox with enhanced error handling
   */
  async executeCommand(
    command: string, 
    options?: { 
      workingDirectory?: string,
      timeoutMs?: number,
      onStdout?: (data: string) => void,
      onStderr?: (data: string) => void,
      envVars?: Record<string, string>
    }
  ): Promise<CommandResult> {
    try {
      console.log(`[${this.id}] Executing command: ${command}`)
      
      // Prepare the full command with working directory
      const fullCommand = options?.workingDirectory 
        ? `cd ${options.workingDirectory} && ${command}` 
        : command
      
      // Prepare options for the E2B API
      const execOptions: any = {
        onStdout: options?.onStdout || ((data: string) => console.log(`[${this.id}] ${data}`)),
        onStderr: options?.onStderr || ((data: string) => console.error(`[${this.id}] ${data}`)),
        timeoutMs: options?.timeoutMs || 300000, // Default 5 minutes
      }
      
      // Add environment variables if provided
      if (options?.envVars) {
        execOptions.envs = options.envVars
      }
      
      let result: any
      
      // Try different possible API methods based on E2B v1 structure
      if (this.container.commands && typeof this.container.commands.run === 'function') {
        console.log(`[${this.id}] Using commands.run with @e2b/code-interpreter API`)
        result = await this.container.commands.run(fullCommand, execOptions)
      } else if (this.container.process && typeof this.container.process.run === 'function') {
        console.log(`[${this.id}] Using process.run with @e2b/code-interpreter API`)
        result = await this.container.process.run(fullCommand, execOptions)
      } else if (typeof this.container.run === 'function') {
        console.log(`[${this.id}] Using direct container.run method`)
        result = await this.container.run(fullCommand, execOptions)
      } else {
        throw new Error('No valid command execution method found on container')
      }
      
      // Log the result for debugging
      console.log(`[${this.id}] commands.run result:`, {
        exitCode: result.exitCode,
        stdout: result.stdout?.substring(0, 100) + (result.stdout?.length > 100 ? '...' : ''),
        stderr: result.stderr?.substring(0, 100) + (result.stderr?.length > 100 ? '...' : ''),
        error: result.error
      })
      
      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode || 0
      }
    } catch (error) {
      throw new SandboxError(
        SandboxErrorType.COMMAND_FAILED,
        `Command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.id,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Start development server with enhanced monitoring using npm and streaming support
   */
  async startDevServer(options?: {
    command?: string
    workingDirectory?: string
    port?: number
    timeoutMs?: number
    envVars?: Record<string, string>
    onStdout?: (data: string) => void
    onStderr?: (data: string) => void
  }): Promise<{ processId: string; url: string }> {
    // Default to npm for development server
    let command = options?.command || 'npm run dev'
    const workingDir = options?.workingDirectory || '/project'
    const port = options?.port || 3000
    const timeout = options?.timeoutMs || 30000
    const onStdout = options?.onStdout || ((data: string) => console.log(`[Dev Server] ${data}`))
    const onStderr = options?.onStderr || ((data: string) => console.error(`[Dev Server Error] ${data}`))

    // Modify command to include port for Vite preview
    if (command.includes('npm run preview') || command.includes('vite preview')) {
      command = command.replace('vite preview', `vite preview --port ${port}`)
    }

    try {
      // Start the development server using @e2b/code-interpreter API
      let process: any
      
      const fullCommand = `cd ${workingDir} && ${command}`
      
      // Prepare options with environment variables
      const processOptions: any = {
        onStdout: (data: string) => {
          onStdout(data)
          // Look for server ready indicators
          if (data.includes('ready') || data.includes('started') || data.includes(`localhost:${port}`)) {
            console.log(`[Dev Server ${this.id}] Server appears to be ready`)
          }
        },
        onStderr: (data: string) => {
          onStderr(data)
        }
      }
      
      // Add environment variables if provided
      if (options?.envVars) {
        processOptions.envs = { ...options.envVars }
      } else {
        processOptions.envs = {}
      }
      
      // Always set PORT environment variable for server commands
      processOptions.envs.PORT = port.toString()
      
      // For dev servers, always use background execution since they run indefinitely
      if (this.container.commands && typeof this.container.commands.run === 'function') {
        console.log(`[Dev Server ${this.id}] Using commands.run for background dev server execution`)
        processOptions.background = true
        process = await this.container.commands.run(fullCommand, processOptions)
      } else if (this.container.commands && typeof this.container.commands.start === 'function') {
        // Fallback to commands.start if run not available
        console.log(`[Dev Server ${this.id}] Using commands.start with @e2b/code-interpreter API`)
        process = await this.container.commands.start(fullCommand, processOptions)
      } else if (this.container.process && typeof this.container.process.start === 'function') {
        // Fallback to process.start if available
        console.log(`[Dev Server ${this.id}] Using process.start with @e2b/code-interpreter API`)
        process = await this.container.process.start(fullCommand, processOptions)
      } else {
        throw new Error('No valid process start method found on container')
      }

      // Wait for server to be ready with smarter detection
      await this.waitForServerReady(port, timeout, options?.envVars)

      // Try different methods to get the host URL for E2B v1
      let url: string
      try {
        if (typeof this.container.getHost === 'function') {
          url = `https://${this.container.getHost(port)}`
        } else if (typeof this.container.sandboxDomain === 'string') {
          url = `https://${this.container.sandboxDomain}`
        } else if (this.container.connectionConfig && this.container.connectionConfig.host) {
          url = `https://${this.container.connectionConfig.host}`
        } else {
          // Fallback to default E2B v1 URL structure
          url = `https://${this.id}.${process.env.E2B_DOMAIN || 'e2b.dev'}`
        }
      } catch (urlError) {
        console.warn(`[${this.id}] Failed to construct URL, using fallback:`, urlError)
        url = `https://${this.id}.e2b.dev`
      }
      
      return {
        processId: process.pid || 'unknown',
        url
      }
    } catch (error) {
      throw new SandboxError(
        SandboxErrorType.COMMAND_FAILED,
        `Failed to start dev server: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.id,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Smart server readiness detection
   */
  private async waitForServerReady(port: number, timeoutMs: number, envVars?: Record<string, string>): Promise<void> {
    const startTime = Date.now()
    const maxAttempts = Math.floor(timeoutMs / 1000) // Check every second
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Try to check if port is listening - use multiple methods
        const curlResult = await this.executeCommand(
          `curl -s --max-time 5 http://localhost:${port} | head -c 100 || echo "NOT_READY"`,
          { timeoutMs: 10000, envVars }
        )

        // Also check if the port is actually listening
        const netstatResult = await this.executeCommand(
          `netstat -tln | grep :${port} || echo "NOT_LISTENING"`,
          { timeoutMs: 5000, envVars }
        )

        // Check if Vite is running by looking for the process
        const viteCheck = await this.executeCommand(
          `ps aux | grep -v grep | grep "vite" || echo "NO_VITE"`,
          { timeoutMs: 5000, envVars }
        )

        const isReady = (!curlResult.stdout.includes('NOT_READY') && curlResult.exitCode === 0) ||
                       (netstatResult.stdout.includes(`:${port}`) && !netstatResult.stdout.includes('NOT_LISTENING')) ||
                       (!viteCheck.stdout.includes('NO_VITE'))

        if (isReady) {
          console.log(`[${this.id}] Server ready on port ${port}`)
          return
        }
      } catch (error) {
        // Ignore curl errors, server might not be ready yet
      }

      // Check if we've exceeded timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new SandboxError(
          SandboxErrorType.TIMEOUT,
          `Server did not become ready within ${timeoutMs}ms`,
          this.id
        )
      }

      // Wait 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  /**
   * Check if sandbox is still responsive and healthy
   */
  async checkHealth(envVars?: Record<string, string>): Promise<boolean> {
    try {
      // Try a simple command to check responsiveness
      const result = await this.executeCommand('echo "health_check"', {
        timeoutMs: 10000, // 10 seconds max for health check
        envVars // Pass environment variables
      })
      return result.exitCode === 0 && result.stdout.includes('health_check')
    } catch (error) {
      console.warn(`[${this.id}] Health check failed:`, error)
      return false
    }
  }

  /**
   * Get sandbox information and status
   */
  async getInfo(): Promise<any> {
    try {
      if (this.container && typeof this.container.getInfo === 'function') {
        return await this.container.getInfo()
      }
      return { sandboxId: this.id, status: 'unknown' }
    } catch (error) {
      console.warn(`[${this.id}] Failed to get sandbox info:`, error)
      return { sandboxId: this.id, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Keep sandbox alive
   */
  async keepAlive(envVars?: Record<string, string>): Promise<void> {
    try {
      // Send a simple command to keep the sandbox active
      await this.executeCommand('echo "keepalive"', { timeoutMs: 5000, envVars })
    } catch (error) {
      console.warn(`[${this.id}] Keep-alive failed:`, error)
    }
  }

  /**
   * Robust dependency installation with multiple fallback strategies and streaming support
   */
  async installDependenciesRobust(
    workingDirectory: string = '/project', 
    options?: { 
      timeoutMs?: number, 
      envVars?: Record<string, string>,
      onStdout?: (data: string) => void,
      onStderr?: (data: string) => void,
      packageManager?: string
    }
  ): Promise<CommandResult> {
    const timeoutMs = options?.timeoutMs || 0 // Default to 0 (no timeout) for dependency installation
    const envVars = options?.envVars || {} // Get environment variables
    const onStdout = options?.onStdout || ((data: string) => console.log(`[Install] ${data}`))
    const onStderr = options?.onStderr || ((data: string) => console.warn(`[Install Error] ${data}`))
    const packageManager = options?.packageManager || 'pnpm' // Default to pnpm but allow override
    
    console.log(`[${this.id}] Starting robust dependency installation with ${packageManager}, timeout: ${timeoutMs === 0 ? 'disabled' : timeoutMs + 'ms'}...`)
    
    // Strategy 1: Try packageManager install with no timeout
    try {
      console.log(`[${this.id}] Strategy 1: Attempting ${packageManager} install...`)
      const installCommand = packageManager === 'npm' ? `${packageManager} install --legacy-peer-deps` : `${packageManager} install`
      const result = await this.executeCommand(installCommand, {
        workingDirectory,
        timeoutMs: 0, // Disable timeout for dependency installation
        onStdout,
        onStderr,
        envVars // Pass environment variables
      })
      
      if (result.exitCode === 0) {
        console.log(`[${this.id}] Strategy 1 successful: ${packageManager} install completed`)
        return result
      }
    } catch (error) {
      console.warn(`[${this.id}] Strategy 1 failed:`, error)
    }

    // Strategy 2: Try packageManager install with production flag (faster)
    try {
      console.log(`[${this.id}] Strategy 2: Attempting ${packageManager} install without dev dependencies...`)
      const productionFlag = packageManager === 'npm' ? '--omit=dev' : '--production'
      const installCommand = `${packageManager} install ${productionFlag} --legacy-peer-deps`
      const result = await this.executeCommand(installCommand, {
        workingDirectory,
        timeoutMs: 0, // Disable timeout for production install
        onStdout,
        onStderr,
        envVars // Pass environment variables
      })
      
      if (result.exitCode === 0) {
        console.log(`[${this.id}] Strategy 2 successful: ${packageManager} install without dev dependencies completed`)
        return result
      }
    } catch (error) {
      console.warn(`[${this.id}] Strategy 2 failed:`, error)
    }

    // Strategy 3: Try packageManager install with frozen lockfile (clean install, faster)
    try {
      console.log(`[${this.id}] Strategy 3: Attempting ${packageManager} install with lockfile...`)
      const lockfileFlag = packageManager === 'pnpm' ? '--frozen-lockfile' : packageManager === 'yarn' ? '--frozen-lockfile' : '--package-lock-only'
      const installCommand = `${packageManager} install ${lockfileFlag}`
      const result = await this.executeCommand(installCommand, {
        workingDirectory,
        timeoutMs: 0, // Disable timeout for frozen lockfile install
        onStdout,
        onStderr,
        envVars // Pass environment variables
      })
      
      if (result.exitCode === 0) {
        console.log(`[${this.id}] Strategy 3 successful: ${packageManager} install with lockfile completed`)
        return result
      }
    } catch (error) {
      console.warn(`[${this.id}] Strategy 3 failed:`, error)
    }

    // Strategy 4: Try installing only essential dependencies
    try {
      console.log(`[${this.id}] Strategy 4: Attempting minimal dependency installation...`)
      const result = await this.executeCommand(`${packageManager} add react react-dom vite @vitejs/plugin-react typescript`, {
        workingDirectory,
        timeoutMs: 0, // Disable timeout for minimal install
        onStdout,
        onStderr,
        envVars // Pass environment variables
      })
      
      if (result.exitCode === 0) {
        console.log(`[${this.id}] Strategy 4 successful: minimal dependencies installed`)
        return result
      }
    } catch (error) {
      console.warn(`[${this.id}] Strategy 4 failed:`, error)
    }

    // Strategy 5: Fallback to yarn install (if original packageManager failed)
    if (packageManager !== 'yarn') {
      try {
        console.log(`[${this.id}] Strategy 5: Fallback to yarn install...`)
        const result = await this.executeCommand('yarn install', {
          workingDirectory,
          timeoutMs: 0, // Disable timeout for yarn install
          onStdout,
          onStderr,
          envVars // Pass environment variables
        })
        
        if (result.exitCode === 0) {
          console.log(`[${this.id}] Strategy 5 successful: yarn install completed`)
          return result
        }
      } catch (error) {
        console.warn(`[${this.id}] Strategy 5 failed:`, error)
      }
    }

    // Strategy 6: Fallback to yarn install with frozen lockfile
    if (packageManager !== 'yarn') {
      try {
        console.log(`[${this.id}] Strategy 6: Fallback to yarn install with frozen lockfile...`)
        const result = await this.executeCommand('yarn install --frozen-lockfile', {
          workingDirectory,
          timeoutMs: 0, // Disable timeout for yarn frozen install
          onStdout,
          onStderr,
          envVars // Pass environment variables
        })
        
        if (result.exitCode === 0) {
          console.log(`[${this.id}] Strategy 6 successful: yarn install with frozen lockfile completed`)
          return result
        }
      } catch (error) {
        console.warn(`[${this.id}] Strategy 6 failed:`, error)
      }
    }

    // Strategy 7: Fallback to yarn add essential dependencies
    if (packageManager !== 'yarn') {
      try {
        console.log(`[${this.id}] Strategy 7: Fallback to yarn add essential dependencies...`)
        const result = await this.executeCommand('yarn add react react-dom vite @vitejs/plugin-react typescript', {
          workingDirectory,
          timeoutMs: 0, // Disable timeout for yarn add
          onStdout,
          onStderr,
          envVars // Pass environment variables
        })
        
        if (result.exitCode === 0) {
          console.log(`[${this.id}] Strategy 7 successful: yarn add essential dependencies completed`)
          return result
        }
      } catch (error) {
        console.warn(`[${this.id}] Strategy 7 failed:`, error)
      }
    }

    // All strategies failed
    console.error(`[${this.id}] All dependency installation strategies failed (including yarn fallback)`)
    
    // Try to read npm debug log if available
    try {
      console.log(`[${this.id}] Attempting to read npm debug log...`)
      const debugLogPath = '/home/user/.npm/_logs/'
      
      // List log files
      const listResult = await this.executeCommand(`ls -la ${debugLogPath}`, {
        workingDirectory,
        timeoutMs: 5000,
        onStdout: (data) => console.log(`[Log List] ${data}`),
        onStderr: (data) => console.warn(`[Log List Error] ${data}`),
        envVars
      })
      
      if (listResult.exitCode === 0) {
        // Find the most recent debug log
        const logFiles = listResult.stdout.split('\n')
          .filter(line => line.includes('debug-0.log'))
          .map(line => line.split(/\s+/).pop())
          .filter(Boolean)
          .sort()
          .reverse()
        
        if (logFiles.length > 0) {
          const latestLog = logFiles[0]
          const fullLogPath = `${debugLogPath}${latestLog}`
          console.log(`[${this.id}] Reading latest npm debug log: ${fullLogPath}`)
          
          // Read the log file content using the same method as preview/generate_report
          const logContent = await this.container.files.read(fullLogPath)
          
          // Stream log content to console in chunks
          const lines = logContent.split('\n')
          console.log(`[${this.id}] === NPM DEBUG LOG CONTENT (Last 50 lines) ===`)
          const lastLines = lines.slice(-50)
          for (let i = 0; i < lastLines.length; i++) {
            console.log(`[${this.id}] LOG[${i + lines.length - 50}]: ${lastLines[i]}`)
          }
          console.log(`[${this.id}] === END NPM DEBUG LOG ===`)
          
          // Also send to onStderr callback if provided
          if (options?.onStderr) {
            options.onStderr(`NPM DEBUG LOG:\n${lastLines.join('\n')}`)
          }
        }
      }
    } catch (logError) {
      console.warn(`[${this.id}] Failed to read npm debug log:`, logError)
    }
    
    throw new Error('All dependency installation strategies failed')
  }

  /**
   * Install ALL dependencies from project package.json (always install, ignore template comparison)
   * This ensures a clean slate for each preview by installing everything fresh
   */
  async installAdditionalDependencies(
    projectPackageJson: any,
    workingDirectory: string = '/project',
    options?: {
      timeoutMs?: number,
      envVars?: Record<string, string>,
      onStdout?: (data: string) => void,
      onStderr?: (data: string) => void,
      packageManager?: string
    }
  ): Promise<CommandResult | null> {
    const timeoutMs = options?.timeoutMs || 0
    const envVars = options?.envVars || {}
    const onStdout = options?.onStdout || ((data: string) => console.log(`[Add] ${data}`))
    const onStderr = options?.onStderr || ((data: string) => console.warn(`[Add Error] ${data}`))
    const packageManager = options?.packageManager || 'pnpm'

    console.log(`[${this.id}] Installing ALL project dependencies with ${packageManager} (fresh install)...`)

    try {
      // Get ALL dependencies from project package.json
      const projectDeps = projectPackageJson.dependencies || {}
      const projectDevDeps = projectPackageJson.devDependencies || {}

      // Collect ALL dependencies to install (ignore template comparison)
      const allDeps: string[] = []
      const allDevDeps: string[] = []

      // Add all regular dependencies
      for (const [dep, version] of Object.entries(projectDeps)) {
        allDeps.push(`${dep}@${version}`)
      }

      // Add all dev dependencies
      for (const [dep, version] of Object.entries(projectDevDeps)) {
        allDevDeps.push(`${dep}@${version}`)
      }

      // If no dependencies at all, return null
      if (allDeps.length === 0 && allDevDeps.length === 0) {
        console.log(`[${this.id}] No dependencies found in project package.json`)
        return null
      }

      console.log(`[${this.id}] Installing ${allDeps.length} dependencies and ${allDevDeps.length} dev dependencies`)

      // Install ALL dependencies in batches to avoid command length limits
      const allDepsToInstall = [...allDeps, ...allDevDeps]
      const batchSize = 10

      for (let i = 0; i < allDepsToInstall.length; i += batchSize) {
        const batch = allDepsToInstall.slice(i, i + batchSize)
        const isDev = i >= allDeps.length // First batches are regular deps, rest are dev deps

        console.log(`[${this.id}] Installing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allDepsToInstall.length / batchSize)}: ${batch.join(', ')}`)

        const installCommand = isDev ? `${packageManager} add -D ${batch.join(' ')}` : `${packageManager} add ${batch.join(' ')}`

        const result = await this.executeCommand(installCommand, {
          workingDirectory,
          timeoutMs,
          onStdout,
          onStderr,
          envVars
        })

        if (result.exitCode !== 0) {
          console.error(`[${this.id}] Failed to install batch: ${batch.join(', ')}`)
          throw new Error(`Failed to install dependencies: ${batch.join(', ')}`)
        }

        console.log(`[${this.id}] Successfully installed batch: ${batch.join(', ')}`)
      }

      console.log(`[${this.id}] All project dependencies installed successfully`)
      return {
        stdout: 'All project dependencies installed successfully',
        stderr: '',
        exitCode: 0
      }

    } catch (error) {
      console.error(`[${this.id}] Error installing dependencies:`, error)
      throw error
    }
  }

  /**
   * Enhanced cleanup
   */
  async terminate(): Promise<void> {
    try {
      if (this.container && typeof this.container.close === 'function') {
        await this.container.close()
        console.log(`[${this.id}] Sandbox terminated successfully`)
      } else if (this.container && typeof this.container.terminate === 'function') {
        await this.container.terminate()
        console.log(`[${this.id}] Sandbox terminated successfully using terminate method`)
      } else if (this.container && typeof this.container.destroy === 'function') {
        await this.container.destroy()
        console.log(`[${this.id}] Sandbox terminated successfully using destroy method`)
      } else {
        console.warn(`[${this.id}] Container has no close/terminate/destroy method, skipping cleanup`)
      }
    } catch (error) {
      console.error(`[${this.id}] Termination error:`, error)
      // Don't throw error on termination failure, just log it
      console.warn(`[${this.id}] Failed to terminate sandbox gracefully, but continuing...`)
    }
  }

  /**
   * Get native E2B instance for advanced operations
   */
  getNativeInstance(): any {
    return this.container
  }
}

/**
 * Enhanced E2B sandbox creation with better error handling
 */
export async function createEnhancedSandbox(config?: {
  template?: string
  timeoutMs?: number
  env?: Record<string, string>
}): Promise<EnhancedE2BSandbox> {
  try {
    console.log('Creating E2B sandbox with config:', config)
    
    // Use the correct @e2b/code-interpreter API
    let sandbox
    try {
      // Create sandbox using @e2b/code-interpreter API
      sandbox = await Sandbox.create(
        config?.template || 'pipilot',
        {
          apiKey: process.env.E2B_API_KEY,
          timeoutMs: config?.timeoutMs,
          envs: config?.env,
        }
      )
      console.log('Sandbox creation successful with @e2b/code-interpreter')
    } catch (error) {
      console.error('Sandbox creation failed:', error)
      throw error
    }

    if (!sandbox) {
      throw new Error('Sandbox creation returned null/undefined')
    }

    console.log('Sandbox created successfully:', {
      id: sandbox.sandboxId,
      availableMethods: Object.getOwnPropertyNames(sandbox)
    })

    return new EnhancedE2BSandbox(sandbox.sandboxId, sandbox)
  } catch (error) {
    console.error('Failed to create E2B sandbox:', error)
    throw new SandboxError(
      SandboxErrorType.CREATION_FAILED,
      `Failed to create E2B sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      error instanceof Error ? error : undefined
    )
  }
}

/**
 * Reconnect to existing sandbox
 */
export async function reconnectToSandbox(sandboxId: string): Promise<EnhancedE2BSandbox> {
  try {
    const sandbox = await Sandbox.connect(sandboxId, {
      apiKey: process.env.E2B_API_KEY,
    })

    return new EnhancedE2BSandbox(sandboxId, sandbox)
  } catch (error) {
    throw new SandboxError(
      SandboxErrorType.CONNECTION_FAILED,
      `Failed to reconnect to sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sandboxId,
      error instanceof Error ? error : undefined
    )
  }
}