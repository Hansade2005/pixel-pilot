"use client"

import React, { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface TeamMember {
  id: string
  email: string
  name?: string
  avatar_url?: string
  isOnline?: boolean
  lastSeen?: string
}

interface TeamPresenceProps {
  workspaceId: string
  organizationId?: string | null
  className?: string
}

export function TeamPresence({ workspaceId, organizationId, className }: TeamPresenceProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) {
      setTeamMembers([])
      setLoading(false)
      return
    }

    const fetchTeamMembers = async () => {
      try {
        const supabase = createClient()

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUserId(user?.id || null)

        // Fetch team members from team_members table
        const { data: members, error } = await supabase
          .from('team_members')
          .select(`
            user_id,
            role,
            users:user_id (
              id,
              email,
              raw_user_meta_data
            )
          `)
          .eq('organization_id', organizationId)
          .eq('status', 'active')

        if (error) {
          console.error('[TeamPresence] Error fetching team members:', error)
          setTeamMembers([])
          return
        }

        // Transform data
        const transformedMembers: TeamMember[] = (members || []).map((member: any) => ({
          id: member.users?.id || '',
          email: member.users?.email || '',
          name: member.users?.raw_user_meta_data?.full_name || member.users?.email?.split('@')[0],
          avatar_url: member.users?.raw_user_meta_data?.avatar_url,
          isOnline: false, // Will be updated by presence system
          lastSeen: new Date().toISOString()
        })).filter(m => m.id) // Filter out any invalid members

        setTeamMembers(transformedMembers)
        setLoading(false)

        // TODO: Implement real-time presence tracking
        // For now, mark all as potentially online (mock data)
        // In production, use Supabase Realtime presence
      } catch (error) {
        console.error('[TeamPresence] Error:', error)
        setTeamMembers([])
        setLoading(false)
      }
    }

    fetchTeamMembers()
  }, [workspaceId, organizationId])

  if (!organizationId || loading) {
    return null
  }

  if (teamMembers.length === 0) {
    return null
  }

  // Filter out current user for display
  const otherMembers = teamMembers.filter(m => m.id !== currentUserId)
  const displayMembers = otherMembers.slice(0, 5) // Show max 5 avatars
  const remainingCount = otherMembers.length - displayMembers.length

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center">
          <Users className="h-3.5 w-3.5 text-muted-foreground mr-2" />
          <div className="flex -space-x-2">
            {displayMembers.map((member) => (
              <Tooltip key={member.id}>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Avatar className="h-7 w-7 border-2 border-background hover:z-10 transition-transform hover:scale-110">
                      <AvatarImage src={member.avatar_url} alt={member.name || member.email} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-blue-400 to-purple-400 text-white">
                        {(member.name || member.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {member.isOnline && (
                      <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div>
                    <p className="font-medium">{member.name || member.email}</p>
                    <p className="text-muted-foreground text-[10px]">
                      {member.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
            {remainingCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted border-2 border-background text-xs font-medium text-muted-foreground hover:z-10 transition-transform hover:scale-110 cursor-default">
                    +{remainingCount}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {remainingCount} more team member{remainingCount !== 1 ? 's' : ''}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        <Badge variant="outline" className="h-5 px-2 text-[10px] text-muted-foreground border-muted">
          {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
        </Badge>
      </div>
    </TooltipProvider>
  )
}
