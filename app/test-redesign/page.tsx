'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function RedesignTestPage() {
  const [url, setUrl] = useState('https://example.com')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testAPI = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('🧪 Testing redesign API with URL:', url)
      
      const response = await fetch('/api/redesign', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()
      
      console.log('📦 API Response:', data)
      
      if (!response.ok) {
        setError(data.error || 'Failed to fetch')
      } else {
        setResult(data)
      }
    } catch (err) {
      console.error('❌ Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Redesign API Test</CardTitle>
          <CardDescription>
            Test the Jina AI web scraping API to see what data we get for redesigning websites
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="Enter URL to test (e.g., https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
            <Button onClick={testAPI} disabled={loading || !url}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test API'
              )}
            </Button>
          </div>

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive font-semibold">❌ Error:</p>
                <pre className="mt-2 text-sm">{error}</pre>
              </CardContent>
            </Card>
          )}

          {result && (
            <Card className="border-green-500">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="font-semibold text-green-600">✅ Success!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Markdown Length: {result.markdown?.length || 0} characters
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-2">📄 Markdown Output:</p>
                  <div className="bg-muted p-4 rounded-lg max-h-96 overflow-auto">
                    <pre className="text-xs whitespace-pre-wrap">{result.markdown}</pre>
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2">🔍 Raw JSON:</p>
                  <div className="bg-muted p-4 rounded-lg max-h-64 overflow-auto">
                    <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
