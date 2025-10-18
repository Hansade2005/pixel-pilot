"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Folder, Code, Image, FileIcon, X, Search } from 'lucide-react';
import { FileSearchResult, fileLookupService } from '@/lib/file-lookup-service';

interface FileAttachmentDropdownProps {
  isVisible: boolean;
  query: string;
  onFileSelect: (file: FileSearchResult) => void;
  onClose: () => void;
  position: { top: number; left: number };
  projectId: string | null;
}

const getFileIcon = (extension: string, isDirectory: boolean) => {
  if (isDirectory) {
    return <Folder className="w-4 h-4 text-blue-500" />;
  }

  const ext = extension.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
    case 'jsx':
    case 'js':
      return <Code className="w-4 h-4 text-blue-400" />;
    case 'css':
    case 'scss':
    case 'sass':
      return <FileText className="w-4 h-4 text-pink-400" />;
    case 'html':
    case 'htm':
      return <FileText className="w-4 h-4 text-orange-400" />;
    case 'json':
      return <FileText className="w-4 h-4 text-yellow-400" />;
    case 'md':
    case 'mdx':
      return <FileText className="w-4 h-4 text-gray-400" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <Image className="w-4 h-4 text-green-400" />;
    default:
      return <FileIcon className="w-4 h-4 text-gray-500" />;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function FileAttachmentDropdown({
  isVisible,
  query,
  onFileSelect,
  onClose,
  position,
  projectId,
}: FileAttachmentDropdownProps) {
  const [files, setFiles] = useState<FileSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize file lookup service when project changes
  useEffect(() => {
    const initializeService = async () => {
      if (!projectId) return;
      
      setIsLoading(true);
      try {
        await fileLookupService.initialize(projectId);
        await searchFiles(query);
      } catch (error) {
        console.error('Error initializing file lookup service:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeService();
  }, [projectId]);

  // Search files when query changes
  const searchFiles = useCallback(async (searchQuery: string) => {
    if (!projectId) {
      setFiles([]);
      return;
    }

    try {
      // Check if files are stale and refresh if needed
      if (fileLookupService.isStale()) {
        console.log('[FileAttachmentDropdown] Files appear stale, force refreshing...');
        await fileLookupService.forceRefresh();
      }
      
      const results = fileLookupService.searchFiles(searchQuery, 8);
      setFiles(results);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Error searching files:', error);
      setFiles([]);
    }
  }, [projectId]);

  useEffect(() => {
    if (isVisible) {
      // Always refresh when dropdown opens to show latest files
      const refreshAndSearch = async () => {
        if (projectId) {
          await fileLookupService.forceRefresh();
        }
        await searchFiles(query);
      };
      refreshAndSearch();
    }
  }, [query, isVisible, searchFiles, projectId]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || files.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % files.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + files.length) % files.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (files[selectedIndex]) {
            onFileSelect(files[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, files, selectedIndex, onFileSelect, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (dropdownRef.current && files.length > 0) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex, files.length]);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50"
      style={{
        top: position.top,
        left: position.left,
        minWidth: '320px',
        maxWidth: '480px',
      }}
    >
      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-700 border-b border-gray-600">
          <Search className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-200">
            Attach files {query && `matching "${query}"`}
          </span>
          <button
            onClick={onClose}
            className="ml-auto p-1 hover:bg-gray-600 rounded transition-colors"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="px-3 py-4 text-center">
            <div className="animate-spin w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full mx-auto mb-2" />
            <p className="text-sm text-gray-400">Loading files...</p>
          </div>
        )}

        {/* File list */}
        {!isLoading && (
          <div
            ref={dropdownRef}
            className="max-h-64 overflow-y-auto"
          >
            {files.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <FileIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  {query ? `No files found matching "${query}"` : 'No files available'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Try a different search term
                </p>
              </div>
            ) : (
              files.map((file, index) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-200 hover:bg-gray-700'
                  }`}
                  onClick={() => onFileSelect(file)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex-shrink-0">
                    {getFileIcon(file.extension, file.isDirectory)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {file.name}
                      </span>
                      {file.extension && !file.isDirectory && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          index === selectedIndex
                            ? 'bg-blue-500 text-blue-100'
                            : 'bg-gray-600 text-gray-300'
                        }`}>
                          .{file.extension}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs truncate ${
                        index === selectedIndex ? 'text-blue-100' : 'text-gray-400'
                      }`}>
                        {file.path}
                      </span>
                      
                      {!file.isDirectory && file.size > 0 && (
                        <>
                          <span className={`text-xs ${
                            index === selectedIndex ? 'text-blue-200' : 'text-gray-500'
                          }`}>
                            •
                          </span>
                          <span className={`text-xs ${
                            index === selectedIndex ? 'text-blue-200' : 'text-gray-500'
                          }`}>
                            {formatFileSize(file.size)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Match score indicator (for debugging, can be removed) */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className={`text-xs px-1 ${
                      index === selectedIndex ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {Math.round(file.matchScore)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer with keyboard shortcuts */}
        <div className="px-3 py-2 bg-gray-700 border-t border-gray-600">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              {files.length > 0 && `${files.length} file${files.length !== 1 ? 's' : ''}`}
            </span>
            <div className="flex items-center gap-3">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
