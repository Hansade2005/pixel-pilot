"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Users,
  Plus,
  UserPlus,
  Crown,
  Shield,
  Pencil,
  Eye,
  Trash2,
  Mail,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Settings,
  Activity,
  Clock,
  LogOut,
  Building2,
  ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface Organization {
  id: string
  name: string
  slug: string
  owner_id: string
  max_members: number
  subscription_plan: string
  settings: any
  created_at: string
}

interface TeamMember {
  id: string
  user_id: string
  role: string
  status: string
  email?: string
  full_name?: string
  avatar_url?: string
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  token: string
  expires_at: string
  created_at: string
}

interface TeamPanelProps {
  userId: string
  projectId?: string
  projectName?: string
  organizationId?: string | null
  onOrganizationChange?: (orgId: string | null) => void
}

export function TeamPanel({ userId, projectId, projectName, organizationId, onOrganizationChange }: TeamPanelProps) {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Dialog states
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [newOrgName, setNewOrgName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("editor")
  const [isCreating, setIsCreating] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Presence state
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  const supabase = createClient()

  const fetchOrganizations = useCallback(async () => {
    try {
      const { data: memberships, error } = await supabase
        .from('team_members')
        .select(`
          organization_id,
          role,
          organizations:organization_id (*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')

      if (error) throw error

      const organizations = (memberships || [])
        .filter((m: any) => m.organizations)
        .map((m: any) => m.organizations as Organization)

      setOrgs(organizations)

      // Auto-select org if one matches the current workspace
      if (organizationId) {
        const match = organizations.find(o => o.id === organizationId)
        if (match) setSelectedOrg(match)
      } else if (organizations.length === 1) {
        setSelectedOrg(organizations[0])
      }
    } catch (error) {
      console.error('[TeamPanel] Error fetching orgs:', error)
    }
  }, [userId, organizationId, supabase])

  const fetchMembers = useCallback(async (orgId: string) => {
    try {
      const { data: membersData, error } = await supabase
        .from('team_members')
        .select('id, user_id, role, status')
        .eq('organization_id', orgId)
        .eq('status', 'active')

      if (error) throw error

      if (membersData && membersData.length > 0) {
        const userIds = membersData.map((m: any) => m.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', userIds)

        const profileMap = new Map(
          (profiles || []).map((p: any) => [p.id, p])
        )

        const enrichedMembers = membersData.map((m: any) => {
          const profile = profileMap.get(m.user_id)
          return {
            ...m,
            email: profile?.email || '',
            full_name: profile?.full_name || '',
            avatar_url: profile?.avatar_url || '',
          }
        })

        setMembers(enrichedMembers)
      } else {
        setMembers([])
      }
    } catch (error) {
      console.error('[TeamPanel] Error fetching members:', error)
    }
  }, [supabase])

  const fetchInvitations = useCallback(async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvitations(data || [])
    } catch (error) {
      console.error('[TeamPanel] Error fetching invitations:', error)
    }
  }, [supabase])

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true)
      await fetchOrganizations()
      setIsLoading(false)
    }
    loadAll()
  }, [fetchOrganizations])

  useEffect(() => {
    if (selectedOrg) {
      fetchMembers(selectedOrg.id)
      fetchInvitations(selectedOrg.id)
    }
  }, [selectedOrg, fetchMembers, fetchInvitations])

  // Real-time: refresh org list when user's memberships change (e.g. invited to new org)
  useEffect(() => {
    const membershipChannel = supabase
      .channel(`my-memberships:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchOrganizations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(membershipChannel)
    }
  }, [userId, supabase, fetchOrganizations])

  // Real-time presence via Supabase Realtime
  useEffect(() => {
    if (!selectedOrg) return

    const channel = supabase.channel(`presence:${selectedOrg.id}`, {
      config: { presence: { key: userId } }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const online = new Set(Object.keys(state))
        setOnlineUsers(online)
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => new Set([...prev, key]))
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedOrg, userId, supabase])

  // Real-time subscriptions for members and invitations
  useEffect(() => {
    if (!selectedOrg) return

    const membersChannel = supabase
      .channel(`team-members:${selectedOrg.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `organization_id=eq.${selectedOrg.id}`
        },
        () => {
          fetchMembers(selectedOrg.id)
        }
      )
      .subscribe()

    const invitationsChannel = supabase
      .channel(`team-invitations:${selectedOrg.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_invitations',
          filter: `organization_id=eq.${selectedOrg.id}`
        },
        () => {
          fetchInvitations(selectedOrg.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(membersChannel)
      supabase.removeChannel(invitationsChannel)
    }
  }, [selectedOrg, supabase, fetchMembers, fetchInvitations])

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return
    setIsCreating(true)

    try {
      const slug = newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: newOrgName.trim(),
          slug,
          owner_id: userId,
        })
        .select()
        .single()

      if (orgError) throw orgError

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          organization_id: org.id,
          user_id: userId,
          role: 'owner',
          status: 'active',
        })

      if (memberError) throw memberError

      toast.success("Team created!")
      setShowCreateOrg(false)
      setNewOrgName("")
      setSelectedOrg(org)
      setOrgs(prev => [...prev, org])
      await fetchMembers(org.id)
    } catch (error: any) {
      toast.error(error.message || "Failed to create team")
    } finally {
      setIsCreating(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedOrg) return
    setIsInviting(true)

    try {
      // Check member limit
      if (members.length >= (selectedOrg.max_members || 5)) {
        toast.error(`Team limit reached (${selectedOrg.max_members || 5} members). Upgrade your plan.`)
        setIsInviting(false)
        return
      }

      // Check if already a member
      const existingMember = members.find(m => m.email === inviteEmail.trim())
      if (existingMember) {
        toast.error("This user is already a team member")
        setIsInviting(false)
        return
      }

      // Create invitation token
      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error } = await supabase
        .from('team_invitations')
        .insert({
          organization_id: selectedOrg.id,
          email: inviteEmail.trim(),
          role: inviteRole,
          token,
          invited_by: userId,
          expires_at: expiresAt.toISOString(),
        })

      if (error) throw error

      toast.success(`Invitation created for ${inviteEmail}`)
      setShowInvite(false)
      setInviteEmail("")
      setInviteRole("editor")
      await fetchInvitations(selectedOrg.id)
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation")
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === userId) {
      toast.error("You can't remove yourself")
      return
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .update({ status: 'removed' })
        .eq('id', memberId)

      if (error) throw error

      toast.success("Member removed")
      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member")
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId)

      if (error) throw error

      toast.success("Invitation revoked")
      setInvitations(prev => prev.filter(i => i.id !== invitationId))
    } catch (error: any) {
      toast.error("Failed to revoke invitation")
    }
  }

  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`
    await navigator.clipboard.writeText(link)
    setCopiedToken(token)
    toast.success("Invite link copied!")
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-3 h-3 text-orange-400" />
      case 'admin': return <Shield className="w-3 h-3 text-orange-300" />
      case 'editor': return <Pencil className="w-3 h-3 text-gray-400" />
      case 'viewer': return <Eye className="w-3 h-3 text-gray-500" />
      default: return null
    }
  }

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      admin: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
      editor: 'bg-gray-500/10 text-gray-300 border-gray-500/20',
      viewer: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    }
    return colors[role] || colors.viewer
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading team...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-600/15 flex items-center justify-center">
              <Users className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Teams</h2>
              <p className="text-[11px] text-gray-500">Collaborate in real-time</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {selectedOrg && (
              <Button
                size="sm"
                onClick={() => setShowInvite(true)}
                className="h-7 bg-orange-600 hover:bg-orange-500 text-white text-xs px-2.5"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Invite
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* No team yet */}
        {orgs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/30 p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-orange-600/15 flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">No team yet</h3>
            <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
              Create a team to collaborate with others on your projects in real-time.
            </p>
            <Button
              size="sm"
              onClick={() => setShowCreateOrg(true)}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create Team
            </Button>
          </div>
        )}

        {/* Org Selector (if multiple) */}
        {orgs.length > 1 && (
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Team</Label>
            <Select
              value={selectedOrg?.id || ''}
              onValueChange={(val) => {
                const org = orgs.find(o => o.id === val)
                setSelectedOrg(org || null)
              }}
            >
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-orange-400" />
                      {org.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Single org header */}
        {orgs.length === 1 && selectedOrg && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{selectedOrg.name}</div>
                  <div className="text-[11px] text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateOrg(true)}
                className="h-7 text-xs text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
              >
                <Plus className="w-3 h-3 mr-1" />
                New Team
              </Button>
            </div>
          </div>
        )}

        {/* Online Presence */}
        {selectedOrg && members.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-emerald-500 rounded-sm" />
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Online ({onlineUsers.size})
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map(member => {
                const isOnline = onlineUsers.has(member.user_id)
                const isCurrentUser = member.user_id === userId
                return (
                  <Tooltip key={member.id}>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Avatar className={cn(
                          "h-8 w-8 border-2 transition-all",
                          isOnline ? "border-emerald-500/50" : "border-gray-700 opacity-50"
                        )}>
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback className="text-xs bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                            {(member.full_name || member.email || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-950",
                          isOnline ? "bg-emerald-400" : "bg-gray-600"
                        )} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <p className="font-medium">{member.full_name || member.email}{isCurrentUser ? ' (you)' : ''}</p>
                        <p className="text-gray-400">{isOnline ? 'Online' : 'Offline'} - {member.role}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>
        )}

        {/* Members List */}
        {selectedOrg && members.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-orange-500 rounded-sm" />
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Members</h3>
            </div>
            {members.map(member => {
              const isCurrentUser = member.user_id === userId
              const isOnline = onlineUsers.has(member.user_id)
              return (
                <div
                  key={member.id}
                  className="rounded-xl border border-gray-800 bg-gray-900/50 p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                          {(member.full_name || member.email || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900",
                        isOnline ? "bg-emerald-400" : "bg-gray-600"
                      )} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">
                          {member.full_name || member.email?.split('@')[0]}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400">You</span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">{member.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 border", getRoleBadge(member.role))}>
                      <span className="flex items-center gap-1">
                        {getRoleIcon(member.role)}
                        {member.role}
                      </span>
                    </Badge>
                    {!isCurrentUser && selectedOrg.owner_id === userId && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id, member.user_id)}
                            className="h-6 w-6 p-0 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove member</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pending Invitations */}
        {selectedOrg && invitations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-yellow-500 rounded-sm" />
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Pending Invitations ({invitations.length})
              </h3>
            </div>
            {invitations.map(inv => (
              <div
                key={inv.id}
                className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-3.5 h-3.5 text-yellow-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{inv.email}</div>
                    <div className="text-[11px] text-gray-500">
                      {inv.role} - expires {new Date(inv.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyInviteLink(inv.token)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
                      >
                        {copiedToken === inv.token ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy invite link</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeInvitation(inv.id)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Revoke invitation</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Convert current project to team */}
        {selectedOrg && projectId && (
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
            <div className="flex items-start gap-2">
              <Activity className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-orange-300">Shared workspace</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  Team members with access to this organization can view and edit this project's files in real-time.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Team Dialog */}
      <Dialog open={showCreateOrg} onOpenChange={setShowCreateOrg}>
        <DialogContent className="sm:max-w-[420px] bg-gray-950 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-400" />
              Create Team
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a team to collaborate with others on projects.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm text-gray-300">Team Name</Label>
              <Input
                placeholder="e.g., Acme Engineering"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white focus:ring-orange-500/50 focus:border-orange-500/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateOrg()
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateOrg(false)} className="text-gray-400 hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrg}
              disabled={!newOrgName.trim() || isCreating}
              className="bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-30"
            >
              {isCreating ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating...</>
              ) : (
                <><Plus className="w-4 h-4 mr-1.5" /> Create Team</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-[420px] bg-gray-950 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-orange-400" />
              Invite Member
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Send an invite link to add someone to {selectedOrg?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm text-gray-300">Email</Label>
              <Input
                type="email"
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white focus:ring-orange-500/50 focus:border-orange-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-300">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-orange-300" />
                      Admin - Full access + member management
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Pencil className="w-3.5 h-3.5 text-gray-400" />
                      Editor - Can edit files and chat with AI
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5 text-gray-500" />
                      Viewer - Read-only access
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || isInviting}
              className="bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-30"
            >
              {isInviting ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Sending...</>
              ) : (
                <><Mail className="w-4 h-4 mr-1.5" /> Send Invite</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
