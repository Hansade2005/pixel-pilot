'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
import { Copy, Key, Trash2, Plus, Eye, EyeOff, AlertTriangle, TrendingUp, Database } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  rate_limit: number;
  is_active: boolean;
  usage?: {
    last_hour: number;
    total: number;
  };
}

interface ApiKeysManagerProps {
  databaseId: string;
}

interface TableInfo {
  id: string;
  name: string;
}

export default function ApiKeysManager({ databaseId }: ApiKeysManagerProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetchApiKeys();
    fetchTables();
  }, [databaseId]);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch(`/api/database/${databaseId}/api-keys`);
      if (!response.ok) throw new Error('Failed to fetch API keys');
      
      const data = await response.json();
      setApiKeys(data.api_keys || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const response = await fetch(`/api/database/${databaseId}`);
      if (!response.ok) throw new Error('Failed to fetch tables');
      
      const data = await response.json();
      if (data.success && data.tables) {
        setTables(data.tables.map((table: any) => ({
          id: table.id,
          name: table.name,
        })));
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/database/${databaseId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create API key');
      }

      const data = await response.json();
      setCreatedKey(data.api_key.key);
      setShowCreateDialog(false);
      setShowKeyDialog(true);
      setNewKeyName('');
      fetchApiKeys();
      toast.success('API key created successfully!');
    } catch (error: any) {
      console.error('Error creating API key:', error);
      toast.error(error.message || 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/database/${databaseId}/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete API key');

      toast.success('API key revoked successfully');
      fetchApiKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Failed to revoke API key');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">API Keys</h2>
          <p className="text-gray-400 mt-1">
            Manage API keys for external application access
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2"
          disabled={apiKeys.length >= 10}
        >
          <Plus className="h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {/* Database & Table IDs */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-400" />
            Database & Table IDs
          </CardTitle>
          <CardDescription className="text-gray-400">
            Use these IDs in your API requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Database ID */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-300">Database ID</Label>
            <div className="flex items-center gap-2">
              <Input
                value={databaseId}
                readOnly
                className="bg-gray-900/50 border-gray-700 text-white font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(databaseId)}
                className="border-gray-700 hover:bg-gray-700 shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Table IDs */}
          {tables.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-300">Table IDs</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tables.map((table) => (
                  <div key={table.id} className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-gray-400 text-sm truncate max-w-[120px]">
                          {table.name}
                        </span>
                        <span className="text-white font-mono text-xs">
                          {table.id}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(table.id)}
                      className="border-gray-700 hover:bg-gray-700 shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Keys List */}
      <div className="grid gap-4">
        {apiKeys.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="h-12 w-12 text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No API keys yet</h3>
              <p className="text-gray-400 mb-4 max-w-md">
                Create your first API key to enable external applications to access your database
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((key) => (
            <Card key={key.id} className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Key className="h-5 w-5 text-blue-400" />
                      {key.name}
                    </CardTitle>
                    <CardDescription className="text-gray-400 mt-2 font-mono text-sm">
                      {key.key_prefix}••••••••••••••••••••••••••••
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirm(key.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Usage Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1">Last Hour</div>
                    <div className="text-white text-lg font-semibold flex items-center gap-2">
                      {key.usage?.last_hour || 0}
                      <span className="text-gray-500 text-xs">/ {key.rate_limit}</span>
                    </div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1">Total Requests</div>
                    <div className="text-white text-lg font-semibold flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                      {key.usage?.total || 0}
                    </div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1">Status</div>
                    <Badge
                      variant={key.is_active ? 'default' : 'secondary'}
                      className={key.is_active ? 'bg-green-600' : 'bg-gray-600'}
                    >
                      {key.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-sm border-t border-gray-700 pt-4">
                  <div className="text-gray-400">
                    Created: <span className="text-white">{formatDate(key.created_at)}</span>
                  </div>
                  <div className="text-gray-400">
                    Last used: <span className="text-white">{formatDate(key.last_used_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Usage Example */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Usage Example</CardTitle>
          <CardDescription className="text-gray-400">
            Use your API key to access the database from external applications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto">
            <div className="text-green-400">// JavaScript / TypeScript</div>
            <div className="mt-2">
              <span className="text-purple-400">const</span> response = <span className="text-purple-400">await</span>{' '}
              <span className="text-blue-400">fetch</span>(
            </div>
            <div className="ml-4 text-orange-300 break-all">
              'https://pipilot.dev/api/v1/databases/{databaseId}/tables/{tables.length > 0 ? tables[0].id : 'TABLE_ID'}/records',
            </div>
            <div className="ml-4">{'{'}</div>
            <div className="ml-8">
              headers: {'{'}
            </div>
            <div className="ml-12">
              <span className="text-orange-300">'Authorization'</span>:{' '}
              <span className="text-orange-300">'Bearer YOUR_API_KEY'</span>,
            </div>
            <div className="ml-12">
              <span className="text-orange-300">'Content-Type'</span>:{' '}
              <span className="text-orange-300">'application/json'</span>
            </div>
            <div className="ml-8">{'}'},</div>
            <div className="ml-4">{'}'}</div>
            <div>);</div>
            <div className="mt-2">
              <span className="text-purple-400">const</span> data = <span className="text-purple-400">await</span> response.
              <span className="text-blue-400">json</span>();
            </div>
          </div>
          
          {tables.length > 0 && (
            <div className="bg-blue-950/30 border border-blue-900 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                💡 <span className="font-semibold">Tip:</span> Replace <code className="bg-blue-950 px-1 py-0.5 rounded">YOUR_API_KEY</code> with your actual API key from above, and use the table IDs shown in the "Table IDs" section.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create API Key</DialogTitle>
            <DialogDescription className="text-gray-400">
              Give your API key a descriptive name to remember what it's used for
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name" className="text-white">
                Key Name
              </Label>
              <Input
                id="key-name"
                placeholder="e.g., Production App, Mobile App, etc."
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="border-gray-700 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={creating}>
              {creating ? 'Creating...' : 'Create Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Created Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Save Your API Key
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              This is the only time you'll see this key. Copy it now and store it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Your API Key</Label>
              <div className="flex gap-2">
                <Input
                  value={createdKey}
                  readOnly
                  type={showKey ? 'text' : 'password'}
                  className="bg-gray-900 border-gray-700 text-white font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                  className="border-gray-700"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(createdKey)}
                  className="border-gray-700"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowKeyDialog(false)}>I've Saved It</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-gray-800 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently revoke the API key. Any applications using this key will immediately lose access.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-white hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteKey(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
