'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { migrationService } from '@/lib/migration-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Database, 
  HardDrive, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Upload,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { GlobalHeader } from '../../../components/workspace/global-header'

export default function MigrationPage() {
  const [user, setUser] = useState<any>(null)
  const [migrationStatus, setMigrationStatus] = useState<any>(null)
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrationProgress, setMigrationProgress] = useState(0)
  const [migrationResult, setMigrationResult] = useState<any>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        checkMigrationStatus(user.id)
      }
    }

    getUser()
  }, [])

  const checkMigrationStatus = async (userId: string) => {
    try {
      const status = await migrationService.checkMigrationStatus(userId)
      setMigrationStatus(status)
    } catch (error) {
      console.error('Error checking migration status:', error)
    }
  }

  const handleMigration = async () => {
    if (!user) return

    setIsMigrating(true)
    setMigrationProgress(0)
    setMigrationResult(null)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setMigrationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const result = await migrationService.migrateAllData(user.id)
      
      clearInterval(progressInterval)
      setMigrationProgress(100)
      setMigrationResult(result)
      
      // Refresh migration status
      await checkMigrationStatus(user.id)
      
    } catch (error) {
      console.error('Migration failed:', error)
    } finally {
      setIsMigrating(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = await migrationService.exportIndexedDBData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-app-builder-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsImporting(true)
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        await migrationService.importToIndexedDB(data)
        await checkMigrationStatus(user.id)
      } catch (error) {
        console.error('Import failed:', error)
      } finally {
        setIsImporting(false)
      }
    }
    input.click()
  }

  const handleClearIndexedDB = async () => {
    if (!confirm('Are you sure you want to clear all IndexedDB data? This action cannot be undone.')) {
      return
    }

    setIsClearing(true)
    try {
      await migrationService.clearIndexedDBData()
      await checkMigrationStatus(user.id)
    } catch (error) {
      console.error('Clear failed:', error)
    } finally {
      setIsClearing(false)
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col h-full">
        <GlobalHeader 
          title="Data Migration"
          showSettingsButton={false}
        />
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
                  <p className="text-gray-600">Please sign in to access the migration tools.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <GlobalHeader 
        title="Data Migration"
        showSettingsButton={false}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Data Migration</h1>
            <p className="text-gray-600">
              Migrate your workspace data from Supabase to IndexedDB for offline functionality
            </p>
          </div>

          {/* Migration Status */}
          {migrationStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Migration Status
                </CardTitle>
                <CardDescription>
                  Current state of your data in Supabase vs IndexedDB
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Supabase Data */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Supabase Data
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Workspaces:</span>
                        <Badge variant="outline">{migrationStatus.supabaseData.workspaces}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Files:</span>
                        <Badge variant="outline">{migrationStatus.supabaseData.files}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Chat Sessions:</span>
                        <Badge variant="outline">{migrationStatus.supabaseData.chatSessions}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Messages:</span>
                        <Badge variant="outline">{migrationStatus.supabaseData.messages}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* IndexedDB Data */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      IndexedDB Data
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Workspaces:</span>
                        <Badge variant="outline">{migrationStatus.indexedDBData.workspaces}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Files:</span>
                        <Badge variant="outline">{migrationStatus.indexedDBData.files}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Chat Sessions:</span>
                        <Badge variant="outline">{migrationStatus.indexedDBData.chatSessions}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Messages:</span>
                        <Badge variant="outline">{migrationStatus.indexedDBData.messages}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {migrationStatus.needsMigration && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Migration is needed. Some data exists in Supabase but not in IndexedDB.
                    </AlertDescription>
                  </Alert>
                )}

                {!migrationStatus.needsMigration && migrationStatus.supabaseData.workspaces > 0 && (
                  <Alert className="mt-4">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      All data has been migrated successfully!
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Migration Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Migration Actions</CardTitle>
              <CardDescription>
                Manage your data migration between Supabase and IndexedDB
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Migration Button */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Migrate from Supabase</h3>
                  <p className="text-sm text-gray-600">
                    Copy all your workspace data from Supabase to IndexedDB
                  </p>
                </div>
                <Button 
                  onClick={handleMigration} 
                  disabled={isMigrating || !migrationStatus?.needsMigration}
                  className="flex items-center gap-2"
                >
                  {isMigrating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Migrating...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4" />
                      Migrate
                    </>
                  )}
                </Button>
              </div>

              {/* Progress Bar */}
              {isMigrating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Migration Progress</span>
                    <span>{migrationProgress}%</span>
                  </div>
                  <Progress value={migrationProgress} className="w-full" />
                </div>
              )}

              <Separator />

              {/* Export/Import Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">Export IndexedDB Data</h3>
                    <p className="text-sm text-gray-600">
                      Download your IndexedDB data as a JSON file
                    </p>
                  </div>
                  <Button 
                    onClick={handleExport} 
                    disabled={isExporting}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Export
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">Import to IndexedDB</h3>
                    <p className="text-sm text-gray-600">
                      Import data from a JSON file to IndexedDB
                    </p>
                  </div>
                  <Button 
                    onClick={handleImport} 
                    disabled={isImporting}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Import
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Clear Data */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold text-red-600">Clear IndexedDB Data</h3>
                  <p className="text-sm text-gray-600">
                    Remove all data from IndexedDB (cannot be undone)
                  </p>
                </div>
                <Button 
                  onClick={handleClearIndexedDB} 
                  disabled={isClearing}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  {isClearing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Clear All
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Migration Result */}
          {migrationResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Migration Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{migrationResult.workspaces}</div>
                    <div className="text-sm text-gray-600">Workspaces</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{migrationResult.files}</div>
                    <div className="text-sm text-gray-600">Files</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{migrationResult.chatSessions}</div>
                    <div className="text-sm text-gray-600">Chat Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{migrationResult.messages}</div>
                    <div className="text-sm text-gray-600">Messages</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Information */}
          <Card>
            <CardHeader>
              <CardTitle>About the Migration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">What is being migrated?</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Workspaces (projects)</li>
                  <li>Files and folders</li>
                  <li>Chat sessions and messages</li>
                  <li>Deployment information</li>
                  <li>Environment variables</li>
                  <li>Templates</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">What happens after migration?</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Your data will be available offline</li>
                  <li>Faster access to your workspaces and files</li>
                  <li>Reduced dependency on external services</li>
                  <li>Authentication remains unchanged</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Important Notes</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Authentication data is not migrated and remains in Supabase</li>
                  <li>You can export your IndexedDB data as backup</li>
                  <li>Migration is one-way (Supabase to IndexedDB)</li>
                  <li>Original Supabase data remains intact</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

