"use client";

import React from 'react';
import { X, FileText, Folder, Code, Image, FileIcon } from 'lucide-react';
import { FileSearchResult } from '@/lib/file-lookup-service';

interface FileAttachmentBadgeProps {
  file: FileSearchResult;
  onRemove: () => void;
  className?: string;
}

const getFileIcon = (extension: string, isDirectory: boolean) => {
  if (isDirectory) {
    return <Folder className="w-3 h-3 text-blue-400" />;
  }

  const ext = extension.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
    case 'jsx':
    case 'js':
      return <Code className="w-3 h-3 text-blue-400" />;
    case 'css':
    case 'scss':
    case 'sass':
      return <FileText className="w-3 h-3 text-pink-400" />;
    case 'html':
    case 'htm':
      return <FileText className="w-3 h-3 text-orange-400" />;
    case 'json':
      return <FileText className="w-3 h-3 text-yellow-400" />;
    case 'md':
    case 'mdx':
      return <FileText className="w-3 h-3 text-gray-400" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <Image className="w-3 h-3 text-green-400" />;
    default:
      return <FileIcon className="w-3 h-3 text-gray-400" />;
  }
};

export function FileAttachmentBadge({ file, onRemove, className = '' }: FileAttachmentBadgeProps) {
  const displayName = file.name.length > 20 ? `${file.name.substring(0, 17)}...` : file.name;
  
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded-md text-xs text-blue-300 hover:bg-blue-600/30 transition-colors ${className}`}
      title={`${file.path} (${file.extension ? '.' + file.extension : 'folder'})`}
    >
      <div className="flex-shrink-0">
        {getFileIcon(file.extension, file.isDirectory)}
      </div>
      
      <span className="font-medium truncate max-w-[120px]">
        @{displayName}
      </span>
      
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-0.5 hover:bg-blue-500/30 rounded transition-colors"
        title="Remove attachment"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
