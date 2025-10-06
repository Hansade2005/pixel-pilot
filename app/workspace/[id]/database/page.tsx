'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getCurrentWorkspace, setWorkspaceDatabase } from '@/lib/get-current-workspace';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Plus, AlertCircle, Loader2, Table as TableIcon, Sparkles, Code } from 'lucide-react';
import { toast } from 'sonner';
import { CreateTableDialog } from '@/components/database/create-table-dialog';
import { TableDetailsView } from '@/components/database/table-details-view';
import { EditTableDialog } from '@/components/database/edit-table-dialog';
import { DeleteTableDialog } from '@/components/database/delete-table-dialog';
import { AISchemaGenerator } from '@/components/database/ai-schema-generator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Table } from '@/lib/supabase';

interface DatabaseData {
  id: number;
  name: string;
  project_id: string;
  created_at: string;
}

interface TableWithCount extends Table {
  recordCount: number;
}

export default function DatabasePage() {
  const params = useParams();
  const [workspace, setWorkspace] = useState<any>(null);
  const [database, setDatabase] = useState<DatabaseData | null>(null);
  const [tables, setTables] = useState<TableWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingTable, setEditingTable] = useState<TableWithCount | null>(null);
  const [deletingTable, setDeletingTable] = useState<TableWithCount | null>(null);
  const [showAISchemaGenerator, setShowAISchemaGenerator] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Get current workspace
      const ws = await getCurrentWorkspace();
      if (!ws) {
        toast.error('Workspace not found');
        return;
      }
      setWorkspace(ws);

      // Check if database exists
      if (ws.databaseId) {
        await loadDatabase(ws.databaseId);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load database');
    } finally {
      setLoading(false);
    }
  }

  async function loadDatabase(databaseId: number) {
    try {
      const response = await fetch(`/api/database/${databaseId}`);
      const data = await response.json();

      if (data.success) {
        setDatabase(data.database);
        // Transform tables to match our interface
        const transformedTables = (data.tables || []).map((table: any) => ({
          ...table,
          recordCount: table.record_count || 0,
        }));
        setTables(transformedTables);
      } else {
        console.error('Failed to load database:', data.error);
      }
    } catch (error) {
      console.error('Error fetching database:', error);
    }
  }

  async function createDatabase() {
    if (!workspace) return;

    try {
      setCreating(true);

      const response = await fetch('/api/database/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: workspace.id,
          name: `${workspace.name}_db`
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Database created successfully!');
        
        // Update workspace in IndexedDB
        await setWorkspaceDatabase(workspace.id, data.database.id);
        
        // Reload data
        await loadData();
      } else {
        toast.error(data.error || 'Failed to create database');
      }
    } catch (error) {
      console.error('Error creating database:', error);
      toast.error('Failed to create database');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Workspace Not Found
            </CardTitle>
            <CardDescription>
              Unable to load workspace. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!database) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Database className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Create Database</CardTitle>
            <CardDescription>
              Set up a database for <strong>{workspace.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-medium">What you'll get:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>A fully functional database with authentication</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Auto-generated users table for login/signup</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Visual table builder with AI assistance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>REST API endpoints for your app</span>
                </li>
              </ul>
            </div>

            <Button 
              onClick={createDatabase} 
              disabled={creating}
              className="w-full"
              size="lg"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Database...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Create Database
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">{database.name}</h1>
        <p className="text-muted-foreground">
          Manage tables and records for {workspace.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tables</CardTitle>
            <TableIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tables.length}</div>
            <p className="text-xs text-muted-foreground">
              {tables.length === 1 ? 'table' : 'tables'} created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tables.reduce((sum, table) => sum + table.recordCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              across all tables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {new Date(database.created_at).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(database.created_at).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tables List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Tables</h2>
            <p className="text-muted-foreground">
              Manage your database tables and schemas
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/workspace/${params.id}/database/sql`}>
              <Button variant="outline" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                SQL Panel
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setShowAISchemaGenerator(true)}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </Button>
            <CreateTableDialog
              databaseId={database.id.toString()}
              onSuccess={() => loadDatabase(database.id)}
            />
          </div>
        </div>

        {tables.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <TableIcon className="mx-auto h-12 w-12 mb-4 opacity-20" />
              <p className="text-muted-foreground mb-4">
                No tables yet. Create your first table to get started.
              </p>
              <CreateTableDialog
                databaseId={database.id.toString()}
                onSuccess={() => loadDatabase(database.id)}
              >
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Table
                </Button>
              </CreateTableDialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tables.map((table) => (
              <TableDetailsView
                key={table.id}
                table={table}
                onEdit={() => setEditingTable(table)}
                onDelete={() => setDeletingTable(table)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Table Dialog */}
      {editingTable && (
        <EditTableDialog
          table={editingTable}
          databaseId={database.id.toString()}
          open={!!editingTable}
          onOpenChange={(open) => !open && setEditingTable(null)}
          onSuccess={() => {
            loadDatabase(database.id);
            setEditingTable(null);
          }}
        />
      )}

      {/* Delete Table Dialog */}
      {deletingTable && (
        <DeleteTableDialog
          table={deletingTable}
          databaseId={database.id.toString()}
          open={!!deletingTable}
          onOpenChange={(open) => !open && setDeletingTable(null)}
          onSuccess={() => {
            loadDatabase(database.id);
            setDeletingTable(null);
          }}
        />
      )}

      {/* AI Schema Generator Dialog */}
      <Dialog open={showAISchemaGenerator} onOpenChange={setShowAISchemaGenerator}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Table Schema with AI</DialogTitle>
          </DialogHeader>
          <AISchemaGenerator
            workspaceId={workspace.id}
            databaseId={database.id.toString()}
            onSchemaGenerated={(schema) => {
              console.log('Schema generated:', schema);
            }}
            onCreateTable={async (schema) => {
              try {
                // Convert AI schema to table creation format
                const tableData = {
                  name: schema.tableName,
                  schema: schema.columns.reduce((acc, col) => {
                    acc[col.name] = {
                      type: col.type,
                      required: col.required,
                      defaultValue: col.defaultValue,
                      unique: col.unique,
                      description: col.description
                    };
                    return acc;
                  }, {} as any)
                };

                // Create the table
                const response = await fetch(`/api/database/${database.id}/tables`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(tableData)
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to create table');
                }

                toast.success(`Table "${schema.tableName}" created successfully!`);
                setShowAISchemaGenerator(false);
                await loadDatabase(database.id);
              } catch (error) {
                console.error('Error creating table from AI schema:', error);
                toast.error(error instanceof Error ? error.message : 'Failed to create table');
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
