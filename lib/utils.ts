import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// File extensions to filter out during compression/bundling
const FILTERED_EXTENSIONS = new Set([
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'heic', 'heif',
  // Videos
  'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v', '3gp', 'mpg', 'mpeg',
  // PDFs
  'pdf'
])

/**
 * Filter out images, videos, and PDF files from a file array
 * Used during compression and bundling to reduce payload size
 */
export function filterMediaFiles(files: any[]): any[] {
  return files.filter(file => {
    if (!file.path) return true // Keep files without path

    const extension = file.path.split('.').pop()?.toLowerCase()
    if (!extension) return true // Keep files without extension

    return !FILTERED_EXTENSIONS.has(extension)
  })
}
