"use client"

import React, { useState, useEffect } from "react"
import { useToast } from '@/hooks/use-toast'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  Search,
  FileCode,
  FileImage,
  FileJson,
  FileType,
  Settings,
  Package,
  FileDown,
  File
} from "lucide-react"
import type { Workspace as Project, File as FileItem } from "@/lib/storage-manager"
import { dbManager } from '@/lib/indexeddb';

interface FileExplorerProps {
  project: Project | null
  onFileSelect: (file: FileItem | null) => void
  selectedFile: FileItem | null
}

interface FileNode {
  name: string
  path: string
  type: "file" | "folder"
  file?: FileItem
  children: FileNode[]
  expanded?: boolean
}

export function FileExplorer({ project, onFileSelect, selectedFile }: FileExplorerProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newFileName, setNewFileName] = useState("")
  const [newFileType, setNewFileType] = useState("tsx")
  const [isCreating, setIsCreating] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [renamingFile, setRenamingFile] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  // Track folder for new file creation
  const [createInFolder, setCreateInFolder] = useState<string | null>(null)
  // Drag target for visual highlight
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)

  const { toast } = useToast()

  // Drag-and-drop logic
  const handleDragStart = (e: React.DragEvent, node: FileNode) => {
    e.dataTransfer.setData("text/plain", node.path)
  }
  const handleDrop = async (e: React.DragEvent, folderNode: FileNode) => {
    e.preventDefault()
    const filePath = e.dataTransfer.getData("text/plain")
    if (!project || !filePath || folderNode.type !== "folder") return
    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      const file = files.find(f => f.path === filePath)
      if (!file) return
      const newPath = `${folderNode.path}/${file.name}`
      await storageManager.updateFile(project.id, filePath, { path: newPath })
      await fetchFiles()
  setDragOverFolder(null)
  toast({ title: 'Moved file', description: `Moved ${file.name} to ${folderNode.path}` })
    } catch (error) {
      console.error("Error moving file:", error)
    }
  }

  const handleRenameFile = async () => {
    if (!project || !renamingFile || !renameValue.trim()) return
    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      const file = files.find(f => f.path === renamingFile)
      if (!file) return
      const newPath = renamingFile.split('/').slice(0, -1).concat(renameValue).join('/')
      await storageManager.updateFile(project.id, renamingFile, { name: renameValue, path: newPath })
      setRenamingFile(null)
      setRenameValue("")
      await fetchFiles()
  toast({ title: 'Renamed file', description: `Renamed ${file.name} → ${renameValue}` })
    } catch (error) {
      console.error("Error renaming file:", error)
    }
  }

  useEffect(() => {
    console.log('FileExplorer: Project changed:', project?.id, project?.name)
    if (project) {
      console.log('FileExplorer: Fetching files for project:', project.id)
      fetchFiles()
    } else {
      console.log('FileExplorer: No project selected, clearing files')
      setFiles([])
    }
  }, [project])

  useEffect(() => {
    setFileTree(buildFileTree(files))
  }, [files, expandedFolders])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault()
            setIsCreateDialogOpen(true)
            break
          case 'f':
            e.preventDefault()
            setShowSearch(true)
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  // Listen for file change events from other components (e.g., chat-panel)
  useEffect(() => {
    if (!project) return;
    
    const handleFilesChanged = (e: CustomEvent) => {
      const detail = e.detail as { projectId: string };
      if (detail.projectId === project.id) {
        console.log('File explorer: Detected files changed event, refreshing files');
        fetchFiles();
      }
    };
    
    window.addEventListener('files-changed', handleFilesChanged as EventListener);
    return () => window.removeEventListener('files-changed', handleFilesChanged as EventListener);
  }, [project]);

  const fetchFiles = async () => {
    if (!project) return;

    try {
      console.log(`Fetching files for project: ${project.id} from IndexedDB`);

      // Import and initialize storage manager
      const { storageManager } = await import('@/lib/storage-manager');
      await storageManager.init();

      // Get files directly from IndexedDB
      const projectFiles = await storageManager.getFiles(project.id);
      console.log(`Found ${projectFiles.length} files for project: ${project.id}`);

      setFiles(projectFiles);
      // If no files, show empty state in UI (handled by render logic)
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  }

  const buildFileTree = (files: FileItem[]): FileNode[] => {
    const tree: FileNode[] = []
    const folderMap = new Map<string, FileNode>()

    // First, create all directory entries from files marked as isDirectory: true
    files.forEach((file) => {
      if (file.isDirectory) {
        const folderNode: FileNode = {
          name: file.name,
          path: file.path,
          type: "folder",
          file,
          children: [],
          expanded: expandedFolders.has(file.path),
        }
        folderMap.set(file.path, folderNode)
      }
    })

    // Create folder structure from file paths and handle actual files
    files.forEach((file) => {
      // Skip files that are directories (already handled above)
      if (file.isDirectory) {
        return
      }

      const pathParts = file.path.split("/").filter(Boolean)
      let currentPath = ""

      pathParts.forEach((part, index) => {
        const isFile = index === pathParts.length - 1
        currentPath = currentPath ? `${currentPath}/${part}` : part

        if (isFile) {
          // Add file to its parent folder or root
          const parentPath = pathParts.slice(0, -1).join("/")
          const parent = parentPath ? folderMap.get(parentPath) : null

          const fileNode: FileNode = {
            name: part,
            path: currentPath,
            type: "file",
            file,
            children: [],
          }

          if (parent) {
            parent.children.push(fileNode)
          } else {
            tree.push(fileNode)
          }
        } else {
          // Create implicit folder if it doesn't exist (for nested file paths)
          if (!folderMap.has(currentPath)) {
            const folderNode: FileNode = {
              name: part,
              path: currentPath,
              type: "folder",
              children: [],
              expanded: expandedFolders.has(currentPath),
            }

            folderMap.set(currentPath, folderNode)
          }
        }
      })
    })

    // Now arrange all folders and files in the tree structure
    const allNodes = Array.from(folderMap.values())
    
    // Add folders to their parents or root
    allNodes.forEach((node) => {
      const parentPath = node.path.split("/").slice(0, -1).join("/")
      const parent = parentPath ? folderMap.get(parentPath) : null
      
      if (parent) {
        parent.children.push(node)
      } else {
        tree.push(node)
      }
    })

    // Sort each level: folders first, then files, both alphabetically
    const sortNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.sort((a, b) => {
        if (a.type === "folder" && b.type === "file") return -1
        if (a.type === "file" && b.type === "folder") return 1
        return a.name.localeCompare(b.name)
      })
    }

    const sortTree = (nodes: FileNode[]): FileNode[] => {
      const sorted = sortNodes(nodes)
      sorted.forEach(node => {
        if (node.children.length > 0) {
          node.children = sortTree(node.children)
        }
      })
      return sorted
    }

    return sortTree(tree)
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    switch (extension) {
      case 'tsx':
      case 'jsx':
        return <FileCode className="h-4 w-4 text-blue-500" />
      case 'ts':
      case 'js':
        return <FileType className="h-4 w-4 text-yellow-500" />
      case 'css':
      case 'scss':
      case 'sass':
        return <File className="h-4 w-4 text-pink-500" />
      case 'html':
        return <FileText className="h-4 w-4 text-orange-600" />
      case 'json':
        return <FileJson className="h-4 w-4 text-green-500" />
      case 'md':
        return <FileDown className="h-4 w-4 text-purple-500" />
      case 'xml':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'yml':
      case 'yaml':
        return <Settings className="h-4 w-4 text-indigo-500" />
      case 'env':
        return <Settings className="h-4 w-4 text-green-600" />
      case 'gitignore':
        return <FileText className="h-4 w-4 text-gray-600" />
      case 'py':
        return <FileCode className="h-4 w-4 text-blue-600" />
      case 'java':
        return <FileCode className="h-4 w-4 text-red-600" />
      case 'cpp':
      case 'c':
        return <FileCode className="h-4 w-4 text-blue-700" />
      case 'php':
        return <FileCode className="h-4 w-4 text-purple-600" />
      case 'rb':
        return <FileCode className="h-4 w-4 text-red-500" />
      case 'go':
        return <FileCode className="h-4 w-4 text-cyan-600" />
      case 'rs':
        return <FileCode className="h-4 w-4 text-orange-700" />
      case 'sh':
      case 'bat':
      case 'ps1':
        return <FileCode className="h-4 w-4 text-green-700" />
      case 'sql':
        return <FileText className="h-4 w-4 text-blue-800" />
      case 'txt':
      case 'log':
        return <FileText className="h-4 w-4 text-gray-500" />
      case 'conf':
      case 'ini':
      case 'toml':
        return <Settings className="h-4 w-4 text-amber-600" />
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <FileImage className="h-4 w-4 text-orange-500" />
      default:
        if (fileName === 'package.json') {
          return <Package className="h-4 w-4 text-red-500" />
        }
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getFileName = (inputName: string, fileType: string): string => {
    // Handle special cases where the filename should be different
    switch (fileType) {
      case "env":
        return inputName.startsWith('.env') ? inputName : `.env${inputName ? '.' + inputName : ''}`
      case "gitignore":
        return ".gitignore"
      case "folder":
        return inputName
      default:
        return `${inputName}.${fileType}`
    }
  }

  const handleCreateFile = async () => {
    if (!project || !newFileName.trim()) return

    setIsCreating(true)
    try {
      // Use helper function to get the correct filename
      const fileName = getFileName(newFileName, newFileType)
      const filePath = createInFolder ? `${createInFolder}/${fileName}` : fileName

      // Import and initialize storage manager
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
      // Create file directly in IndexedDB
      const newFile = await storageManager.createFile({
        workspaceId: project.id,
        name: fileName,
        path: filePath,
        content: newFileType === "folder" ? "" : getDefaultContent(newFileType),
        fileType: newFileType === "folder" ? "folder" : "text",
        type: newFileType === "folder" ? "folder" : "text",
        size: (newFileType === "folder" ? "" : getDefaultContent(newFileType)).length,
        isDirectory: newFileType === "folder"
      })

      if (newFile) {
        console.log('File created successfully:', newFile)
        await fetchFiles()
        setIsCreateDialogOpen(false)
        setNewFileName("")
        setNewFileType("tsx")
        setCreateInFolder(null)
        
        // Auto-expand the folder if it was created
        if (newFileType === "folder") {
          const newExpanded = new Set(expandedFolders)
          newExpanded.add(filePath)
          setExpandedFolders(newExpanded)
        }
        
        toast({
          title: "Success",
          description: `${newFileType === "folder" ? "Folder" : "File"} created successfully!`
        })
      }
    } catch (error) {
      console.error("Error creating file in IndexedDB:", error)
      toast({
        title: "Error",
        description: `Failed to create ${newFileType === "folder" ? "folder" : "file"}`,
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const getDefaultContent = (fileType: string): string => {
    const componentName = newFileName.charAt(0).toUpperCase() + newFileName.slice(1)
    
    switch (fileType) {
      case "tsx":
        return `import React from 'react'

export default function ${componentName}() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">${componentName}</h1>
      <p>This is a new React component.</p>
    </div>
  )
}`
      case "jsx":
        return `import React from 'react'

export default function ${componentName}() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">${componentName}</h1>
      <p>This is a new React component.</p>
    </div>
  )
}`
      case "ts":
        return `// ${componentName} utility
export const ${newFileName} = () => {
  console.log('${newFileName} function called')
  return null
}

export type ${componentName}Type = {
  id: string
  name: string
}`
      case "js":
        return `// ${componentName} utility
export const ${newFileName} = () => {
  console.log('${newFileName} function called')
  return null
}`
      case "css":
        return `/* ${componentName} styles */
.${newFileName} {
  display: flex;
  align-items: center;
  justify-content: center;
}

.${newFileName}__container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}`
      case "scss":
      case "sass":
        return `// ${componentName} styles
$primary-color: #007bff;
$secondary-color: #6c757d;

.${newFileName} {
  display: flex;
  align-items: center;
  justify-content: center;
  
  &__container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
  }
  
  &__title {
    color: $primary-color;
    font-size: 2rem;
  }
}`
      case "html":
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${componentName}</title>
</head>
<body>
    <h1>${componentName}</h1>
    <p>This is a new HTML file.</p>
</body>
</html>`
      case "json":
        return `{
  "name": "${newFileName}",
  "version": "1.0.0",
  "description": "${componentName} configuration",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "keywords": [],
  "author": "",
  "license": "MIT"
}`
      case "md":
        return `# ${componentName}

This is a markdown file for documentation.

## Description

${componentName} provides functionality for...

## Usage

\`\`\`typescript
// Example usage
import { ${newFileName} } from './${newFileName}'

const result = ${newFileName}()
\`\`\`

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`bash
npm install
\`\`\`

## Contributing

Pull requests are welcome. For major changes, please open an issue first.`
      case "xml":
        return `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <${newFileName}>
        <name>${componentName}</name>
        <description>This is a new XML file</description>
    </${newFileName}>
</root>`
      case "yml":
      case "yaml":
        return `# ${componentName} configuration
name: ${newFileName}
version: 1.0.0
description: ${componentName} configuration file

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development

networks:
  default:
    driver: bridge`
      case "env":
        return `# ${componentName} Environment Variables
# Copy this file to .env.local and fill in your values

# Database
DATABASE_URL=

# Authentication
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# API Keys
OPENAI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=`
      case "gitignore":
        return `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db`
      case "py":
        return `#!/usr/bin/env python3
"""${componentName} module.

This module provides functionality for...
"""

def ${newFileName}():
    """Main function for ${newFileName}."""
    print(f"Hello from ${newFileName}!")
    pass

def main():
    """Entry point."""
    ${newFileName}()

if __name__ == "__main__":
    main()`
      case "java":
        return `public class ${componentName} {
    
    public static void main(String[] args) {
        System.out.println("Hello from ${componentName}!");
    }
    
    public void ${newFileName}() {
        // TODO: Implement ${newFileName} functionality
    }
}`
      case "cpp":
        return `#include <iostream>
#include <string>

class ${componentName} {
public:
    ${componentName}() {}
    
    void ${newFileName}() {
        std::cout << "Hello from ${componentName}!" << std::endl;
    }
};

int main() {
    ${componentName} obj;
    obj.${newFileName}();
    return 0;
}`
      case "c":
        return `#include <stdio.h>
#include <stdlib.h>

void ${newFileName}() {
    printf("Hello from ${newFileName}!\\n");
}

int main() {
    ${newFileName}();
    return 0;
}`
      case "php":
        return `<?php
/**
 * ${componentName} class
 * 
 * This class provides functionality for...
 */
class ${componentName} {
    
    public function ${newFileName}() {
        echo "Hello from ${componentName}!";
    }
}

// Usage
$obj = new ${componentName}();
$obj->${newFileName}();
?>`
      case "rb":
        return `#!/usr/bin/env ruby

# ${componentName} class
class ${componentName}
  def initialize
    puts "${componentName} initialized"
  end
  
  def ${newFileName}
    puts "Hello from ${componentName}!"
  end
end

# Usage
obj = ${componentName}.new
obj.${newFileName}`
      case "go":
        return `package main

import (
    "fmt"
)

// ${componentName} struct
type ${componentName} struct {
    Name string
}

// ${newFileName} method
func (c *${componentName}) ${newFileName}() {
    fmt.Printf("Hello from %s!\\n", c.Name)
}

func main() {
    obj := &${componentName}{Name: "${componentName}"}
    obj.${newFileName}()
}`
      case "rs":
        return `// ${componentName} module

struct ${componentName} {
    name: String,
}

impl ${componentName} {
    fn new(name: String) -> Self {
        ${componentName} { name }
    }
    
    fn ${newFileName}(&self) {
        println!("Hello from {}!", self.name);
    }
}

fn main() {
    let obj = ${componentName}::new("${componentName}".to_string());
    obj.${newFileName}();
}`
      case "sh":
        return `#!/bin/bash

# ${componentName} script
# Description: This script provides functionality for...

set -e  # Exit on error

function ${newFileName}() {
    echo "Hello from ${componentName}!"
    # TODO: Add your functionality here
}

function main() {
    echo "Starting ${componentName}..."
    ${newFileName}
    echo "${componentName} completed successfully."
}

# Check if script is being executed directly
if [[ "\${BASH_SOURCE[0]}" == "\${0}" ]]; then
    main "$@"
fi`
      case "bat":
        return `@echo off
REM ${componentName} batch script
REM Description: This script provides functionality for...

setlocal enabledelayedexpansion

echo Starting ${componentName}...

REM TODO: Add your functionality here
echo Hello from ${componentName}!

echo ${componentName} completed successfully.
pause`
      case "ps1":
        return `# ${componentName} PowerShell script
# Description: This script provides functionality for...

function ${componentName} {
    Write-Host "Hello from ${componentName}!" -ForegroundColor Green
    # TODO: Add your functionality here
}

function Main {
    Write-Host "Starting ${componentName}..." -ForegroundColor Yellow
    ${componentName}
    Write-Host "${componentName} completed successfully." -ForegroundColor Green
}

# Execute main function if script is run directly
if ($MyInvocation.InvocationName -ne '.') {
    Main
}`
      case "sql":
        return `-- ${componentName} SQL Script
-- Description: This script provides database functionality for...

-- Create table
CREATE TABLE IF NOT EXISTS ${newFileName} (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO ${newFileName} (name, description) VALUES
('Sample 1', 'This is a sample record'),
('Sample 2', 'This is another sample record');

-- Query data
SELECT * FROM ${newFileName} ORDER BY created_at DESC;`
      case "txt":
        return `${componentName}
${'='.repeat(componentName.length)}

This is a plain text file.

You can add any content here:
- Notes
- Documentation
- Configuration
- Data

Created: ${new Date().toLocaleDateString()}`
      case "log":
        return `[${new Date().toISOString()}] INFO: ${componentName} log file created
[${new Date().toISOString()}] INFO: System initialized successfully
[${new Date().toISOString()}] DEBUG: Debug mode enabled`
      case "conf":
      case "ini":
        return `# ${componentName} Configuration File
# Description: Configuration settings for ${componentName}

[general]
name = ${newFileName}
version = 1.0.0
debug = false

[database]
host = localhost
port = 5432
name = ${newFileName}_db

[api]
baseurl = http://localhost:3000
timeout = 30
retries = 3`
      case "toml":
        return `# ${componentName} TOML Configuration
# Description: Configuration settings for ${componentName}

[package]
name = "${newFileName}"
version = "1.0.0"
description = "${componentName} configuration"

[database]
host = "localhost"
port = 5432
name = "${newFileName}_db"

[api]
base_url = "http://localhost:3000"
timeout = 30
retries = 3

[[features]]
name = "feature1"
enabled = true

[[features]]
name = "feature2"
enabled = false`
      case "folder":
        return ""
      default:
        return `// ${componentName}
// Created: ${new Date().toLocaleDateString()}

// TODO: Add your code here`
    }
  }

  const handleDeleteFile = async (file: FileItem) => {
    if (!project) return

    try {
      // Import and initialize storage manager
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
      // Delete file directly from IndexedDB
      await storageManager.deleteFile(project.id, file.path);
      console.log('File deleted successfully:', file.name)
      
      await fetchFiles()
      if (selectedFile?.id === file.id) {
        onFileSelect(null)
      }
    } catch (error) {
      console.error("Error deleting file from IndexedDB:", error);
    }
  }

  const handleDeleteFolder = async (folderPath: string) => {
    if (!project) return

    try {
      console.log('Deleting folder from IndexedDB:', folderPath)
      
      // Import and initialize storage manager
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
      // Get all files in the folder and delete them
      const projectFiles = await storageManager.getFiles(project.id)
      const filesInFolder = projectFiles.filter(file => file.path.startsWith(folderPath + '/'))
      
      // Delete all files in the folder
      for (const file of filesInFolder) {
        await storageManager.deleteFile(project.id, file.path)
      }
      
      console.log(`Deleted ${filesInFolder.length} files from folder: ${folderPath}`)
      
      await fetchFiles()
    } catch (error) {
      console.error("Error deleting folder from IndexedDB:", error)
    }
  }

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const handleToggleFolder = (path: string) => {
    toggleFolder(path)
  }

  const renderFileNode = (node: FileNode, depth = 0) => {
    const isSelected = selectedFile?.id === node.file?.id
    const isSearchMatch = searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase())

    return (
      <div key={node.path}
        draggable={node.type === "file"}
        onDragStart={node.type === "file" ? (e) => handleDragStart(e, node) : undefined}
        onDragEnter={node.type === "folder" ? (e) => { e.preventDefault(); setDragOverFolder(node.path) } : undefined}
        onDragOver={node.type === "folder" ? (e) => { e.preventDefault(); setDragOverFolder(node.path) } : undefined}
        onDragLeave={node.type === "folder" ? () => setDragOverFolder(null) : undefined}
        onDrop={node.type === "folder" ? (e) => handleDrop(e, node) : undefined}
      >
        <ContextMenu>
            <ContextMenuTrigger>
            <div
              className={`flex items-center space-x-2 px-2 py-1.5 hover:bg-accent/50 rounded cursor-pointer transition-colors ${
                isSelected ? "bg-accent text-accent-foreground" : ""
              } ${isSearchMatch ? "bg-yellow-100 dark:bg-yellow-900/20" : ""} ${node.type === 'folder' && node.path === dragOverFolder ? 'bg-sky-100 dark:bg-sky-900/20 ring-1 ring-sky-300' : ''}`}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              onClick={() => {
                if (node.type === "folder") {
                  toggleFolder(node.path)
                } else if (node.file) {
                  onFileSelect(node.file)
                }
              }}
            >
              {node.type === "folder" ? (
                <>
                  {node.expanded ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                  {node.expanded ? (
                    <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  ) : (
                    <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  )}
                </>
              ) : (
                <>
                  <div className="w-3" />
                  {getFileIcon(node.name)}
                </>
              )}
              <span className="text-sm truncate font-mono">{node.name}</span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {node.type === "file" && node.file && (
              <>
                <ContextMenuItem onClick={() => onFileSelect(node.file!)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Open
                </ContextMenuItem>
                  <ContextMenuItem onClick={() => {
                    setRenamingFile(node.path)
                    setRenameValue(node.name)
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Rename
                  </ContextMenuItem>
                <ContextMenuItem onClick={() => handleDeleteFile(node.file!)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </ContextMenuItem>
              </>
            )}
  {/* Rename Dialog */}
  <Dialog open={!!renamingFile} onOpenChange={v => { if (!v) setRenamingFile(null) }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Rename File</DialogTitle>
        <DialogDescription>Enter a new name for the file.</DialogDescription>
      </DialogHeader>
      <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus />
      <DialogFooter>
        <Button onClick={handleRenameFile} disabled={!renameValue.trim()}>Rename</Button>
        <Button variant="ghost" onClick={() => setRenamingFile(null)}>Cancel</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
            {node.type === "folder" && (
              <>
                <ContextMenuItem onClick={() => toggleFolder(node.path)}>
                  {node.expanded ? (
                    <>
                      <ChevronRight className="mr-2 h-4 w-4" />
                      Collapse
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" />
                      Expand
                    </>
                  )}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleDeleteFolder(node.path)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Folder
                </ContextMenuItem>
                  <ContextMenuItem onClick={() => {
                    setIsCreateDialogOpen(true)
                    setNewFileType("tsx")
                    setNewFileName("")
                    setCreateInFolder(node.path)
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    New File
                  </ContextMenuItem>
              </>
            )}
            <ContextMenuItem onClick={() => {
              setNewFileType("folder")
              setIsCreateDialogOpen(true)
            }}>
              <Folder className="mr-2 h-4 w-4" />
              New Folder
            </ContextMenuItem>
            <ContextMenuItem onClick={() => {
              setNewFileType("tsx")
              setIsCreateDialogOpen(true)
            }}>
              <Plus className="mr-2 h-4 w-4" />
              New File
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        {node.type === "folder" && node.expanded && node.children.map((child) => renderFileNode(child, depth + 1))}
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Select a project to view files</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <h3 className="text-sm font-semibold flex items-center">
          <Folder className="w-4 h-4 mr-2" />
          Files
        </h3>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="h-8 w-8 p-0"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="mb-2">
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      )}

      {/* File Tree Container - Fixed height with scrolling */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto overflow-x-hidden">
          {files.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No files yet</p>
              <p className="text-xs">Create your first file to get started</p>
            </div>
          ) : (
            <div className="p-2">
              {fileTree.map((node) => renderFileNode(node))}
            </div>
          )}
        </div>
      </div>

      {/* Create File Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newFileType === "folder" ? "Create New Folder" : "Create New File"}
            </DialogTitle>
            <DialogDescription>
              {newFileType === "folder" 
                ? "Add a new folder to your project." 
                : "Add a new file to your project."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileName">
                {newFileType === "folder" ? "Folder Name" : "File Name"}
              </Label>
              <Input
                id="fileName"
                placeholder={
                  newFileType === "folder" 
                    ? "my-folder" 
                    : newFileType === "tsx" || newFileType === "jsx"
                    ? "MyComponent"
                    : newFileType === "css" || newFileType === "scss" || newFileType === "sass"
                    ? "styles"
                    : newFileType === "json"
                    ? "config"
                    : newFileType === "md"
                    ? "README"
                    : newFileType === "html"
                    ? "index"
                    : newFileType === "py"
                    ? "main"
                    : newFileType === "java"
                    ? "Main"
                    : newFileType === "sh"
                    ? "script"
                    : newFileType === "sql"
                    ? "database"
                    : newFileType === "env"
                    ? ".env"
                    : newFileType === "gitignore"
                    ? ".gitignore"
                    : "filename"
                }
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fileType">File Type</Label>
              <Select value={newFileType} onValueChange={setNewFileType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="folder">📁 Folder</SelectItem>
                  <SelectItem value="tsx">⚛️ React Component (.tsx)</SelectItem>
                  <SelectItem value="jsx">⚛️ React Component (.jsx)</SelectItem>
                  <SelectItem value="ts">🔷 TypeScript (.ts)</SelectItem>
                  <SelectItem value="js">🟨 JavaScript (.js)</SelectItem>
                  <SelectItem value="css">🎨 CSS (.css)</SelectItem>
                  <SelectItem value="scss">🎨 SCSS (.scss)</SelectItem>
                  <SelectItem value="sass">🎨 Sass (.sass)</SelectItem>
                  <SelectItem value="json">📄 JSON (.json)</SelectItem>
                  <SelectItem value="md">📝 Markdown (.md)</SelectItem>
                  <SelectItem value="html">🌐 HTML (.html)</SelectItem>
                  <SelectItem value="xml">📝 XML (.xml)</SelectItem>
                  <SelectItem value="yml">⚙️ YAML (.yml)</SelectItem>
                  <SelectItem value="yaml">⚙️ YAML (.yaml)</SelectItem>
                  <SelectItem value="env">⚙️ Environment (.env)</SelectItem>
                  <SelectItem value="gitignore">🔒 Git Ignore (.gitignore)</SelectItem>
                  <SelectItem value="py">🐍 Python (.py)</SelectItem>
                  <SelectItem value="java">☕ Java (.java)</SelectItem>
                  <SelectItem value="cpp">🔧 C++ (.cpp)</SelectItem>
                  <SelectItem value="c">🔧 C (.c)</SelectItem>
                  <SelectItem value="php">🐘 PHP (.php)</SelectItem>
                  <SelectItem value="rb">💎 Ruby (.rb)</SelectItem>
                  <SelectItem value="go">🐹 Go (.go)</SelectItem>
                  <SelectItem value="rs">⚡ Rust (.rs)</SelectItem>
                  <SelectItem value="sh">🐚 Shell Script (.sh)</SelectItem>
                  <SelectItem value="bat">🪟 Batch (.bat)</SelectItem>
                  <SelectItem value="ps1">🔷 PowerShell (.ps1)</SelectItem>
                  <SelectItem value="sql">🗃️ SQL (.sql)</SelectItem>
                  <SelectItem value="txt">📄 Text (.txt)</SelectItem>
                  <SelectItem value="log">📊 Log (.log)</SelectItem>
                  <SelectItem value="conf">⚙️ Config (.conf)</SelectItem>
                  <SelectItem value="ini">⚙️ INI (.ini)</SelectItem>
                  <SelectItem value="toml">⚙️ TOML (.toml)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateFile} disabled={!newFileName.trim() || isCreating}>
              {isCreating 
                ? "Creating..." 
                : newFileType === "folder" 
                  ? "Create Folder" 
                  : "Create File"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
