// Dependency Management System for AI Agent
import { createClient } from '../supabase/client'

export interface PackageInfo {
  name: string
  version: string
  type: 'dependency' | 'devDependency' | 'peerDependency'
  description?: string
  category?: 'ui' | 'state' | 'routing' | 'styling' | 'testing' | 'build' | 'utility' | 'other'
}

export interface DependencyOperation {
  type: 'add' | 'remove' | 'update' | 'upgrade'
  packageName: string
  version?: string
  reason: string
  category?: string
  isDev?: boolean
}

export interface DependencyResult {
  success: boolean
  operation: DependencyOperation
  result: {
    packageName: string
    oldVersion?: string
    newVersion: string
    packageJsonUpdated: boolean
  }
  errors: string[]
  warnings: string[]
}

export interface PackageJsonData {
  name: string
  version: string
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  peerDependencies?: Record<string, string>
  scripts: Record<string, string>
  [key: string]: any
}

export class DependencyManager {
  private supabase = createClient()

  /**
   * Add a new dependency to the project
   */
  async addDependency(
    projectId: string,
    operation: DependencyOperation
  ): Promise<DependencyResult> {
    try {
      // Get current package.json
      const packageJson = await this.getPackageJson(projectId)
      if (!packageJson) {
        return {
          success: false,
          operation,
          result: {
            packageName: operation.packageName,
            newVersion: operation.version || 'latest',
            packageJsonUpdated: false
          },
          errors: ['package.json not found'],
          warnings: []
        }
      }

      // Check if package already exists
      const existingVersion = this.getPackageVersion(packageJson, operation.packageName, operation.isDev)
      if (existingVersion && operation.type === 'add') {
        return {
          success: false,
          operation,
          result: {
            packageName: operation.packageName,
            oldVersion: existingVersion,
            newVersion: operation.version || 'latest',
            packageJsonUpdated: false
          },
          errors: [`Package ${operation.packageName} already exists with version ${existingVersion}`],
          warnings: ['Use update operation to change version']
        }
      }

      // Add the package
      const targetVersion = operation.version || 'latest'
      const targetDeps = operation.isDev ? packageJson.devDependencies : packageJson.dependencies
      
      targetDeps[operation.packageName] = targetVersion

      // Update package.json in database
      const success = await this.updatePackageJson(projectId, packageJson)
      if (!success) {
        return {
          success: false,
          operation,
          result: {
            packageName: operation.packageName,
            oldVersion: existingVersion,
            newVersion: targetVersion,
            packageJsonUpdated: false
          },
          errors: ['Failed to update package.json in database'],
          warnings: []
        }
      }

      return {
        success: true,
        operation,
        result: {
          packageName: operation.packageName,
          oldVersion: existingVersion,
          newVersion: targetVersion,
          packageJsonUpdated: true
        },
        errors: [],
        warnings: []
      }
    } catch (error) {
      return {
        success: false,
        operation,
        result: {
          packageName: operation.packageName,
          newVersion: operation.version || 'latest',
          packageJsonUpdated: false
        },
        errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      }
    }
  }

  /**
   * Remove a dependency from the project
   */
  async removeDependency(
    projectId: string,
    operation: DependencyOperation
  ): Promise<DependencyResult> {
    try {
      // Get current package.json
      const packageJson = await this.getPackageJson(projectId)
      if (!packageJson) {
        return {
          success: false,
          operation,
          result: {
            packageName: operation.packageName,
            newVersion: '',
            packageJsonUpdated: false
          },
          errors: ['package.json not found'],
          warnings: []
        }
      }

      // Check if package exists
      const existingVersion = this.getPackageVersion(packageJson, operation.packageName, operation.isDev)
      if (!existingVersion) {
        return {
          success: false,
          operation,
          result: {
            packageName: operation.packageName,
            newVersion: '',
            packageJsonUpdated: false
          },
          errors: [`Package ${operation.packageName} not found`],
          warnings: []
        }
      }

      // Remove the package
      const targetDeps = operation.isDev ? packageJson.devDependencies : packageJson.dependencies
      delete targetDeps[operation.packageName]

      // Update package.json in database
      const success = await this.updatePackageJson(projectId, packageJson)
      if (!success) {
        return {
          success: false,
          operation,
          result: {
            packageName: operation.packageName,
            oldVersion: existingVersion,
            newVersion: '',
            packageJsonUpdated: false
          },
          errors: ['Failed to update package.json in database'],
          warnings: []
        }
      }

      return {
        success: true,
        operation,
        result: {
          packageName: operation.packageName,
          oldVersion: existingVersion,
          newVersion: '',
          packageJsonUpdated: true
        },
        errors: [],
        warnings: []
      }
    } catch (error) {
      return {
        success: false,
        operation,
        result: {
          packageName: operation.packageName,
          newVersion: '',
          packageJsonUpdated: false
        },
        errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      }
    }
  }

