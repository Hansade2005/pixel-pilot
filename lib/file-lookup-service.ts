/**
 * File Lookup Service for @ command autocomplete
 * Provides efficient file searching and filtering capabilities
 */

import { File } from './storage-manager';

export interface FileSearchResult {
  id: string;
  name: string;
  path: string;
  extension: string;
  type: string;
  size: number;
  matchScore: number;
  isDirectory: boolean;
}

export class FileLookupService {
  private files: File[] = [];
  private projectId: string | null = null;

  constructor() {}

  /**
   * Initialize the service with project files
   */
  async initialize(projectId: string): Promise<void> {
    if (this.projectId === projectId && this.files.length > 0) {
      return; // Already initialized for this project
    }

    this.projectId = projectId;
    await this.refreshFiles();
  }

  /**
   * Refresh files from storage
   */
  async refreshFiles(): Promise<void> {
    if (!this.projectId) return;

    try {
      const { storageManager } = await import('./storage-manager');
      await storageManager.init();
      this.files = await storageManager.getFiles(this.projectId);
      console.log(`[FileLookupService] Loaded ${this.files.length} files for project ${this.projectId}`);
    } catch (error) {
      console.error('[FileLookupService] Error refreshing files:', error);
      this.files = [];
    }
  }

  /**
   * Search files by query string
   */
  searchFiles(query: string, maxResults: number = 10): FileSearchResult[] {
    if (!query.trim()) {
      // Return all files if no query, sorted by name
      return this.files
        .map(file => this.fileToSearchResult(file, 1))
        .sort((a, b) => {
          // Prioritize directories first, then by name
          if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        })
        .slice(0, maxResults);
    }

    const normalizedQuery = query.toLowerCase().trim();
    const results: FileSearchResult[] = [];

    for (const file of this.files) {
      const score = this.calculateMatchScore(file, normalizedQuery);
      if (score > 0) {
        results.push(this.fileToSearchResult(file, score));
      }
    }

    // Sort by match score (descending) then by name
    return results
      .sort((a, b) => {
        if (a.matchScore !== b.matchScore) {
          return b.matchScore - a.matchScore;
        }
        return a.name.localeCompare(b.name);
      })
      .slice(0, maxResults);
  }

  /**
   * Get files by extension
   */
  getFilesByExtension(extensions: string[]): FileSearchResult[] {
    const normalizedExtensions = extensions.map(ext => ext.toLowerCase().replace(/^\./, ''));
    
    return this.files
      .filter(file => {
        const fileExt = this.getFileExtension(file.name).toLowerCase();
        return normalizedExtensions.includes(fileExt);
      })
      .map(file => this.fileToSearchResult(file, 1))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get recently modified files
   */
  getRecentFiles(maxResults: number = 5): FileSearchResult[] {
    return this.files
      .filter(file => !file.isDirectory)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, maxResults)
      .map(file => this.fileToSearchResult(file, 1));
  }

  /**
   * Convert File to FileSearchResult
   */
  private fileToSearchResult(file: File, matchScore: number): FileSearchResult {
    return {
      id: file.id,
      name: file.name,
      path: file.path,
      extension: this.getFileExtension(file.name),
      type: file.fileType || file.type || 'text',
      size: file.size || 0,
      matchScore,
      isDirectory: file.isDirectory || false,
    };
  }

  /**
   * Calculate match score for a file based on query
   */
  private calculateMatchScore(file: File, query: string): number {
    const fileName = file.name.toLowerCase();
    const filePath = file.path.toLowerCase();
    
    let score = 0;

    // Exact name match gets highest score
    if (fileName === query) {
      score = 100;
    }
    // Name starts with query
    else if (fileName.startsWith(query)) {
      score = 80;
    }
    // Name contains query
    else if (fileName.includes(query)) {
      score = 60;
    }
    // Path contains query
    else if (filePath.includes(query)) {
      score = 40;
    }
    // Fuzzy match on file name
    else if (this.fuzzyMatch(fileName, query)) {
      score = 30;
    }
    // Extension match
    else if (this.getFileExtension(fileName).toLowerCase().includes(query)) {
      score = 20;
    }

    // Boost score for common file types
    const extension = this.getFileExtension(fileName);
    if (['tsx', 'ts', 'jsx', 'js', 'css', 'html', 'json', 'md'].includes(extension.toLowerCase())) {
      score += 5;
    }

    // Reduce score for very long paths (likely less relevant)
    if (filePath.split('/').length > 4) {
      score -= 5;
    }

    return Math.max(0, score);
  }

  /**
   * Simple fuzzy matching
   */
  private fuzzyMatch(text: string, pattern: string): boolean {
    let textIndex = 0;
    let patternIndex = 0;

    while (textIndex < text.length && patternIndex < pattern.length) {
      if (text[textIndex] === pattern[patternIndex]) {
        patternIndex++;
      }
      textIndex++;
    }

    return patternIndex === pattern.length;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.slice(lastDotIndex + 1) : '';
  }

  /**
   * Get file by path
   */
  getFileByPath(path: string): FileSearchResult | null {
    const file = this.files.find(f => f.path === path);
    return file ? this.fileToSearchResult(file, 1) : null;
  }

  /**
   * Get all files count
   */
  getFileCount(): number {
    return this.files.length;
  }
}

// Export singleton instance
export const fileLookupService = new FileLookupService();
