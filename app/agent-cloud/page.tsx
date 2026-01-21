"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AgentCloudPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to new session page
    router.replace('/agent-cloud/new')
  }, [router])

  return null
}
