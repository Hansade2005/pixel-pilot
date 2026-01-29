import { createBrowserClient } from "@supabase/ssr"

// External Supabase project for Agent Cloud storage
// This is separate from the main auth project to handle large session data
const AGENT_CLOUD_SUPABASE_URL = 'https://dlunpilhklsgvkegnnlp.supabase.co'
const AGENT_CLOUD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdW5waWxoa2xzZ3ZrZWdubmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTA0MTksImV4cCI6MjA3MDYyNjQxOX0.rhLN_bhvH9IWPkyHiohrOQbY9D34RSeSLzURhAyZPds'

export function createAgentCloudClient() {
  return createBrowserClient(AGENT_CLOUD_SUPABASE_URL, AGENT_CLOUD_SUPABASE_ANON_KEY)
}
