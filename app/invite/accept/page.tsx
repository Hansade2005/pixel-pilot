"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, Loader2, Users, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { sendWelcomeEmail, sendTeamMemberJoinedNotification } from "@/lib/email"

interface InvitationData {
  id: string
  email: string
  role: string
  organization: {
    id: string
    name: string
    slug: string
  }
  inviter: {
    name: string
    email: string
  }
}

function AcceptInvitationContent() {
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const { toast } = useToast()

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link. No token provided.")
      setLoading(false)
      return
    }

    validateInvitation()
  }, [token])

  const validateInvitation = async () => {
    try {
      const supabase = createClient()

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        // User not logged in, redirect to login with return URL
        const currentUrl = window.location.href
        router.push(`/auth/login?returnUrl=${encodeURIComponent(currentUrl)}`)
        return
      }

      // Check if invitation exists and is valid
      const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .select(`
          id,
          email,
          role,
          status,
          expires_at,
          organization:organization_id (
            id,
            name,
            slug
          )
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .single()

      if (inviteError || !invitation) {
        setError("Invalid or expired invitation link.")
        setLoading(false)
        return
      }

      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        setError("This invitation has expired.")
        setLoading(false)
        return
      }

      // Check if email matches current user
      if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
        setError(`This invitation was sent to ${invitation.email}, but you're logged in as ${user.email}. Please log in with the correct account or contact the team administrator.`)
        setLoading(false)
        return
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('organization_id', (invitation.organization as any)?.id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (existingMember) {
        setError("You're already a member of this team.")
        setLoading(false)
        return
      }

      // Extract organization data
      const organization = invitation.organization as any

      setInvitationData({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        organization: {
          id: organization?.id || '',
          name: organization?.name || '',
          slug: organization?.slug || ''
        },
        inviter: {
          name: 'Team Admin',
          email: ''
        }
      })

      setLoading(false)
    } catch (error) {
      console.error('Error validating invitation:', error)
      setError("Failed to validate invitation. Please try again.")
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    if (!invitationData) return

    setAccepting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to accept the invitation",
          variant: "destructive"
        })
        return
      }

      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          organization_id: invitationData.organization.id,
          user_id: user.id,
          role: invitationData.role,
          status: 'active'
        })

      if (memberError) throw memberError

      // Update invitation status
      const { error: inviteError } = await supabase
        .from('team_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationData.id)

      if (inviteError) throw inviteError

      // Send welcome email
      try {
        await sendWelcomeEmail(
          user.email!,
          user.user_metadata?.full_name || user.email!.split('@')[0],
          invitationData.organization.name
        )
      } catch (emailError) {
        console.warn('Welcome email failed to send:', emailError)
        // Don't fail the invitation acceptance if email fails
      }

      // Send notification emails to existing team members
      try {
        // Get existing team members (excluding the new member)
        const { data: existingMembers } = await supabase
          .rpc('get_team_members_with_users', { p_org_id: invitationData.organization.id })

        const teamMemberEmails = (existingMembers || [])
          .filter((m: any) => m.status === 'active' && m.user_id !== user.id && m.email)
          .map((m: any) => m.email)

        if (teamMemberEmails.length > 0) {
          await sendTeamMemberJoinedNotification(
            teamMemberEmails,
            user.user_metadata?.full_name || user.email!.split('@')[0],
            invitationData.organization.name,
            invitationData.inviter.name
          )
        }
      } catch (notificationError) {
        console.warn('Team member notification emails failed to send:', notificationError)
        // Don't fail the invitation acceptance if notifications fail
      }

      setAccepted(true)

      toast({
        title: "Welcome to the team!",
        description: `You've successfully joined ${invitationData.organization.name}`
      })

      // Redirect to teams page after a short delay
      setTimeout(() => {
        router.push('/workspace/teams')
      }, 2000)

    } catch (error: any) {
      console.error('Error accepting invitation:', error)
      toast({
        title: "Failed to join team",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Validating Invitation</h2>
            <p className="text-gray-600 text-center">Please wait while we verify your invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <XCircle className="h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 text-center mb-6">{error}</p>
            <Button onClick={() => router.push('/workspace/teams')} variant="outline">
              Go to Teams
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to the Team!</h2>
            <p className="text-gray-600 text-center mb-6">
              You've successfully joined <strong>{invitationData?.organization.name}</strong> as a <strong>{invitationData?.role}</strong>.
            </p>
            <p className="text-sm text-gray-500 mb-6">Redirecting to your teams...</p>
            <Button onClick={() => router.push('/workspace/teams')} className="w-full">
              <ArrowRight className="h-4 w-4 mr-2" />
              Go to Teams
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Users className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Team Invitation</CardTitle>
          <CardDescription>
            You've been invited to join a team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {invitationData?.organization.name}
            </h3>
            <p className="text-gray-600">
              Invited by {invitationData?.inviter.name}
            </p>
            <p className="text-sm text-gray-500">
              Role: <span className="font-medium capitalize">{invitationData?.role}</span>
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              By accepting this invitation, you'll be able to collaborate with the team on projects and workspaces.
            </p>
          </div>

          <Button
            onClick={handleAcceptInvitation}
            disabled={accepting}
            className="w-full"
            size="lg"
          >
            {accepting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining Team...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Invitation
              </>
            )}
          </Button>

          <Button
            onClick={() => router.push('/workspace/teams')}
            variant="outline"
            className="w-full"
          >
            View My Teams
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  )
}