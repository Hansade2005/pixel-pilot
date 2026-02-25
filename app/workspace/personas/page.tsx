"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  Bot,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Sparkles,
  Code,
  Palette,
  Shield,
  Zap,
  Globe,
  Copy,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Persona {
  id: string
  user_id: string
  name: string
  instructions: string
  project_id: string | null
  icon: string | null
  created_at: string
  updated_at: string
}

const PRESET_PERSONAS = [
  {
    name: 'Backend Expert',
    icon: 'code',
    instructions: `You are a backend-focused developer. Follow these preferences:
- Always use TypeScript with strict mode enabled
- Prefer Drizzle ORM over raw SQL queries
- Use Zod for all input validation
- Structure API routes with proper error handling and status codes
- Write clean, modular code with small, focused functions
- Always consider security: sanitize inputs, use parameterized queries
- Add proper TypeScript types/interfaces for all data structures`,
  },
  {
    name: 'UI/UX Designer',
    icon: 'palette',
    instructions: `You are a UI/UX-focused developer. Follow these preferences:
- Prioritize beautiful, polished interfaces with smooth animations
- Use Framer Motion for transitions and micro-interactions
- Follow modern design trends: glass morphism, subtle gradients, rounded corners
- Ensure responsive design works flawlessly on mobile and desktop
- Use consistent spacing (4px/8px grid system)
- Add hover states, focus rings, and loading states to all interactive elements
- Pay attention to typography hierarchy and color contrast`,
  },
  {
    name: 'Performance Engineer',
    icon: 'zap',
    instructions: `You are a performance-focused developer. Follow these preferences:
- Minimize bundle size: use dynamic imports and code splitting
- Optimize images with next/image and proper sizing
- Use React.memo, useMemo, useCallback strategically to prevent unnecessary re-renders
- Implement virtualization for long lists (react-window or tanstack-virtual)
- Prefer server components over client components when possible
- Use Suspense boundaries with proper loading fallbacks
- Avoid N+1 queries in database operations`,
  },
  {
    name: 'Security First',
    icon: 'shield',
    instructions: `You are a security-focused developer. Follow these preferences:
- Always validate and sanitize user input on both client and server
- Use CSRF protection for all form submissions
- Implement proper authentication checks on every API route
- Never expose sensitive data in client-side code or API responses
- Use httpOnly, secure, sameSite cookies for session management
- Apply principle of least privilege for database queries
- Add rate limiting considerations to public-facing endpoints
- Escape output to prevent XSS attacks`,
  },
]

const ICON_MAP: Record<string, React.ReactNode> = {
  code: <Code className="h-4 w-4" />,
  palette: <Palette className="h-4 w-4" />,
  zap: <Zap className="h-4 w-4" />,
  shield: <Shield className="h-4 w-4" />,
  globe: <Globe className="h-4 w-4" />,
  bot: <Bot className="h-4 w-4" />,
  sparkles: <Sparkles className="h-4 w-4" />,
}

