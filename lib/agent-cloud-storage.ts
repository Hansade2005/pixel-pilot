/**
 * Agent Cloud Supabase Storage
 *
 * Handles persistence of agent cloud sessions, messages, and connectors
 * using an external Supabase project to avoid localStorage quota limits.
 *
 * Note: User auth comes from the main Supabase project, but storage
 * is on a separate external project for scalability.
 */

import { createClient } from '@/lib/supabase/client'
import { createAgentCloudClient } from '@/lib/supabase/agent-cloud-client'
import type { Session, TerminalLine, ConnectorConfig } from '@/app/agent-cloud/layout'

// Database types
interface DbSession {
  id: string
  user_id: string
  sandbox_id: string
  created_at: string
  updated_at: string
  status: 'active' | 'terminated'
  model: string | null
  gateway: string | null
  title: string | null
  repo_name: string | null
  repo_full_name: string | null
  repo_branch: string | null
  working_branch: string | null
  stats_additions: number
  stats_deletions: number
  message_count: number
  is_new_project: boolean
  new_project_name: string | null
}

interface DbMessage {
  id: string
  session_id: string
  type: string
  content: string
  timestamp: string
  meta: any | null
  sequence_num: number
}

interface DbMessageImage {
  id: string
  message_id: string
  data: string
  mime_type: string
}

interface DbConnector {
  id: string
  user_id: string
  connector_id: string
  enabled: boolean
  fields: Record<string, string>
  updated_at: string
}

// Convert DB session to app Session type
function dbSessionToSession(dbSession: DbSession, lines: TerminalLine[]): Session {
  return {
    id: dbSession.id,
    sandboxId: dbSession.sandbox_id,
    createdAt: new Date(dbSession.created_at),
    status: dbSession.status,
    model: dbSession.model || undefined,
    gateway: dbSession.gateway || undefined,
    title: dbSession.title || undefined,
    repo: dbSession.repo_full_name ? {
      name: dbSession.repo_name || '',
      full_name: dbSession.repo_full_name,
      branch: dbSession.repo_branch || 'main',
    } : undefined,
    workingBranch: dbSession.working_branch || undefined,
    stats: {
      additions: dbSession.stats_additions,
      deletions: dbSession.stats_deletions,
    },
    messageCount: dbSession.message_count,
    isNewProject: dbSession.is_new_project,
    newProjectName: dbSession.new_project_name || undefined,
    lines,
  }
}

// Convert app Session to DB format
function sessionToDbSession(session: Session, userId: string): Omit<DbSession, 'updated_at'> {
  return {
    id: session.id,
    user_id: userId,
    sandbox_id: session.sandboxId,
    created_at: session.createdAt.toISOString(),
    status: session.status,
    model: session.model || null,
    gateway: session.gateway || null,
    title: session.title || null,
    repo_name: session.repo?.name || null,
    repo_full_name: session.repo?.full_name || null,
    repo_branch: session.repo?.branch || null,
    working_branch: session.workingBranch || null,
    stats_additions: session.stats?.additions || 0,
    stats_deletions: session.stats?.deletions || 0,
    message_count: session.messageCount || 0,
    is_new_project: session.isNewProject || false,
    new_project_name: session.newProjectName || null,
  }
}

// Agent Cloud Storage class
class AgentCloudStorage {
  // Main auth client - used to get user ID
  private authClient = createClient()
  // External storage client - used for all storage operations
  private storageClient = createAgentCloudClient()

  /**
   * Get current user ID from main auth project
   */
  async getUserId(): Promise<string | null> {
    const { data: { user } } = await this.authClient.auth.getUser()
    return user?.id || null
  }

  /**
   * Load all sessions for the current user
   */
  async loadSessions(): Promise<Session[]> {
    const userId = await this.getUserId()
    if (!userId) return []

    try {
      // Fetch sessions
      const { data: dbSessions, error: sessionsError } = await this.storageClient
        .from('agent_cloud_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (sessionsError) {
        console.error('[AgentCloudStorage] Error loading sessions:', sessionsError)
        return []
      }

      if (!dbSessions || dbSessions.length === 0) return []

      // Fetch messages for all sessions
      const sessionIds = dbSessions.map(s => s.id)
      const { data: dbMessages, error: messagesError } = await this.storageClient
        .from('agent_cloud_messages')
        .select('*')
        .in('session_id', sessionIds)
        .order('sequence_num', { ascending: true })

      if (messagesError) {
        console.error('[AgentCloudStorage] Error loading messages:', messagesError)
      }

      // Fetch images for all messages
      const messageIds = (dbMessages || []).map(m => m.id)
      let dbImages: DbMessageImage[] = []
      if (messageIds.length > 0) {
        const { data: images, error: imagesError } = await this.storageClient
          .from('agent_cloud_message_images')
          .select('*')
          .in('message_id', messageIds)

        if (imagesError) {
          console.error('[AgentCloudStorage] Error loading images:', imagesError)
        }
        dbImages = images || []
      }

      // Group messages by session and convert
      const messagesBySession = new Map<string, TerminalLine[]>()
      const imagesByMessage = new Map<string, Array<{ data: string; type: string }>>()

      // Group images by message
      for (const img of dbImages) {
        if (!imagesByMessage.has(img.message_id)) {
          imagesByMessage.set(img.message_id, [])
        }
        imagesByMessage.get(img.message_id)!.push({
          data: img.data,
          type: img.mime_type,
        })
      }

      // Convert messages
      for (const msg of (dbMessages || [])) {
        if (!messagesBySession.has(msg.session_id)) {
          messagesBySession.set(msg.session_id, [])
        }
        const line: TerminalLine = {
          type: msg.type as TerminalLine['type'],
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          meta: msg.meta || undefined,
          images: imagesByMessage.get(msg.id),
        }
        messagesBySession.get(msg.session_id)!.push(line)
      }

      // Convert sessions
      return dbSessions.map(dbSession =>
        dbSessionToSession(dbSession, messagesBySession.get(dbSession.id) || [])
      )
    } catch (error) {
      console.error('[AgentCloudStorage] Error in loadSessions:', error)
      return []
    }
  }

