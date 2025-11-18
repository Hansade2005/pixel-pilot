import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// File extensions and patterns to filter out during compression/bundling
const FILTERED_EXTENSIONS = new Set([
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'heic', 'heif',
  // Videos
  'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v', '3gp', 'mpg', 'mpeg',
  // PDFs
  'pdf',
  // Other unwanted files
  'lock', 'log', 'tmp', 'temp', 'cache', 'DS_Store'
])

// Folders to filter out (case-insensitive)
const FILTERED_FOLDERS = new Set([
  'scripts',
  'tests',
  '_tests',
  '_tests_',
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.nyc_output',
  '__pycache__',
  '.pytest_cache',
  '.vscode',
  '.idea',
  'target', // Java/Maven
  'bin',    // .NET/Java
  'obj',    // .NET
  'out',    // Various build outputs
  'tmp',
  'temp',
  'cache',
  '.cache'
])

/**
 * Filter out unwanted files and folders from a file array for large codebase handling
 * Filters out: media files, scripts folders, test folders, build artifacts, and all MD files except README.md
 * Used during compression, bundling, and import operations to reduce payload size and improve performance
 */
export function filterUnwantedFiles(files: any[]): any[] {
  return files.filter(file => {
    if (!file.path) return true // Keep files without path

    const path = file.path.toLowerCase()
    const fileName = file.path.split('/').pop()?.toLowerCase() || ''

    // Filter out entire folders
    for (const folder of FILTERED_FOLDERS) {
      if (path.includes(`/${folder}/`) || path.startsWith(`${folder}/`)) {
        return false
      }
    }

    // Filter out specific file extensions
    const extension = file.path.split('.').pop()?.toLowerCase()
    if (extension && FILTERED_EXTENSIONS.has(extension)) {
      return false
    }

    // Filter out all .md files except specific important documentation files
    const importantMdFiles = [
      'readme.md',
      'external_app_integration_guide.md',
      'storage_system_implementation.md',
      'user_authentication_readme.md'
    ]
    if (extension === 'md' && !importantMdFiles.includes(fileName)) {
      return false
    }

    // Filter out common unwanted files
    const unwantedFiles = [
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'composer.lock',
      'gemfile.lock',
      '.gitignore',
      '.dockerignore',
      'dockerfile',
      'docker-compose.yml',
      'docker-compose.yaml',
      'makefile',
      'rakefile'
    ]

    if (unwantedFiles.some(unwanted => fileName === unwanted)) {
      return false
    }

    return true
  })
}

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use filterUnwantedFiles instead for more comprehensive filtering
 */
export function filterMediaFiles(files: any[]): any[] {
  return filterUnwantedFiles(files)
}