export default function PersonasPage() {
  const router = useRouter()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formInstructions, setFormInstructions] = useState('')
  const [formIcon, setFormIcon] = useState('bot')

  const fetchPersonas = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/personas', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setPersonas(json.personas || [])
      }
    } catch (err) {
      console.error('Failed to fetch personas:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPersonas()
  }, [fetchPersonas])

  const handleCreate = async () => {
    if (!formName.trim() || !formInstructions.trim()) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/personas', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formName,
          instructions: formInstructions,
          icon: formIcon,
        }),
      })

      if (res.ok) {
        setFormName('')
        setFormInstructions('')
        setFormIcon('bot')
        setShowCreate(false)
        fetchPersonas()
      }
    } catch (err) {
      console.error('Failed to create persona:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!formName.trim() || !formInstructions.trim()) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/personas', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          name: formName,
          instructions: formInstructions,
          icon: formIcon,
        }),
      })

      if (res.ok) {
        setEditingId(null)
        setFormName('')
        setFormInstructions('')
        setFormIcon('bot')
        fetchPersonas()
      }
    } catch (err) {
      console.error('Failed to update persona:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch(`/api/personas?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      fetchPersonas()
    } catch (err) {
      console.error('Failed to delete persona:', err)
    }
  }

  const startEdit = (persona: Persona) => {
    setEditingId(persona.id)
    setFormName(persona.name)
    setFormInstructions(persona.instructions)
    setFormIcon(persona.icon || 'bot')
    setShowCreate(false)
  }

  const usePreset = (preset: typeof PRESET_PERSONAS[0]) => {
    setFormName(preset.name)
    setFormInstructions(preset.instructions)
    setFormIcon(preset.icon)
    setShowCreate(true)
    setEditingId(null)
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-30">
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
              <Bot className="h-5 w-5 text-orange-400" />
              <h1 className="text-lg font-semibold text-gray-100">AI Personas</h1>
            </div>
          </div>
          <Button
            onClick={() => {
              setShowCreate(true)
              setEditingId(null)
              setFormName('')
              setFormInstructions('')
              setFormIcon('bot')
            }}
            className="bg-orange-600 hover:bg-orange-500 text-white text-xs h-8"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Persona
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <p className="text-sm text-gray-400">
          Create custom AI personas to tailor the AI's coding style, preferences, and behavior for your projects. Select an active persona in your workspace chat settings.
        </p>

        {/* Preset Templates */}
        <div>
          <h2 className="text-sm font-medium text-gray-300 mb-3">Quick Start Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRESET_PERSONAS.map((preset) => (
              <Card
                key={preset.name}
                className="bg-gray-900/80 border-gray-800/60 hover:border-orange-500/30 transition-all cursor-pointer group"
                onClick={() => usePreset(preset)}
              >
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-lg bg-orange-600/15 flex items-center justify-center text-orange-400">
                      {ICON_MAP[preset.icon]}
                    </div>
                    <span className="text-sm font-medium text-gray-200">{preset.name}</span>
                    <Copy className="h-3 w-3 text-gray-600 group-hover:text-orange-400 ml-auto transition-colors" />
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{preset.instructions.split('\n')[0]}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Create / Edit Form */}
        {(showCreate || editingId) && (
          <Card className="bg-gray-900/80 border-orange-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-200">
                {editingId ? 'Edit Persona' : 'Create New Persona'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-400">Icon</Label>
                  <div className="flex gap-1.5">
                    {Object.entries(ICON_MAP).map(([key, icon]) => (
                      <button
                        key={key}
                        onClick={() => setFormIcon(key)}
                        className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                          formIcon === key
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-gray-400">Name</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Backend Expert"
                    className="bg-gray-800 border-gray-700 text-gray-100 text-sm focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Instructions</Label>
                <Textarea
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Tell the AI how to behave, what patterns to follow, coding style preferences..."
                  rows={6}
                  className="bg-gray-800 border-gray-700 text-gray-100 text-sm resize-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                />
                <p className="text-[10px] text-gray-600">{formInstructions.length} characters</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowCreate(false); setEditingId(null) }}
                  className="text-gray-400 hover:text-gray-200 text-xs h-8"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                  disabled={saving || !formName.trim() || !formInstructions.trim()}
                  className="bg-orange-600 hover:bg-orange-500 text-white text-xs h-8 disabled:opacity-30"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  {editingId ? 'Save Changes' : 'Create Persona'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saved Personas List */}
        <div>
          <h2 className="text-sm font-medium text-gray-300 mb-3">
            Your Personas {personas.length > 0 && <span className="text-gray-600">({personas.length})</span>}
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : personas.length === 0 ? (
            <Card className="bg-gray-900/80 border-gray-800/60">
              <CardContent className="py-8 text-center">
                <Sparkles className="h-8 w-8 text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No personas yet. Create one or use a template above.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {personas.map((persona) => (
                <Card key={persona.id} className="bg-gray-900/80 border-gray-800/60 hover:border-orange-500/20 transition-all">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-orange-600/15 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                          {ICON_MAP[persona.icon || 'bot'] || <Bot className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-200">{persona.name}</span>
                            {persona.project_id && (
                              <Badge className="text-[10px] bg-gray-800 text-gray-400 border-0">Project-specific</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-3">{persona.instructions}</p>
                          <p className="text-[10px] text-gray-700 mt-2">
                            Created {new Date(persona.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(persona)}
                          className="h-7 w-7 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(persona.id)}
                          className="h-7 w-7 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
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
        </div>
      </div>
    </div>
  )
}