  /**
   * Save a new session
   */
  async createSession(session: Session): Promise<boolean> {
    const userId = await this.getUserId()
    if (!userId) return false

    try {
      const dbSession = sessionToDbSession(session, userId)

      const { error: sessionError } = await this.storageClient
        .from('agent_cloud_sessions')
        .insert(dbSession)

      if (sessionError) {
        console.error('[AgentCloudStorage] Error creating session:', sessionError)
        return false
      }

      // Insert initial lines
      if (session.lines.length > 0) {
        await this.saveMessages(session.id, session.lines)
      }

      return true
    } catch (error) {
      console.error('[AgentCloudStorage] Error in createSession:', error)
      return false
    }
  }

  /**
   * Update session metadata (not lines)
   */
  async updateSession(session: Session): Promise<boolean> {
    const userId = await this.getUserId()
    if (!userId) return false

    try {
      const { error } = await this.storageClient
        .from('agent_cloud_sessions')
        .update({
          status: session.status,
          title: session.title || null,
          working_branch: session.workingBranch || null,
          stats_additions: session.stats?.additions || 0,
          stats_deletions: session.stats?.deletions || 0,
          message_count: session.messageCount || 0,
        })
        .eq('id', session.id)
        .eq('user_id', userId)

      if (error) {
        console.error('[AgentCloudStorage] Error updating session:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[AgentCloudStorage] Error in updateSession:', error)
      return false
    }
  }

  /**
   * Delete a session and all its messages
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const userId = await this.getUserId()
    if (!userId) return false

    try {
      const { error } = await this.storageClient
        .from('agent_cloud_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId)

      if (error) {
        console.error('[AgentCloudStorage] Error deleting session:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[AgentCloudStorage] Error in deleteSession:', error)
      return false
    }
  }

  /**
   * Save messages for a session (append new messages)
   */
  async saveMessages(sessionId: string, lines: TerminalLine[], startIndex: number = 0): Promise<boolean> {
    const userId = await this.getUserId()
    if (!userId) return false

    try {
      // Only save new lines starting from startIndex
      const newLines = lines.slice(startIndex)
      if (newLines.length === 0) return true

      // Prepare messages
      const messages = newLines.map((line, idx) => ({
        session_id: sessionId,
        type: line.type,
        content: line.content,
        timestamp: line.timestamp.toISOString(),
        meta: line.meta || null,
      }))

      const { data: insertedMessages, error: messagesError } = await this.storageClient
        .from('agent_cloud_messages')
        .insert(messages)
        .select('id')

      if (messagesError) {
        console.error('[AgentCloudStorage] Error saving messages:', messagesError)
        return false
      }

      // Save images if any
      if (insertedMessages) {
        const imagesToInsert: Array<{ message_id: string; data: string; mime_type: string }> = []

        newLines.forEach((line, idx) => {
          if (line.images && line.images.length > 0 && insertedMessages[idx]) {
            line.images.forEach(img => {
              imagesToInsert.push({
                message_id: insertedMessages[idx].id,
                data: img.data,
                mime_type: img.type,
              })
            })
          }
        })

        if (imagesToInsert.length > 0) {
          const { error: imagesError } = await this.storageClient
            .from('agent_cloud_message_images')
            .insert(imagesToInsert)

          if (imagesError) {
            console.error('[AgentCloudStorage] Error saving images:', imagesError)
          }
        }
      }

      return true
    } catch (error) {
      console.error('[AgentCloudStorage] Error in saveMessages:', error)
      return false
    }
  }

  /**
   * Append a single message to a session
   */
  async appendMessage(sessionId: string, line: TerminalLine): Promise<boolean> {
    const userId = await this.getUserId()
    if (!userId) return false

    try {
      const { data: insertedMessage, error: messageError } = await this.storageClient
        .from('agent_cloud_messages')
        .insert({
          session_id: sessionId,
          type: line.type,
          content: line.content,
          timestamp: line.timestamp.toISOString(),
          meta: line.meta || null,
        })
        .select('id')
        .single()

      if (messageError) {
        console.error('[AgentCloudStorage] Error appending message:', messageError)
        return false
      }

      // Save images if any
      if (line.images && line.images.length > 0 && insertedMessage) {
        const imagesToInsert = line.images.map(img => ({
          message_id: insertedMessage.id,
          data: img.data,
          mime_type: img.type,
        }))

        const { error: imagesError } = await this.storageClient
          .from('agent_cloud_message_images')
          .insert(imagesToInsert)

        if (imagesError) {
          console.error('[AgentCloudStorage] Error saving images:', imagesError)
        }
      }

      return true
    } catch (error) {
      console.error('[AgentCloudStorage] Error in appendMessage:', error)
      return false
    }
  }

  /**
   * Load connector settings
   */
  async loadConnectors(): Promise<Map<string, { enabled: boolean; fields: Record<string, string> }>> {
    const userId = await this.getUserId()
    if (!userId) return new Map()

    try {
      const { data, error } = await this.storageClient
        .from('agent_cloud_connectors')
        .select('*')
        .eq('user_id', userId)

      if (error) {
        console.error('[AgentCloudStorage] Error loading connectors:', error)
        return new Map()
      }

      const result = new Map<string, { enabled: boolean; fields: Record<string, string> }>()
      for (const connector of (data || [])) {
        result.set(connector.connector_id, {
          enabled: connector.enabled,
          fields: connector.fields || {},
        })
      }

      return result
    } catch (error) {
      console.error('[AgentCloudStorage] Error in loadConnectors:', error)
      return new Map()
    }
  }

  /**
   * Save connector settings
   */
  async saveConnector(connectorId: string, enabled: boolean, fields: Record<string, string>): Promise<boolean> {
    const userId = await this.getUserId()
    if (!userId) return false

    try {
      const { error } = await this.storageClient
        .from('agent_cloud_connectors')
        .upsert({
          user_id: userId,
          connector_id: connectorId,
          enabled,
          fields,
        }, {
          onConflict: 'user_id,connector_id',
        })

      if (error) {
        console.error('[AgentCloudStorage] Error saving connector:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[AgentCloudStorage] Error in saveConnector:', error)
      return false
    }
  }

  /**
   * Save all connectors at once
   */
  async saveAllConnectors(connectors: ConnectorConfig[]): Promise<boolean> {
    const userId = await this.getUserId()
    if (!userId) return false

    try {
      // Only save connectors that have been modified (enabled or have field values)
      const connectorsToSave = connectors
        .filter(c => c.enabled || c.fields.some(f => f.value.trim()))
        .map(c => ({
          user_id: userId,
          connector_id: c.id,
          enabled: c.enabled,
          fields: Object.fromEntries(c.fields.map(f => [f.key, f.value])),
        }))

      if (connectorsToSave.length === 0) return true

      const { error } = await this.storageClient
        .from('agent_cloud_connectors')
        .upsert(connectorsToSave, {
          onConflict: 'user_id,connector_id',
        })

      if (error) {
        console.error('[AgentCloudStorage] Error saving connectors:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[AgentCloudStorage] Error in saveAllConnectors:', error)
      return false
    }
  }

  /**
   * Migrate data from localStorage to Supabase (one-time migration)
   */
  async migrateFromLocalStorage(storageKey: string): Promise<boolean> {
    const userId = await this.getUserId()
    if (!userId) return false

    try {
      const stored = localStorage.getItem(storageKey)
      if (!stored) return true // Nothing to migrate

      const parsed = JSON.parse(stored)

      // Migrate sessions
      if (parsed.sessions && Array.isArray(parsed.sessions)) {
        for (const session of parsed.sessions) {
          // Convert dates
          const convertedSession: Session = {
            ...session,
            createdAt: new Date(session.createdAt),
            lines: (session.lines || []).map((line: any) => ({
              ...line,
              timestamp: new Date(line.timestamp),
            })),
          }

          // Check if session already exists in Supabase
          const { data: existing } = await this.storageClient
            .from('agent_cloud_sessions')
            .select('id')
            .eq('id', session.id)
            .single()

          if (!existing) {
            await this.createSession(convertedSession)
          }
        }
      }

      // Migrate connectors
      if (parsed.connectors && Array.isArray(parsed.connectors)) {
        for (const connector of parsed.connectors) {
          const fields = Object.fromEntries(
            (connector.fields || []).map((f: any) => [f.key, f.value])
          )
          await this.saveConnector(connector.id, connector.enabled, fields)
        }
      }

      // Clear localStorage after successful migration
      localStorage.removeItem(storageKey)
      console.log('[AgentCloudStorage] Migration from localStorage complete')

      return true
    } catch (error) {
      console.error('[AgentCloudStorage] Error migrating from localStorage:', error)
      return false
    }
  }
}

// Singleton instance
export const agentCloudStorage = new AgentCloudStorage()