  /**
   * Update a dependency version
   */
  async updateDependency(
    projectId: string,
    operation: DependencyOperation
  ): Promise<DependencyResult> {
    try {
      // Get current package.json
      const packageJson = await this.getPackageJson(projectId)
      if (!packageJson) {
        return {
          success: false,
          operation,
          result: {
            packageName: operation.packageName,
            newVersion: operation.version || 'latest',
            packageJsonUpdated: false
          },
          errors: ['package.json not found'],
          warnings: []
        }
      }

      // Check if package exists
      const existingVersion = this.getPackageVersion(packageJson, operation.packageName, operation.isDev)
      if (!existingVersion) {
        return {
          success: false,
          operation,
          result: {
            packageName: operation.packageName,
            newVersion: operation.version || 'latest',
            packageJsonUpdated: false
          },
          errors: [`Package ${operation.packageName} not found`],
          warnings: []
        }
      }

      // Update the package version
      const targetVersion = operation.version || 'latest'
      const targetDeps = operation.isDev ? packageJson.devDependencies : packageJson.dependencies
      
      targetDeps[operation.packageName] = targetVersion

      // Update package.json in database
      const success = await this.updatePackageJson(projectId, packageJson)
      if (!success) {
        return {
          success: false,
          operation,
          result: {
            packageName: operation.packageName,
            oldVersion: existingVersion,
            newVersion: targetVersion,
            packageJsonUpdated: false
          },
          errors: ['Failed to update package.json in database'],
          warnings: []
        }
      }

      return {
        success: true,
        operation,
        result: {
          packageName: operation.packageName,
          oldVersion: existingVersion,
          newVersion: targetVersion,
          packageJsonUpdated: true
        },
        errors: [],
        warnings: []
      }
    } catch (error) {
      return {
        success: false,
        operation,
        result: {
          packageName: operation.packageName,
          newVersion: operation.version || 'latest',
          packageJsonUpdated: false
        },
        errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      }
    }
  }

  /**
   * Upgrade a dependency to the latest version
   */
  async upgradeDependency(
    projectId: string,
    operation: DependencyOperation
  ): Promise<DependencyResult> {
    // For now, we'll use 'latest' as the version
    // In a real implementation, you might want to fetch the latest version from npm
    const upgradeOperation: DependencyOperation = {
      ...operation,
      type: 'update',
      version: 'latest'
    }
    
    return this.updateDependency(projectId, upgradeOperation)
  }

  /**
   * Execute multiple dependency operations
   */
  async executeMultipleOperations(
    projectId: string,
    operations: DependencyOperation[]
  ): Promise<DependencyResult[]> {
    const results: DependencyResult[] = []
    
    for (const operation of operations) {
      let result: DependencyResult
      
      switch (operation.type) {
        case 'add':
          result = await this.addDependency(projectId, operation)
          break
        case 'remove':
          result = await this.removeDependency(projectId, operation)
          break
        case 'update':
          result = await this.updateDependency(projectId, operation)
          break
        case 'upgrade':
          result = await this.upgradeDependency(projectId, operation)
          break
        default:
          result = {
            success: false,
            operation,
            result: {
              packageName: operation.packageName,
              newVersion: operation.version || 'latest',
              packageJsonUpdated: false
            },
            errors: [`Unknown operation type: ${operation.type}`],
            warnings: []
          }
      }
      
      results.push(result)
      
      // If a critical operation fails, stop processing
      if (!result.success && operation.type === 'add') {
        break
      }
    }
    
    return results
  }

