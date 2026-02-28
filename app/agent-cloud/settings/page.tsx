"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Mail,
  Shield,
  Plug,
  Check,
  Eye,
  EyeOff,
  ArrowLeft,
  Server,
  Plus,
  Trash2,
  Key,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useAgentCloud, DEFAULT_MCPS, AGENT_CLOUD_BYOK_PROVIDERS, ConnectorConfig, CustomMcpServer } from "../layout"
import type { AgentCloudByokKey } from "@/lib/agent-cloud-storage"
import { usePageTitle } from '@/hooks/use-page-title'

export default function SettingsPage() {
  usePageTitle('Agent Cloud Settings')
  const router = useRouter()
  const { connectors, setConnectors, storedTokens, customMcpServers, setCustomMcpServers, byokEnabled, setByokEnabled, byokKeys, setByokKeys } = useAgentCloud()

  // Custom MCP form state
  const [showAddMcp, setShowAddMcp] = useState(false)
  const [newMcpName, setNewMcpName] = useState('')
  const [newMcpUrl, setNewMcpUrl] = useState('')
  const [newMcpHeaderKey, setNewMcpHeaderKey] = useState('')
  const [newMcpHeaderValue, setNewMcpHeaderValue] = useState('')

  const addCustomMcpServer = () => {
    if (!newMcpName.trim() || !newMcpUrl.trim()) return
    const headers: Record<string, string> = {}
    if (newMcpHeaderKey.trim() && newMcpHeaderValue.trim()) {
      headers[newMcpHeaderKey.trim()] = newMcpHeaderValue.trim()
    }
    setCustomMcpServers(prev => [...prev, {
      id: crypto.randomUUID(),
      name: newMcpName.trim(),
      url: newMcpUrl.trim(),
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    }])
    setNewMcpName('')
    setNewMcpUrl('')
    setNewMcpHeaderKey('')
    setNewMcpHeaderValue('')
    setShowAddMcp(false)
    toast.success(`Added custom MCP server: ${newMcpName.trim()}`)
  }

  const removeCustomMcpServer = (id: string) => {
    setCustomMcpServers(prev => prev.filter(s => s.id !== id))
    toast.success('Custom MCP server removed')
  }

  // BYOK form state
  const [showAddByok, setShowAddByok] = useState(false)
  const [newByokProvider, setNewByokProvider] = useState('')
  const [newByokKey, setNewByokKey] = useState('')

  // Mask API key for display
  const maskKey = (key: string) => {
    if (!key || key.length < 8) return '****'
    return key.slice(0, 4) + '****' + key.slice(-4)
  }

  const addByokKey = () => {
    if (!newByokProvider || !newByokKey.trim()) return

    const provider = AGENT_CLOUD_BYOK_PROVIDERS.find(p => p.id === newByokProvider)
    const newKey: AgentCloudByokKey = {
      providerId: newByokProvider,
      apiKey: newByokKey.trim(),
      enabled: true,
      label: provider?.name || newByokProvider,
      addedAt: new Date().toISOString(),
    }

    setByokKeys(prev => {
      // Replace if provider already exists, otherwise add
      const existing = prev.findIndex(k => k.providerId === newByokProvider)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = newKey
        return updated
      }
      return [...prev, newKey]
    })

    setNewByokProvider('')
    setNewByokKey('')
    setShowAddByok(false)
    setByokEnabled(true)
    toast.success(`Added ${provider?.name || newByokProvider} API key`)
  }

  const removeByokKey = (providerId: string) => {
    setByokKeys(prev => prev.filter(k => k.providerId !== providerId))
    toast.success('API key removed')
  }

  const toggleByokKey = (providerId: string) => {
    setByokKeys(prev => prev.map(k =>
      k.providerId === providerId ? { ...k, enabled: !k.enabled } : k
    ))
  }

  // Providers not yet added
  const availableProviders = AGENT_CLOUD_BYOK_PROVIDERS.filter(
    p => !byokKeys.some(k => k.providerId === p.id)
  )

  // User info
  const [userEmail, setUserEmail] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Track which password fields are visible
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set())

  // Load user info
  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserEmail(user.email || '')
          setUserName(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '')
        }
      } catch (e) {
        console.error('Failed to load user:', e)
      } finally {
        setIsLoadingUser(false)
      }
    }
    loadUser()
  }, [])

  // Toggle connector enabled state
  const toggleConnector = (id: string) => {
    setConnectors(prev => prev.map(c =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    ))
  }

  // Update a connector field value
  const updateField = (connectorId: string, fieldKey: string, value: string) => {
    setConnectors(prev => prev.map(c =>
      c.id === connectorId
        ? { ...c, fields: c.fields.map(f => f.key === fieldKey ? { ...f, value } : f) }
        : c
    ))
  }

  // Toggle field visibility
  const toggleFieldVisibility = (connectorId: string, fieldKey: string) => {
    const key = `${connectorId}-${fieldKey}`
    setVisibleFields(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Track if settings have changed (for visual feedback)
  const [isSaved, setIsSaved] = useState(false)

  // Show saved indicator briefly when connectors change
  useEffect(() => {
    // Skip the initial render
    const hasValues = connectors.some(c => c.enabled || c.fields.some(f => f.value))
    if (hasValues) {
      setIsSaved(true)
      const timer = setTimeout(() => setIsSaved(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [connectors])

  // Save and show toast
  const handleSave = () => {
    // Settings are auto-saved via layout's useEffect
    // This button just provides explicit confirmation
    setIsSaved(true)
    toast.success('Settings saved successfully')
    setTimeout(() => setIsSaved(false), 2000)
  }

  // Get enabled connector count
  const enabledCount = connectors.filter(c => c.enabled).length

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 pb-20">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/agent-cloud/new')}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-zinc-400" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Settings</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Manage your account and agent connectors</p>
          </div>
        </div>

        {/* User Info Section */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">Account</h2>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            {isLoadingUser ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-zinc-800 rounded w-1/3"></div>
                <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm text-zinc-300">{userName || 'Not set'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm text-zinc-300">{userEmail || 'Not set'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm text-zinc-300">
                    GitHub: {storedTokens.github ? (
                      <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20 ml-1">Connected</Badge>
                    ) : (
                      <Badge className="text-[10px] bg-zinc-800 text-zinc-500 border-zinc-700 ml-1">Not connected</Badge>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* BYOK Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">API Keys (BYOK)</h2>
              <p className="text-xs text-zinc-600 mt-0.5">Bring your own API keys to use your preferred AI providers</p>
            </div>
            <div className="flex items-center gap-2">
              {byokKeys.length > 0 && (
                <Badge className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/20">
                  {byokKeys.filter(k => k.enabled).length} active
                </Badge>
              )}
              {/* Global BYOK toggle */}
              {byokKeys.length > 0 && (
                <button
                  onClick={() => setByokEnabled(!byokEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                    byokEnabled ? 'bg-orange-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      byokEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                    }`}
                  />
                </button>
              )}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            {/* Existing BYOK keys */}
            {byokKeys.length > 0 ? (
              <div className="divide-y divide-zinc-800/50">
                {byokKeys.map(key => {
                  const provider = AGENT_CLOUD_BYOK_PROVIDERS.find(p => p.id === key.providerId)
                  const fieldId = `byok-${key.providerId}`
                  const isVisible = visibleFields.has(fieldId)
                  return (
                    <div key={key.providerId} className="px-4 py-3 hover:bg-zinc-800/30 transition-colors group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <Key className={`h-4 w-4 shrink-0 ${key.enabled && byokEnabled ? 'text-orange-400' : 'text-zinc-500'}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-200">{provider?.name || key.providerId}</span>
                              {key.enabled && byokEnabled && (
                                <Badge className="text-[9px] px-1.5 py-0 bg-green-500/10 text-green-400 border-green-500/20">Active</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[11px] text-zinc-500 font-mono">
                                {isVisible ? key.apiKey : maskKey(key.apiKey)}
                              </span>
                              <button
                                onClick={() => toggleFieldVisibility('byok', key.providerId)}
                                className="text-zinc-600 hover:text-zinc-400 p-0.5"
                              >
                                {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Per-key toggle */}
                          <button
                            onClick={() => toggleByokKey(key.providerId)}
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                              key.enabled ? 'bg-orange-500' : 'bg-zinc-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                key.enabled ? 'translate-x-[13px]' : 'translate-x-[2px]'
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => removeByokKey(key.providerId)}
                            className="p-1.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : !showAddByok ? (
              <div className="px-4 py-6 text-center">
                <Key className="h-5 w-5 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-600">No API keys added yet</p>
                <p className="text-[11px] text-zinc-700 mt-1">Add your own keys to bypass platform credits</p>
              </div>
            ) : null}

            {/* Add key form */}
            {showAddByok ? (
              <div className="p-4 border-t border-zinc-800/50 space-y-3">
                <div>
                  <label className="text-[11px] text-zinc-500 font-medium mb-1 block">Provider</label>
                  <select
                    value={newByokProvider}
                    onChange={(e) => setNewByokProvider(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                  >
                    <option value="" className="text-zinc-500">Select a provider...</option>
                    {availableProviders.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {p.description}</option>
                    ))}
                  </select>
                </div>
                {newByokProvider && (
                  <div>
                    <label className="text-[11px] text-zinc-500 font-medium mb-1 block">API Key</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={newByokKey}
                        onChange={(e) => setNewByokKey(e.target.value)}
                        placeholder={AGENT_CLOUD_BYOK_PROVIDERS.find(p => p.id === newByokProvider)?.placeholder || 'Enter API key...'}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={addByokKey}
                    disabled={!newByokProvider || !newByokKey.trim()}
                    className="bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm h-8 px-4"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Key
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowAddByok(false)
                      setNewByokProvider('')
                      setNewByokKey('')
                    }}
                    className="text-zinc-500 hover:text-zinc-300 text-sm h-8"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : availableProviders.length > 0 ? (
              <div className="p-3 border-t border-zinc-800/50">
                <button
                  onClick={() => setShowAddByok(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 border border-dashed border-zinc-700 hover:border-orange-500/30 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add API Key
                </button>
              </div>
            ) : null}
          </div>

          {byokEnabled && byokKeys.length > 0 && (
            <p className="text-[11px] text-zinc-600 mt-2">
              When BYOK is enabled, Agent Cloud will use your API keys directly instead of consuming platform credits. Keys are stored securely in your account.
            </p>
          )}
        </section>

        {/* Default MCPs Section */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">Default MCP Servers</h2>
          <p className="text-xs text-zinc-600 mb-3">These are always enabled and cannot be disabled</p>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEFAULT_MCPS.map(mcp => (
                <div key={mcp.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-800/30">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-zinc-200">{mcp.name}</span>
                  <span className="text-xs text-zinc-500">{mcp.description}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Custom MCP Servers Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Custom MCP Servers</h2>
              <p className="text-xs text-zinc-600 mt-0.5">Add your own HTTP streamable MCP servers</p>
            </div>
            {customMcpServers.length > 0 && (
              <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">
                {customMcpServers.length} added
              </Badge>
            )}
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            {/* Existing custom servers */}
            {customMcpServers.length > 0 ? (
              <div className="divide-y divide-zinc-800/50">
                {customMcpServers.map(server => (
                  <div key={server.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <Server className="h-4 w-4 text-green-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-zinc-200 block truncate">{server.name}</span>
                        <span className="text-[11px] text-zinc-500 block truncate">{server.url}</span>
                        {server.headers && Object.keys(server.headers).length > 0 && (
                          <span className="text-[10px] text-zinc-600 block">
                            Headers: {Object.keys(server.headers).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeCustomMcpServer(server.id)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : !showAddMcp ? (
              <div className="px-4 py-6 text-center">
                <Server className="h-5 w-5 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-600">No custom MCP servers added yet</p>
              </div>
            ) : null}

            {/* Add form */}
            {showAddMcp ? (
              <div className="p-4 border-t border-zinc-800/50 space-y-3">
                <div>
                  <label className="text-[11px] text-zinc-500 font-medium mb-1 block">Server Name</label>
                  <input
                    type="text"
                    value={newMcpName}
                    onChange={(e) => setNewMcpName(e.target.value)}
                    placeholder="My HTTP API"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 font-medium mb-1 block">Server URL</label>
                  <input
                    type="text"
                    value={newMcpUrl}
                    onChange={(e) => setNewMcpUrl(e.target.value)}
                    placeholder="https://your-server.com/mcp"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-500 font-medium mb-1 block">Header Key <span className="text-zinc-700">(optional)</span></label>
                    <input
                      type="text"
                      value={newMcpHeaderKey}
                      onChange={(e) => setNewMcpHeaderKey(e.target.value)}
                      placeholder="Authorization"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500 font-medium mb-1 block">Header Value <span className="text-zinc-700">(optional)</span></label>
                    <input
                      type="password"
                      value={newMcpHeaderValue}
                      onChange={(e) => setNewMcpHeaderValue(e.target.value)}
                      placeholder="Bearer sk-..."
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={addCustomMcpServer}
                    disabled={!newMcpName.trim() || !newMcpUrl.trim()}
                    className="bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm h-8 px-4"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Server
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowAddMcp(false)
                      setNewMcpName('')
                      setNewMcpUrl('')
                      setNewMcpHeaderKey('')
                      setNewMcpHeaderValue('')
                    }}
                    className="text-zinc-500 hover:text-zinc-300 text-sm h-8"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 border-t border-zinc-800/50">
                <button
                  onClick={() => setShowAddMcp(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 border border-dashed border-zinc-700 hover:border-orange-500/30 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Custom MCP Server
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Additional Connectors Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Additional Connectors</h2>
              <p className="text-xs text-zinc-600 mt-0.5">Extend agent capabilities with MCP servers and CLI tools</p>
            </div>
            {enabledCount > 0 && (
              <Badge className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/20">
                {enabledCount} enabled
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            {connectors.map(connector => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                onToggle={() => toggleConnector(connector.id)}
                onUpdateField={(fieldKey, value) => updateField(connector.id, fieldKey, value)}
                visibleFields={visibleFields}
                onToggleVisibility={(fieldKey) => toggleFieldVisibility(connector.id, fieldKey)}
              />
            ))}
          </div>
        </section>

        {/* Save button with visual feedback */}
        <div className="flex items-center justify-end gap-3">
          {isSaved && (
            <span className="text-sm text-green-400 flex items-center gap-1 animate-in fade-in duration-200">
              <Check className="h-4 w-4" />
              Saved
            </span>
          )}
          <Button
            onClick={handleSave}
            className={`rounded-xl px-6 transition-all duration-200 ${
              isSaved
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-orange-500 hover:bg-orange-600'
            } text-white`}
          >
            <Check className="h-4 w-4 mr-2" />
            {isSaved ? 'Saved!' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Connector card component
function ConnectorCard({
  connector,
  onToggle,
  onUpdateField,
  visibleFields,
  onToggleVisibility,
}: {
  connector: ConnectorConfig
  onToggle: () => void
  onUpdateField: (fieldKey: string, value: string) => void
  visibleFields: Set<string>
  onToggleVisibility: (fieldKey: string) => void
}) {
  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      connector.enabled ? 'border-orange-500/30 bg-orange-500/5' : 'border-zinc-800 bg-zinc-900/50'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Plug className={`h-4 w-4 ${connector.enabled ? 'text-orange-400' : 'text-zinc-500'}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-200">{connector.name}</span>
              <Badge className={`text-[9px] px-1.5 py-0 ${
                connector.type === 'mcp'
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>
                {connector.type === 'mcp' ? 'MCP' : 'CLI'}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{connector.description}</p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={onToggle}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
            connector.enabled ? 'bg-orange-500' : 'bg-zinc-700'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              connector.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
            }`}
          />
        </button>
      </div>

      {/* Config fields (shown when enabled) */}
      {connector.enabled && connector.fields.length > 0 && (
        <div className="px-4 pb-4 pt-1 border-t border-zinc-800/50 space-y-2.5">
          {connector.fields.map(field => {
            const fieldId = `${connector.id}-${field.key}`
            const isVisible = visibleFields.has(fieldId)
            return (
              <div key={field.key}>
                <label className="text-[11px] text-zinc-500 font-medium mb-1 block">{field.label}</label>
                <div className="relative">
                  <input
                    type={field.type === 'password' && !isVisible ? 'password' : 'text'}
                    value={field.value}
                    onChange={(e) => onUpdateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 pr-9"
                  />
                  {field.type === 'password' && (
                    <button
                      onClick={() => onToggleVisibility(field.key)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
