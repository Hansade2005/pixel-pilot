import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import JSZip from 'jszip'

export interface StorageFile {
  path: string
  content: Buffer
  contentType?: string
}

export class SupabaseStorageManager {
  private supabase: any

  constructor() {
    this.supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  /**
   * Upload a single file to Supabase Storage
   */
  async uploadFile(
    bucket: string,
    path: string,
    content: Buffer,
    contentType?: string
  ): Promise<string> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(path, content, {
        contentType: contentType || this.getContentType(path),
        upsert: true
      })

    if (error) {
      throw new Error(`Failed to upload ${path}: ${error.message}`)
    }

    return path
  }

  /**
   * Upload multiple files to Supabase Storage
   */
  async uploadFiles(
    bucket: string,
    basePath: string,
    files: StorageFile[]
  ): Promise<string[]> {
    const uploadedPaths: string[] = []

    for (const file of files) {
      const fullPath = `${basePath}/${file.path}`
      await this.uploadFile(bucket, fullPath, file.content, file.contentType)
      uploadedPaths.push(fullPath)
    }

    return uploadedPaths
  }

  /**
   * Download a file from Supabase Storage
   */
  async downloadFile(bucket: string, path: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .download(path)

    if (error) {
      throw new Error(`Failed to download ${path}: ${error.message}`)
    }

    const arrayBuffer = await data.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  }

  /**
   * List files in a bucket path
   */
  async listFiles(bucket: string, path?: string): Promise<string[]> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .list(path, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`)
    }

    return data?.map((file: any) => file.name) || []
  }

  /**
   * Delete a file from Supabase Storage
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      throw new Error(`Failed to delete ${path}: ${error.message}`)
    }
  }

  /**
   * Delete multiple files from Supabase Storage
   */
  async deleteFiles(bucket: string, paths: string[]): Promise<void> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove(paths)

    if (error) {
      throw new Error(`Failed to delete files: ${error.message}`)
    }
  }

  /**
   * Create a ZIP file from multiple files and upload it
   */
  async createAndUploadZip(
    bucket: string,
    zipPath: string,
    files: StorageFile[]
  ): Promise<string> {
    const zip = new JSZip()

    // Add files to ZIP
    for (const file of files) {
      zip.file(file.path, file.content)
    }

    // Generate ZIP content
    const zipContent = await zip.generateAsync({ type: 'nodebuffer' })

    // Upload ZIP file
    await this.uploadFile(bucket, zipPath, zipContent, 'application/zip')

    return zipPath
  }

  /**
   * Extract ZIP file and upload its contents
   */
  async extractAndUploadZip(
    bucket: string,
    zipPath: string,
    extractToPath: string
  ): Promise<string[]> {
    // Download ZIP file
    const zipBuffer = await this.downloadFile(bucket, zipPath)

    // Extract ZIP
    const zip = new JSZip()
    const zipContent = await zip.loadAsync(zipBuffer)

    const uploadedPaths: string[] = []

    // Upload each file from ZIP
    for (const [path, file] of Object.entries(zipContent.files)) {
      if (!file.dir) {
        const content = await file.async('nodebuffer')
        const fullPath = `${extractToPath}/${path}`

        await this.uploadFile(bucket, fullPath, content)
        uploadedPaths.push(fullPath)
      }
    }

    return uploadedPaths
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase()

    const contentTypes: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'jsx': 'application/javascript',
      'ts': 'application/typescript',
      'tsx': 'application/typescript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      'eot': 'application/vnd.ms-fontobject',
      'zip': 'application/zip',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'md': 'text/markdown'
    }

    return contentTypes[ext || ''] || 'application/octet-stream'
  }

  /**
   * Check if a file exists in storage
   */
  async fileExists(bucket: string, path: string): Promise<boolean> {
    try {
      await this.downloadFile(bucket, path)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(bucket: string, path: string): Promise<any> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .list(path.split('/').slice(0, -1).join('/'), {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) {
      throw new Error(`Failed to get metadata for ${path}: ${error.message}`)
    }

    const fileName = path.split('/').pop()
    const file = data?.find((f: any) => f.name === fileName)

    return file || null
  }
}

// Export singleton instance
export const supabaseStorage = new SupabaseStorageManager()