  /**
   * Get all project dependencies
   */
  async getProjectDependencies(projectId: string): Promise<PackageInfo[]> {
    const packageJson = await this.getPackageJson(projectId)
    if (!packageJson) return []

    const dependencies: PackageInfo[] = []

    // Add production dependencies
    Object.entries(packageJson.dependencies).forEach(([name, version]) => {
      dependencies.push({
        name,
        version,
        type: 'dependency',
        category: this.categorizePackage(name)
      })
    })

    // Add dev dependencies
    Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
      dependencies.push({
        name,
        version,
        type: 'devDependency',
        category: this.categorizePackage(name)
      })
    })

    // Add peer dependencies if they exist
    if (packageJson.peerDependencies) {
      Object.entries(packageJson.peerDependencies).forEach(([name, version]) => {
        dependencies.push({
          name,
          version,
          type: 'peerDependency',
          category: this.categorizePackage(name)
        })
      })
    }

    return dependencies
  }

  /**
   * Check if a package is compatible with the project
   */
  async checkPackageCompatibility(
    projectId: string,
    packageName: string,
    version: string
  ): Promise<{
    compatible: boolean
    issues: string[]
    suggestions: string[]
  }> {
    const packageJson = await this.getPackageJson(projectId)
    if (!packageJson) {
      return {
        compatible: false,
        issues: ['package.json not found'],
        suggestions: ['Ensure the project has a valid package.json file']
      }
    }

    const issues: string[] = []
    const suggestions: string[] = []

    // Check React version compatibility
    if (packageJson.dependencies?.react) {
      const reactVersion = packageJson.dependencies.react
      if (packageName.includes('react') && !packageName.startsWith('@types/')) {
        if (reactVersion.startsWith('18') && version.startsWith('17')) {
          issues.push(`Package ${packageName} v${version} may not be compatible with React 18`)
          suggestions.push(`Consider upgrading to a React 18 compatible version`)
        }
      }
    }

    // Check TypeScript compatibility
    if (packageJson.devDependencies?.typescript) {
      const tsVersion = packageJson.devDependencies.typescript
      if (packageName.startsWith('@types/')) {
        if (tsVersion.startsWith('5') && version.startsWith('4')) {
          issues.push(`Type definitions ${packageName} v${version} may not be compatible with TypeScript 5`)
          suggestions.push(`Consider upgrading to TypeScript 5 compatible type definitions`)
        }
      }
    }

    // Check for conflicting packages
    const existingDeps = await this.getProjectDependencies(projectId)
    const conflictingPackages = this.findConflictingPackages(packageName, existingDeps)
    if (conflictingPackages.length > 0) {
      issues.push(`Package ${packageName} may conflict with: ${conflictingPackages.join(', ')}`)
      suggestions.push('Review package compatibility before installation')
    }

    return {
      compatible: issues.length === 0,
      issues,
      suggestions
    }
  }

  /**
   * Get package.json from database
   */
  private async getPackageJson(projectId: string): Promise<PackageJsonData | null> {
    try {
      const { data: file, error } = await this.supabase
        .from('files')
        .select('content')
        .eq('project_id', projectId)
        .eq('path', '/package.json')
        .single()

      if (error || !file?.content) {
        return null
      }

      return JSON.parse(file.content) as PackageJsonData
    } catch (error) {
      console.error('Error parsing package.json:', error)
      return null
    }
  }

  /**
   * Update package.json in database
   */
  private async updatePackageJson(projectId: string, packageJson: PackageJsonData): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('files')
        .update({
          content: JSON.stringify(packageJson, null, 2),
          size: JSON.stringify(packageJson, null, 2).length,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('path', '/package.json')

      return !error
    } catch (error) {
      console.error('Error updating package.json:', error)
      return false
    }
  }

  /**
   * Get package version from package.json
   */
  private getPackageVersion(
    packageJson: PackageJsonData,
    packageName: string,
    isDev: boolean = false
  ): string | undefined {
    const targetDeps = isDev ? packageJson.devDependencies : packageJson.dependencies
    return targetDeps[packageName]
  }

  /**
   * Categorize package by name
   */
  private categorizePackage(packageName: string): 'ui' | 'state' | 'routing' | 'styling' | 'testing' | 'build' | 'utility' | 'other' {
    if (packageName.includes('react') || packageName.includes('vue') || packageName.includes('angular')) {
      return 'ui'
    }
    if (packageName.includes('redux') || packageName.includes('zustand') || packageName.includes('mobx')) {
      return 'state'
    }
    if (packageName.includes('router') || packageName.includes('next')) {
      return 'routing'
    }
    if (packageName.includes('tailwind') || packageName.includes('styled') || packageName.includes('css')) {
      return 'styling'
    }
    if (packageName.includes('jest') || packageName.includes('vitest') || packageName.includes('cypress')) {
      return 'testing'
    }
    if (packageName.includes('vite') || packageName.includes('webpack') || packageName.includes('rollup')) {
      return 'build'
    }
    if (packageName.includes('lodash') || packageName.includes('date-fns') || packageName.includes('axios')) {
      return 'utility'
    }
    return 'other'
  }

  /**
   * Find potentially conflicting packages
   */
  private findConflictingPackages(packageName: string, existingDeps: PackageInfo[]): string[] {
    const conflicts: string[] = []
    
    // Check for duplicate functionality
    if (packageName.includes('state')) {
      const statePackages = existingDeps.filter(d => d.category === 'state')
      if (statePackages.length > 0) {
        conflicts.push(...statePackages.map(d => d.name))
      }
    }
    
    if (packageName.includes('styling')) {
      const stylingPackages = existingDeps.filter(d => d.category === 'styling')
      if (stylingPackages.length > 0) {
        conflicts.push(...stylingPackages.map(d => d.name))
      }
    }
    
    return conflicts
  }
}
