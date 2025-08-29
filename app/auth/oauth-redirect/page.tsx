"use client"

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { storageManager } from '@/lib/storage-manager'
import { useToast } from '@/hooks/use-toast'

export default function OAuthRedirectPage() {
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const handle = async () => {
      try {
        // Parse hash fragment like: #provider=github&code=...&next=/workspace
        const hash = window.location.hash.replace(/^#/, '')
        const params = new URLSearchParams(hash)
        const provider = params.get('provider')
        const code = params.get('code')
        const next = params.get('next') || '/workspace'

        if (!provider || !code) {
          toast({ title: 'OAuth Error', description: 'Missing provider or code in redirect.' })
          router.push('/auth/login')
          return
        }

        // Exchange code for token via provider-specific endpoint
        // For simplicity, call a server proxy endpoint that performs the exchange
        // Endpoints expected: /api/auth/exchange?provider=github (POST body: { code })
        const exchangeResp = await fetch(`/api/auth/exchange?provider=${encodeURIComponent(provider)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        })

        if (!exchangeResp.ok) {
          const err = await exchangeResp.text()
          console.error('Token exchange failed', err)
          toast({ title: 'OAuth Error', description: 'Failed to exchange code for token.' })
          router.push('/auth/login')
          return
        }

        const data = await exchangeResp.json()
        const token = data.token

        if (!token) {
          toast({ title: 'OAuth Error', description: 'No token received from exchange.' })
          router.push('/auth/login')
          return
        }

        // Persist token to IndexedDB using storageManager
        await storageManager.init()
        // Example userId placeholder: 'local-user' - replace with actual user mapping if available
        const userId = data.userId || 'local-user'
        await storageManager.createToken({ userId, provider: provider!, token })

        toast({ title: 'Connected', description: `${provider} connected successfully.` })
        router.push(next)
      } catch (error) {
        console.error('OAuth redirect handler error', error)
        toast({ title: 'OAuth Error', description: 'Unexpected error during OAuth flow.' })
        router.push('/auth/login')
      }
    }

    handle()
  }, [router, toast])

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold">Finishing OAuth flow...</h2>
      <p className="text-sm text-muted-foreground">Please wait while we connect your account.</p>
    </div>
  )
}
