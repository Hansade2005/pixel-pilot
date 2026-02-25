"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Clock,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Play,
  Pause,
  Calendar,
  RefreshCw,
  Settings,
  Edit,
  Check,
  X,
  Hash,
  Timer,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ScheduledTask {
  id: string
  user_id: string
  name: string
  description: string | null
  cron_expression: string
  cron_description: string
  config: Record<string, any> | null
  enabled: boolean
  next_execution_at: string | null
  last_execution_at: string | null
  execution_count: number
  created_at: string
  updated_at: string
}

interface TaskExecution {
  id: string
  task_id: string
  status: "success" | "failed" | "running" | "pending"
  started_at: string
  completed_at: string | null
  output: string | null
  error: string | null
  created_at: string
}

const CRON_PRESETS = [
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at 9 AM UTC", value: "0 9 * * *" },
  { label: "Weekly Monday 9 AM", value: "0 9 * * 1" },
  { label: "Custom", value: "custom" },
]

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 0) return "in the future"
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff < 0) return "overdue"
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "< 1 min"
  if (minutes < 60) return `in ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `in ${hours}h ${minutes % 60}m`
  const days = Math.floor(hours / 24)
  return `in ${days}d ${hours % 24}h`
}

export default function ScheduledTasksPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Dialog state
  const [showDialog, setShowDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formCronPreset, setFormCronPreset] = useState("0 * * * *")
  const [formCronCustom, setFormCronCustom] = useState("")
  const [formConfig, setFormConfig] = useState("{}")

  // Expanded task detail
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [executions, setExecutions] = useState<TaskExecution[]>([])
  const [loadingExecutions, setLoadingExecutions] = useState(false)

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Toggling state
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const getSession = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }, [])

  const fetchTasks = useCallback(async () => {
    try {
      const session = await getSession()
      if (!session) { router.push("/login"); return }

      const res = await fetch("/api/scheduled-tasks", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setTasks(json.tasks || [])
      }
    } catch (err) {
      console.error("Failed to fetch scheduled tasks:", err)
    } finally {
      setLoading(false)
    }
  }, [router, getSession])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const fetchExecutions = async (taskId: string) => {
    setLoadingExecutions(true)
    try {
      const session = await getSession()
      if (!session) return

      const res = await fetch(`/api/scheduled-tasks?id=${taskId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setExecutions(json.executions || [])
      }
    } catch (err) {
      console.error("Failed to fetch executions:", err)
    } finally {
      setLoadingExecutions(false)
    }
  }

  const toggleExpand = (taskId: string) => {
    if (expandedId === taskId) {
      setExpandedId(null)
      setExecutions([])
    } else {
      setExpandedId(taskId)
      fetchExecutions(taskId)
    }
  }

  const getEffectiveCron = (): string => {
    if (formCronPreset === "custom") return formCronCustom.trim()
    return formCronPreset
  }

  const handleCreate = async () => {
    const cronExpression = getEffectiveCron()
    if (!formName.trim() || !cronExpression) return
    setSaving(true)
    try {
      const session = await getSession()
      if (!session) return

      let configObj = null
      if (formConfig.trim() && formConfig.trim() !== "{}") {
        try {
          configObj = JSON.parse(formConfig)
        } catch {
          alert("Invalid JSON in config field")
          setSaving(false)
          return
        }
      }

      const res = await fetch("/api/scheduled-tasks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          cron_expression: cronExpression,
          config: configObj,
        }),
      })

      if (res.ok) {
        resetForm()
        setShowDialog(false)
        fetchTasks()
      } else {
        const err = await res.json()
        alert(err.error || "Failed to create task")
      }
    } catch (err) {
      console.error("Failed to create task:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingTask) return
    const cronExpression = getEffectiveCron()
    if (!formName.trim() || !cronExpression) return
    setSaving(true)
    try {
      const session = await getSession()
      if (!session) return

      let configObj = null
      if (formConfig.trim() && formConfig.trim() !== "{}") {
        try {
          configObj = JSON.parse(formConfig)
        } catch {
          alert("Invalid JSON in config field")
          setSaving(false)
          return
        }
      }

      const res = await fetch("/api/scheduled-tasks", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingTask.id,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          cron_expression: cronExpression,
          config: configObj,
        }),
      })

      if (res.ok) {
        resetForm()
        setShowDialog(false)
        setEditingTask(null)
        fetchTasks()
      } else {
        const err = await res.json()
        alert(err.error || "Failed to update task")
      }
    } catch (err) {
      console.error("Failed to update task:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (task: ScheduledTask) => {
    setTogglingId(task.id)
    try {
      const session = await getSession()
      if (!session) return

      const res = await fetch("/api/scheduled-tasks", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: task.id,
          enabled: !task.enabled,
        }),
      })

      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, enabled: !t.enabled } : t
          )
        )
      }
    } catch (err) {
      console.error("Failed to toggle task:", err)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const session = await getSession()
      if (!session) return

      await fetch(`/api/scheduled-tasks?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      setTasks((prev) => prev.filter((t) => t.id !== id))
      if (expandedId === id) {
        setExpandedId(null)
        setExecutions([])
      }
    } catch (err) {
      console.error("Failed to delete task:", err)
    } finally {
      setDeleteConfirmId(null)
    }
  }

  const resetForm = () => {
    setFormName("")
    setFormDescription("")
    setFormCronPreset("0 * * * *")
    setFormCronCustom("")
    setFormConfig("{}")
  }

  const openCreateDialog = () => {
    resetForm()
    setEditingTask(null)
    setShowDialog(true)
  }

  const openEditDialog = (task: ScheduledTask) => {
    setEditingTask(task)
    setFormName(task.name)
    setFormDescription(task.description || "")

    const matchingPreset = CRON_PRESETS.find(
      (p) => p.value === task.cron_expression
    )
    if (matchingPreset) {
      setFormCronPreset(matchingPreset.value)
      setFormCronCustom("")
    } else {
      setFormCronPreset("custom")
      setFormCronCustom(task.cron_expression)
    }

    setFormConfig(
      task.config ? JSON.stringify(task.config, null, 2) : "{}"
    )
    setShowDialog(true)
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-0">
            Success
          </Badge>
        )
      case "failed":
        return (
          <Badge className="text-[10px] bg-red-500/10 text-red-400 border-0">
            Failed
          </Badge>
        )
      case "running":
        return (
          <Badge className="text-[10px] bg-yellow-500/10 text-yellow-400 border-0">
            Running
          </Badge>
        )
      default:
        return (
          <Badge className="text-[10px] bg-gray-500/10 text-gray-400 border-0">
            {status}
          </Badge>
        )
    }
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
              <Clock className="h-5 w-5 text-orange-400" />
              <h1 className="text-lg font-semibold text-gray-100">
                Scheduled Tasks
              </h1>
            </div>
          </div>
          <Button
            onClick={openCreateDialog}
            className="bg-orange-600 hover:bg-orange-500 text-white text-xs h-8"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Task
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-2.5 bg-orange-500/5 border border-orange-500/20 rounded-lg px-3.5 py-3">
          <Settings className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
          <div className="text-xs text-gray-400">
            <span className="text-orange-300 font-medium">
              Automated agent tasks.
            </span>{" "}
            Schedule recurring AI agent operations with cron expressions. Tasks
            run automatically in the background and you can monitor their
            execution history.
          </div>
        </div>

        {/* Task List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : tasks.length === 0 ? (
          <Card className="bg-gray-900/80 border-gray-800/60">
            <CardContent className="py-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-gray-800/80 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-gray-700" />
              </div>
              <p className="text-sm text-gray-400 mb-1">
                No scheduled tasks yet
              </p>
              <p className="text-xs text-gray-600 max-w-sm mx-auto mb-5">
                Create automated agent tasks that run on a schedule. Set up
                recurring operations like data syncs, health checks, or
                automated builds.
              </p>
              <Button
                onClick={openCreateDialog}
                className="bg-orange-600 hover:bg-orange-500 text-white text-xs h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create your first task
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <Card
                key={task.id}
                className="bg-gray-900/80 border-gray-800/60 hover:border-orange-500/20 transition-all"
              >
                <CardContent className="pt-4 pb-3">
                  {/* Task header row */}
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => toggleExpand(task.id)}
                      className="flex items-start gap-3 flex-1 min-w-0 text-left"
                    >
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          task.enabled
                            ? "bg-orange-600/15 text-orange-400"
                            : "bg-gray-800 text-gray-600"
                        }`}
                      >
                        {task.enabled ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {expandedId === task.id ? (
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                          )}
                          <span className="text-sm font-medium text-gray-200">
                            {task.name}
                          </span>
                          <Badge
                            className={`text-[10px] border-0 ${
                              task.enabled
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-gray-500/10 text-gray-500"
                            }`}
                          >
                            {task.enabled ? "Active" : "Paused"}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-xs text-gray-500 mb-1.5 pl-5 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 pl-5">
                          <Badge className="text-[10px] bg-orange-500/10 text-orange-400 border-0 gap-1">
                            <Timer className="h-2.5 w-2.5" />
                            {task.cron_description}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-gray-600 pl-5 mt-1.5">
                          {task.next_execution_at && task.enabled && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Next: {timeUntil(task.next_execution_at)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {task.execution_count} execution
                            {task.execution_count !== 1 ? "s" : ""}
                          </span>
                          {task.last_execution_at && (
                            <span className="flex items-center gap-1">
                              <RefreshCw className="h-3 w-3" />
                              Last: {timeAgo(task.last_execution_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(task)}
                        disabled={togglingId === task.id}
                        className="h-7 w-7 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10"
                        title={task.enabled ? "Pause task" : "Enable task"}
                      >
                        {togglingId === task.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : task.enabled ? (
                          <Power className="h-3.5 w-3.5" />
                        ) : (
                          <PowerOff className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(task)}
                        className="h-7 w-7 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10"
                        title="Edit task"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmId(task.id)}
                        className="h-7 w-7 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                        title="Delete task"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded executions */}
                  {expandedId === task.id && (
                    <div className="mt-3 pt-3 border-t border-gray-800/60">
                      {loadingExecutions ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                        </div>
                      ) : executions.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-xs text-gray-600">
                            No executions yet. The task will run at its next
                            scheduled time.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500">
                              Recent Executions
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => fetchExecutions(task.id)}
                              className="text-gray-500 hover:text-orange-400 text-[10px] h-6 px-2"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Refresh
                            </Button>
                          </div>
                          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                            {executions.map((exec) => (
                              <div
                                key={exec.id}
                                className="flex items-start gap-3 py-2 px-2.5 rounded-md bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                              >
                                <div className="shrink-0 mt-0.5">
                                  {statusBadge(exec.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
                                    <span>
                                      Started:{" "}
                                      {formatDate(exec.started_at)}
                                    </span>
                                    {exec.completed_at && (
                                      <span>
                                        Completed:{" "}
                                        {formatDate(exec.completed_at)}
                                      </span>
                                    )}
                                  </div>
                                  {exec.output && (
                                    <p className="text-xs text-gray-400 mt-1 font-mono whitespace-pre-wrap line-clamp-3">
                                      {exec.output}
                                    </p>
                                  )}
                                  {exec.error && (
                                    <p className="text-xs text-red-400 mt-1 font-mono whitespace-pre-wrap line-clamp-3">
                                      {exec.error}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer stats */}
        {tasks.length > 0 && (
          <div className="flex items-center justify-between text-[10px] text-gray-600 pt-2">
            <span>
              {tasks.length} task{tasks.length !== 1 ? "s" : ""} total
            </span>
            <span>
              {tasks.filter((t) => t.enabled).length} active
            </span>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDialog(false)
            setEditingTask(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="bg-gray-900 border-gray-800 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-100">
              {editingTask ? "Edit Task" : "Create Scheduled Task"}
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-xs">
              {editingTask
                ? "Update the task configuration below."
                : "Configure a new recurring agent task."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">Task Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Daily health check"
                className="bg-gray-800 border-gray-700 text-gray-100 text-sm focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">
                Description (optional)
              </Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What does this task do?"
                rows={2}
                className="bg-gray-800 border-gray-700 text-gray-100 text-sm resize-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
              />
            </div>

            {/* Cron Schedule */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">Schedule</Label>
              <Select
                value={formCronPreset}
                onValueChange={(value) => {
                  setFormCronPreset(value)
                  if (value !== "custom") {
                    setFormCronCustom("")
                  }
                }}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100 text-sm focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50">
                  <SelectValue placeholder="Select a schedule" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {CRON_PRESETS.map((preset) => (
                    <SelectItem
                      key={preset.value}
                      value={preset.value}
                      className="text-gray-200 text-sm focus:bg-orange-600/15 focus:text-orange-400"
                    >
                      <span className="flex items-center gap-2">
                        {preset.label}
                        {preset.value !== "custom" && (
                          <span className="text-[10px] text-gray-500 font-mono">
                            {preset.value}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {formCronPreset === "custom" && (
                <Input
                  value={formCronCustom}
                  onChange={(e) => setFormCronCustom(e.target.value)}
                  placeholder="* * * * * (min hour day month weekday)"
                  className="bg-gray-800 border-gray-700 text-gray-100 text-sm font-mono focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 mt-2"
                />
              )}

              <p className="text-[10px] text-gray-600 mt-1">
                Cron format: minute hour day-of-month month day-of-week
              </p>
            </div>

            {/* Config JSON */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">
                Config (optional JSON)
              </Label>
              <Textarea
                value={formConfig}
                onChange={(e) => setFormConfig(e.target.value)}
                placeholder='{"key": "value"}'
                rows={3}
                className="bg-gray-800 border-gray-700 text-gray-100 text-sm font-mono resize-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
              />
              <p className="text-[10px] text-gray-600">
                Pass configuration data to the task as JSON.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowDialog(false)
                setEditingTask(null)
                resetForm()
              }}
              className="text-gray-400 hover:text-gray-200 text-xs h-8"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => (editingTask ? handleUpdate() : handleCreate())}
              disabled={
                saving ||
                !formName.trim() ||
                (formCronPreset === "custom" && !formCronCustom.trim()) ||
                (!formCronPreset && !formCronCustom.trim())
              }
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs h-8 disabled:opacity-30"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1" />
              )}
              {editingTask ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null)
        }}
      >
        <DialogContent className="bg-gray-900 border-gray-800 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gray-100">Delete Task</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              Are you sure you want to delete this scheduled task? This action
              cannot be undone and all execution history will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
              className="text-gray-400 hover:text-gray-200 text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (deleteConfirmId) handleDelete(deleteConfirmId)
              }}
              className="bg-red-500 hover:bg-red-600 text-white text-xs h-8"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
