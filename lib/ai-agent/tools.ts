import { z } from 'zod'

// Tool for analyzing user requests and creating implementation plans
export const analyzeRequestTool = {
  name: 'analyze_request',
  description: 'Analyze user requests and create detailed implementation plans',
  parameters: z.object({
    request: z.string().describe('The user\'s request or requirement'),
    projectContext: z.object({
      framework: z.string().optional().describe('Current project framework (React, Vue, etc.)'),
      language: z.string().optional().describe('Programming language (TypeScript, JavaScript, etc.)'),
      features: z.array(z.string()).optional().describe('Current project features'),
      complexity: z.enum(['simple', 'medium', 'complex']).optional().describe('Request complexity level')
    }).describe('Context about the current project'),
    mode: z.enum(['plan', 'build']).describe('Whether this is for planning or building')
  })
}

// Tool for creating new files
export const createFileTool = {
  name: 'create_file',
  description: 'Create a new file with specified content',
  parameters: z.object({
    filePath: z.string().describe('Path where the file should be created'),
    content: z.string().describe('Content of the file to create'),
    fileType: z.string().optional().describe('Type of file (component, page, utility, etc.)'),
    description: z.string().optional().describe('Description of what this file does')
  })
}

// Tool for editing existing files
export const editFileTool = {
  name: 'edit_file',
  description: 'Edit an existing file using search and replace operations',
  parameters: z.object({
    filePath: z.string().describe('Path of the file to edit'),
    operations: z.array(z.object({
      search: z.string().describe('Exact text to search for'),
      replace: z.string().describe('Text to replace the search text with'),
      description: z.string().describe('Description of what this edit does'),
      lineNumbers: z.array(z.number()).optional().describe('Specific line numbers if applicable')
    })).describe('Array of search and replace operations'),
    description: z.string().describe('Overall description of the file edit')
  })
}

// Tool for managing dependencies
export const manageDependenciesTool = {
  name: 'manage_dependencies',
  description: 'Add, remove, or update project dependencies',
  parameters: z.object({
    operation: z.enum(['add', 'remove', 'update']).describe('Type of dependency operation'),
    dependencies: z.array(z.object({
      name: z.string().describe('Package name'),
      version: z.string().optional().describe('Package version (for add/update operations)'),
      type: z.enum(['production', 'development', 'peer']).optional().describe('Dependency type')
    })).describe('Array of dependencies to operate on'),
    description: z.string().describe('Description of why these dependencies are needed')
  })
}

// Tool for executing build operations
export const executeBuildTool = {
  name: 'execute_build',
  description: 'Execute build operations like running tests, building the project, or deploying',
  parameters: z.object({
    operation: z.enum(['test', 'build', 'deploy', 'lint', 'format']).describe('Type of build operation'),
    options: z.object({
      environment: z.string().optional().describe('Environment to run the operation in'),
      watch: z.boolean().optional().describe('Whether to run in watch mode'),
      verbose: z.boolean().optional().describe('Whether to run with verbose output')
    }).optional().describe('Additional options for the operation'),
    description: z.string().describe('Description of what this build operation does')
  })
}

// Tool for project analysis
export const analyzeProjectTool = {
  name: 'analyze_project',
  description: 'Analyze the current project structure and provide insights',
  parameters: z.object({
    analysisType: z.enum(['structure', 'dependencies', 'performance', 'security', 'best_practices']).describe('Type of analysis to perform'),
    scope: z.enum(['file', 'directory', 'project']).describe('Scope of the analysis'),
    target: z.string().optional().describe('Specific file, directory, or component to analyze'),
    description: z.string().describe('Description of what to analyze and why')
  })
}

// Export all tools as an array for use with AI SDK
export const aiAgentTools = [
  analyzeRequestTool,
  createFileTool,
  editFileTool,
  manageDependenciesTool,
  executeBuildTool,
  analyzeProjectTool
]

// Tool result schemas for better type safety
export const toolResults = {
  analyzeRequest: z.object({
    plan: z.object({
      steps: z.array(z.string()),
      files: z.array(z.string()),
      dependencies: z.array(z.string()),
      estimatedTime: z.string(),
      complexity: z.enum(['simple', 'medium', 'complex'])
    }),
    summary: z.string(),
    nextActions: z.array(z.string())
  }),
  
  createFile: z.object({
    success: z.boolean(),
    filePath: z.string(),
    message: z.string(),
    warnings: z.array(z.string()).optional()
  }),
  
  editFile: z.object({
    success: z.boolean(),
    filePath: z.string(),
    changesApplied: z.number(),
    message: z.string(),
    conflicts: z.array(z.string()).optional()
  }),
  
  manageDependencies: z.object({
    success: z.boolean(),
    operation: z.string(),
    dependencies: z.array(z.string()),
    message: z.string(),
    packageJsonUpdated: z.boolean()
  }),
  
  executeBuild: z.object({
    success: z.boolean(),
    operation: z.string(),
    output: z.string(),
    duration: z.number(),
    warnings: z.array(z.string()).optional()
  }),
  
  analyzeProject: z.object({
    insights: z.array(z.string()),
    recommendations: z.array(z.string()),
    issues: z.array(z.string()),
    score: z.number().min(0).max(100)
  })
}
