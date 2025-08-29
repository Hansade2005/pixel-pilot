export interface ProjectContext {
  framework?: string
  language?: string
  features?: string[]
  complexity?: 'simple' | 'medium' | 'complex'
  buildSystem?: string
  testingFramework?: string
  styling?: string
  bundler?: string
}

export interface FileOperation {
  type: 'create' | 'edit' | 'delete' | 'rename'
  filePath: string
  content?: string
  newPath?: string
  description: string
}

export interface DependencyOperation {
  type: 'add' | 'remove' | 'update'
  name: string
  version?: string
  dependencyType?: 'production' | 'development' | 'peer'
}

export interface BuildOperation {
  type: 'test' | 'build' | 'deploy' | 'lint' | 'format'
  options?: {
    environment?: string
    watch?: boolean
    verbose?: boolean
  }
}

export interface AIOperation {
  type: string
  description: string
  status: 'pending' | 'executing' | 'completed' | 'failed'
  result?: any
  error?: string
  startTime: Date
  endTime?: Date
  duration?: number
}
