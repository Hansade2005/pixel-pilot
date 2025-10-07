'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Upload,
  Download,
  Trash2,
  Image as ImageIcon,
  FileText,
  Film,
  Music,
  File,
  Search,
  Loader2,
  HardDrive,
  X,
} from 'lucide-react';

interface StorageFile {
  id: string;
  name: string;
  original_name: string;
  size_bytes: number;
  mime_type: string;
  is_public: boolean;
  created_at: string;
  url: string;
}

interface StorageBucket {
  id: string;
  name: string;
  size_limit_bytes: number;
  current_usage_bytes: number;
  is_public: boolean;
  created_at: string;
}

interface StorageStats {
  file_count: number;
  usage_percentage: number;
  available_bytes: number;
}

interface StorageManagerProps {
  databaseId: string;
}

export default function StorageManager({ databaseId }: StorageManagerProps) {
  const [bucket, setBucket] = useState<StorageBucket | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);

  useEffect(() => {
    fetchStorageData();
  }, [databaseId]);

  const fetchStorageData = async () => {
    try {
      const response = await fetch(`/api/database/${databaseId}/storage`);
      if (!response.ok) throw new Error('Failed to fetch storage data');

      const data = await response.json();
      setBucket(data.bucket);
      setStats(data.stats);
      
      // Fetch all files
      const filesResponse = await fetch(`/api/database/${databaseId}/storage/files?limit=100`);
      if (filesResponse.ok) {
        const filesData = await filesResponse.json();
        setFiles(filesData.files || []);
      }
    } catch (error) {
      console.error('Error fetching storage:', error);
      toast.error('Failed to load storage data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setShowUploadDialog(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('is_public', isPublic.toString());

      const response = await fetch(`/api/database/${databaseId}/storage/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      toast.success('File uploaded successfully!');
      setShowUploadDialog(false);
      setSelectedFile(null);
      fetchStorageData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      const response = await fetch(`/api/database/${databaseId}/storage/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete file');

      toast.success('File deleted successfully');
      fetchStorageData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (mimeType.startsWith('video/')) return <Film className="h-5 w-5" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5" />;
    if (mimeType === 'application/pdf') return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  const filteredFiles = files.filter(file =>
    file.original_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Storage</h2>
          <p className="text-gray-400 mt-1">
            Manage files and media for your database
          </p>
        </div>
        <Button
          onClick={() => document.getElementById('file-upload')?.click()}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload File
        </Button>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Storage Usage */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-blue-400" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                {formatBytes(bucket?.current_usage_bytes || 0)} / {formatBytes(bucket?.size_limit_bytes || 0)}
              </span>
              <span className="text-white font-medium">
                {stats?.usage_percentage.toFixed(1)}% used
              </span>
            </div>
            <Progress 
              value={stats?.usage_percentage || 0} 
              className="h-2"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
            <div>
              <div className="text-gray-400 text-xs mb-1">Files</div>
              <div className="text-white text-2xl font-bold">{stats?.file_count || 0}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Available</div>
              <div className="text-white text-2xl font-bold">
                {formatBytes(stats?.available_bytes || 0)}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Limit</div>
              <div className="text-white text-2xl font-bold">500 MB</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-gray-800 border-gray-700 text-white"
        />
      </div>

      {/* Files Grid */}
      {filteredFiles.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <HardDrive className="h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {searchQuery ? 'No files found' : 'No files yet'}
            </h3>
            <p className="text-gray-400 mb-4 max-w-md">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Upload your first file to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => document.getElementById('file-upload')?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="bg-gray-800 border-gray-700 overflow-hidden">
              {/* File Preview */}
              <div 
                className="h-48 bg-gray-900 flex items-center justify-center cursor-pointer hover:bg-gray-850 transition-colors"
                onClick={() => setPreviewFile(file)}
              >
                {isImage(file.mime_type) ? (
                  <img
                    src={file.url}
                    alt={file.original_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-500">
                    {getFileIcon(file.mime_type)}
                  </div>
                )}
              </div>

              {/* File Info */}
              <CardContent className="p-4 space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-white font-medium text-sm truncate flex-1">
                      {file.original_name}
                    </h4>
                    <Badge
                      variant={file.is_public ? 'default' : 'secondary'}
                      className="text-xs shrink-0"
                    >
                      {file.is_public ? 'Public' : 'Private'}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    {formatBytes(file.size_bytes)} • {new Date(file.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-gray-700 text-white hover:bg-gray-700"
                    onClick={() => window.open(file.url, '_blank')}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirm(file.id)}
                    className="border-red-900 text-red-400 hover:bg-red-950"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Upload File</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedFile && `Selected: ${selectedFile.name} (${formatBytes(selectedFile.size)})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is-public"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-gray-700"
              />
              <label htmlFor="is-public" className="text-white text-sm">
                Make file publicly accessible
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                setSelectedFile(null);
              }}
              className="border-gray-700 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-gray-800 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete File?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently delete the file. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-white hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Preview Dialog */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-white">{previewFile.original_name}</DialogTitle>
              <DialogDescription className="text-gray-400">
                {formatBytes(previewFile.size_bytes)} • {previewFile.mime_type}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-auto">
              {isImage(previewFile.mime_type) ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.original_name}
                  className="w-full h-auto rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  {getFileIcon(previewFile.mime_type)}
                  <p className="mt-4">Preview not available for this file type</p>
                  <Button
                    className="mt-4"
                    onClick={() => window.open(previewFile.url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
