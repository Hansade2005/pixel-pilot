'use client'

import { useState, useRef } from 'react'

export default function TestVisionPage() {
  const [image, setImage] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('What do you see in this image?')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [model, setModel] = useState('mistral/devstral-2')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setImage(event.target?.result as string)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (event) => {
            setImage(event.target?.result as string)
            setError('')
          }
          reader.readAsDataURL(file)
        }
        break
      }
    }
  }

  const sendMessage = async () => {
    if (!image) {
      setError('Please upload an image first')
      return
    }

    setLoading(true)
    setError('')
    setResponse('')

    try {
      const messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', image: image }
          ]
        }
      ]

      const res = await fetch('/api/chat-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          modelId: model,
          projectId: 'test-vision',
          files: {},
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`API Error: ${res.status} - ${errorText}`)
      }

      // Handle streaming response
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let fullResponse = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        // Parse SSE format
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('0:')) {
            // Text content
            try {
              const text = JSON.parse(line.slice(2))
              fullResponse += text
              setResponse(fullResponse)
            } catch {
              // Not JSON, might be raw text
              fullResponse += line.slice(2)
              setResponse(fullResponse)
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8" onPaste={handlePaste}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Vision Model Test</h1>
        <p className="text-gray-400 mb-8">Test Devstral and other models with image input</p>

        <div className="space-y-6">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="mistral/devstral-2">Mistral Devstral 2 (123B)</option>
              <option value="mistral/devstral-small-2">Mistral Devstral Small 2 (24B)</option>
              <option value="pixtral-12b-2409">Pixtral 12B</option>
              <option value="anthropic/claude-sonnet-4.5">Claude Sonnet 4.5</option>
              <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
            </select>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Image</label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                image ? 'border-green-500 bg-green-500/10' : 'border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {image ? (
                <div className="space-y-4">
                  <img
                    src={image}
                    alt="Uploaded"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <p className="text-green-400">Image loaded. Click to change.</p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-400">Click to upload or paste an image (Ctrl+V)</p>
                  <p className="text-sm text-gray-500 mt-2">Supports PNG, JPG, GIF, WebP</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium mb-2">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What do you want to ask about the image?"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={sendMessage}
            disabled={loading || !image}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
              loading || !image
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? 'Processing...' : 'Send to Model'}
          </button>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
              <p className="text-red-400 font-medium">Error</p>
              <p className="text-red-300 text-sm mt-1 whitespace-pre-wrap">{error}</p>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-400 font-medium mb-2">Response from {model}</p>
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm">{response}</pre>
              </div>
            </div>
          )}

          {/* Debug Info */}
          <div className="text-xs text-gray-500 mt-8">
            <p>Debug Info:</p>
            <ul className="list-disc list-inside mt-1">
              <li>Image loaded: {image ? 'Yes' : 'No'}</li>
              <li>Image size: {image ? `${Math.round(image.length / 1024)} KB` : 'N/A'}</li>
              <li>Model: {model}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
