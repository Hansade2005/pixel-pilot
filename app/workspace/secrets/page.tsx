"use client"

import React, { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  KeyRound,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  Upload,
  Cloud,
  AlertTriangle,
  Shield,
  Copy,
  CheckCircle,
  Clock,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Secret {
  id: string
  project_id: string
  key: string
  environment: string
  description: string | null
  last_synced_at: string | null
  sync_targets: any[]
  created_at: string
  updated_at: string
}

const ENV_OPTIONS = [
  { value: 'all', label: 'All Environments', color: 'bg-orange-500/10 text-orange-400' },
  { value: 'production', label: 'Production', color: 'bg-red-500/10 text-red-400' },
  { value: 'preview', label: 'Preview', color: 'bg-blue-500/10 text-blue-400' },
  { value: 'development', label: 'Development', color: 'bg-emerald-500/10 text-emerald-400' },
]

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function SecretsManagerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    }>
      <SecretsManagerContent />
    </Suspense>
  )
}

function SecretsManagerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const projectName = searchParams.get('name') || 'Project'

  const [secrets, setSecrets] = useState<Secret[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({})
  const [revealingId, setRevealingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number; failed?: any[] } | null>(null)

  // Form state
  const [formKey, setFormKey] = useState('')
  const [formValue, setFormValue] = useState('')
  const [formEnv, setFormEnv] = useState('all')
  const [formDesc, setFormDesc] = useState('')
  const [showFormValue, setShowFormValue] = useState(false)

  const getSession = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }, [])

  const fetchSecrets = useCallback(async () => {
    if (!projectId) return
    try {
      const session = await getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch(`/api/secrets?projectId=${projectId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setSecrets(json.secrets || [])
      }
    } catch (err) {
      console.error('Failed to fetch secrets:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId, router, getSession])

  useEffect(() => {
    fetchSecrets()
  }, [fetchSecrets])

  const handleCreate = async () => {
    if (!formKey.trim() || !formValue.trim()) return
    setSaving(true)
    try {
      const session = await getSession()
      if (!session) return

      const res = await fetch('/api/secrets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          key: formKey.toUpperCase().trim(),
          value: formValue,
          environment: formEnv,
          description: formDesc || undefined,
        }),
      })

      if (res.ok) {
        resetForm()
        fetchSecrets()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to create secret')
      }
    } catch (err) {
      console.error('Failed to create secret:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string) => {
    setSaving(true)
    try {
      const session = await getSession()
      if (!session) return

      const body: any = { id }
      if (formValue) body.value = formValue
      if (formDesc !== undefined) body.description = formDesc

      const res = await fetch('/api/secrets', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        resetForm()
        fetchSecrets()
      }
    } catch (err) {
      console.error('Failed to update secret:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const session = await getSession()
      if (!session) return

      await fetch(`/api/secrets?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      setSecrets(prev => prev.filter(s => s.id !== id))
      setRevealedValues(prev => { const n = { ...prev }; delete n[id]; return n })
    } catch (err) {
      console.error('Failed to delete secret:', err)
    }
  }

  const handleReveal = async (id: string) => {
    if (revealedValues[id]) {
      setRevealedValues(prev => { const n = { ...prev }; delete n[id]; return n })
      return
    }

    setRevealingId(id)
    try {
      const session = await getSession()
      if (!session) return

      const res = await fetch(`/api/secrets?revealId=${id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setRevealedValues(prev => ({ ...prev, [id]: json.value }))
      }
    } catch (err) {
      console.error('Failed to reveal secret:', err)
    } finally {
      setRevealingId(null)
    }
  }

  const handleCopy = async (id: string) => {
    const value = revealedValues[id]
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleImport = async () => {
    if (!importText.trim()) return
    setImporting(true)
    try {
      const session = await getSession()
      if (!session) return

      // Parse .env format
      const lines = importText.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
      let imported = 0

      for (const line of lines) {
        const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
        if (!match) continue

        const [, key, rawValue] = match
        const value = rawValue.replace(/^["']|["']$/g, '').trim()
        if (!value) continue

        const res = await fetch('/api/secrets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectId, key, value, environment: 'all' }),
        })
        if (res.ok) imported++
      }

      setShowImport(false)
      setImportText('')
      fetchSecrets()
      alert(`Imported ${imported} secrets`)
    } catch (err) {
      console.error('Import failed:', err)
    } finally {
      setImporting(false)
    }
  }

  const handleSyncVercel = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const session = await getSession()
      if (!session) return

      // Get Vercel token and project ID from IndexedDB storage
      const { storageManager } = await import('@/lib/storage-manager')
      const workspaces = await storageManager.getWorkspaces(session.user.id)
      const workspace = workspaces.find((w: any) => w.id === projectId)

      if (!workspace?.vercelProjectId) {
        alert('This project is not connected to Vercel. Deploy to Vercel first.')
        setSyncing(false)
        return
      }

      const tokenEntry = await storageManager.getToken(session.user.id, 'vercel')
      if (!tokenEntry?.token) {
        alert('No Vercel token found. Connect Vercel in Account settings first.')
        setSyncing(false)
        return
      }
      const token = tokenEntry

      const res = await fetch('/api/secrets/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          platform: 'vercel',
          vercelProjectId: workspace.vercelProjectId,
          vercelToken: token.token,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        setSyncResult(result)
        fetchSecrets() // Refresh to show updated sync timestamps
      } else {
        const err = await res.json()
        alert(err.error || 'Sync failed')
      }
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      setSyncing(false)
    }
  }

  const resetForm = () => {
    setFormKey('')
    setFormValue('')
    setFormEnv('all')
    setFormDesc('')
    setShowCreate(false)
    setEditingId(null)
    setShowFormValue(false)
  }

  const startEdit = (secret: Secret) => {
    setEditingId(secret.id)
    setFormKey(secret.key)
    setFormValue('')
    setFormEnv(secret.environment)
    setFormDesc(secret.description || '')
    setShowCreate(false)
  }

  const envBadge = (env: string) => {
    const opt = ENV_OPTIONS.find(e => e.value === env)
    return <Badge className={`text-[10px] border-0 ${opt?.color || 'bg-gray-500/10 text-gray-400'}`}>{opt?.label || env}</Badge>
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Card className="bg-gray-900 border-gray-800 max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-10 w-10 text-orange-500 mx-auto mb-3" />
            <p className="text-gray-300">No project selected. Open a project first.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-16">
      <Navigation />
      {/* Header */}
      <div className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-sm sticky top-16 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-orange-400" />
              <h1 className="text-lg font-semibold text-gray-100">Secrets Vault</h1>
              <Badge className="bg-gray-800 text-gray-400 border-0 text-[10px]">{projectName}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowImport(!showImport); setShowCreate(false) }}
              className="text-gray-300 border-gray-700 hover:border-orange-500/50 hover:text-orange-400 text-xs h-8"
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              Import .env
            </Button>
            <Button
              onClick={() => {
                setShowCreate(true)
                setEditingId(null)
                resetForm()
                setShowCreate(true)
              }}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Secret
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Security notice */}
        <div className="flex items-start gap-2.5 bg-orange-500/5 border border-orange-500/20 rounded-lg px-3.5 py-3">
          <Shield className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
          <div className="text-xs text-gray-400">
            <span className="text-orange-300 font-medium">Encrypted at rest.</span>{' '}
            Secrets are encrypted with AES-256-GCM before storage. Values are never logged or cached. Access is audit-logged.
          </div>
        </div>

        {/* Vercel Sync Bar */}
        {secrets.length > 0 && (
          <Card className="bg-gray-900/80 border-gray-800/60">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-gray-500" />
                <span className="text-xs text-gray-400">
                  {secrets.some(s => !s.last_synced_at)
                    ? `${secrets.filter(s => !s.last_synced_at).length} secret(s) not synced to deployment`
                    : 'All secrets synced'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {syncResult && (
                  <span className="text-xs text-emerald-400">
                    <CheckCircle className="h-3 w-3 inline mr-1" />
                    {syncResult.synced} synced
                    {syncResult.failed && syncResult.failed.length > 0 && (
                      <span className="text-red-400 ml-2">{syncResult.failed.length} failed</span>
                    )}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncVercel}
                  disabled={syncing}
                  className="text-gray-300 border-gray-700 hover:border-orange-500/50 hover:text-orange-400 text-xs h-7"
                >
                  {syncing ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Cloud className="h-3 w-3 mr-1" />
                  )}
                  Sync to Vercel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import .env Form */}
        {showImport && (
          <Card className="bg-gray-900/80 border-orange-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-200">Import from .env file</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`# Paste your .env contents here\nSTRIPE_SECRET_KEY=sk_live_...\nDATABASE_URL=postgres://...\nNEXT_PUBLIC_API_URL=https://...`}
                rows={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-xs font-mono px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 placeholder:text-gray-600"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setShowImport(false); setImportText('') }} className="text-gray-400 text-xs h-8">
                  <X className="h-3.5 w-3.5 mr-1" />Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={importing || !importText.trim()}
                  className="bg-orange-600 hover:bg-orange-500 text-white text-xs h-8 disabled:opacity-30"
                >
                  {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                  Import Secrets
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create / Edit Form */}
        {(showCreate || editingId) && (
          <Card className="bg-gray-900/80 border-orange-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-200">
                {editingId ? 'Update Secret' : 'Add New Secret'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-400">Key</Label>
                  <Input
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                    placeholder="STRIPE_SECRET_KEY"
                    disabled={!!editingId}
                    className="bg-gray-800 border-gray-700 text-gray-100 text-sm font-mono focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-400">Environment</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {ENV_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setFormEnv(opt.value)}
                        className={`px-2.5 py-1.5 rounded-md text-[11px] transition-all ${
                          formEnv === opt.value
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Value</Label>
                <div className="relative">
                  <Input
                    type={showFormValue ? 'text' : 'password'}
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder={editingId ? '(leave empty to keep current value)' : 'sk_live_...'}
                    className="bg-gray-800 border-gray-700 text-gray-100 text-sm font-mono pr-10 focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                  />
                  <button
                    onClick={() => setShowFormValue(!showFormValue)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-400"
                  >
                    {showFormValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Description (optional)</Label>
                <Input
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="What is this secret used for?"
                  className="bg-gray-800 border-gray-700 text-gray-100 text-sm focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={resetForm} className="text-gray-400 text-xs h-8">
                  <X className="h-3.5 w-3.5 mr-1" />Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                  disabled={saving || (!editingId && (!formKey.trim() || !formValue.trim()))}
                  className="bg-orange-600 hover:bg-orange-500 text-white text-xs h-8 disabled:opacity-30"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  {editingId ? 'Update Secret' : 'Add Secret'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Secrets List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : secrets.length === 0 ? (
          <Card className="bg-gray-900/80 border-gray-800/60">
            <CardContent className="py-10 text-center">
              <KeyRound className="h-10 w-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">No secrets stored yet</p>
              <p className="text-xs text-gray-600">Add API keys, database URLs, and other sensitive environment variables. They'll be encrypted and available for deployment sync.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {secrets.map((secret) => (
              <Card key={secret.id} className="bg-gray-900/80 border-gray-800/60 hover:border-orange-500/20 transition-all">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-orange-600/15 flex items-center justify-center text-orange-400 shrink-0">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-mono font-medium text-gray-200">{secret.key}</span>
                          {envBadge(secret.environment)}
                          {secret.last_synced_at && (
                            <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-0 gap-1">
                              <Cloud className="h-2.5 w-2.5" />synced
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {revealedValues[secret.id] ? (
                            <span className="text-xs font-mono text-gray-400 truncate max-w-[300px]">
                              {revealedValues[secret.id]}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600 font-mono">{'*'.repeat(24)}</span>
                          )}
                          {secret.description && (
                            <span className="text-[10px] text-gray-600 hidden sm:inline">- {secret.description}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-700 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {timeAgo(secret.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleReveal(secret.id)}
                        disabled={revealingId === secret.id}
                        className="h-7 w-7 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10"
                        title={revealedValues[secret.id] ? 'Hide value' : 'Reveal value'}
                      >
                        {revealingId === secret.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : revealedValues[secret.id] ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {revealedValues[secret.id] && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(secret.id)}
                          className="h-7 w-7 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10"
                          title="Copy value"
                        >
                          {copiedId === secret.id ? (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(secret)}
                        className="h-7 w-7 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10"
                        title="Edit secret"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(secret.id)}
                        className="h-7 w-7 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                        title="Delete secret"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer stats */}
        {secrets.length > 0 && (
          <div className="flex items-center justify-between text-[10px] text-gray-600 pt-2">
            <span>{secrets.length} secret{secrets.length !== 1 ? 's' : ''} stored</span>
            <span>{secrets.filter(s => s.last_synced_at).length} synced to deployment</span>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
