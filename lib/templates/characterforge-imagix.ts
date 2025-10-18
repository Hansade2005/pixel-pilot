import type { File } from '../storage-manager'

export const characterForgeImagixFiles: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'src/App.tsx',
    path: 'src/App.tsx',
    content: `import React, { useState } from 'react'
import './index.css'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Wand2, Sparkles, Image as ImageIcon, Download } from 'lucide-react'

function App() {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [character, setCharacter] = useState(null)

  const handleGenerate = () => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    setTimeout(() => {
      setCharacter({
        imageUrl: 'https://api.a0.dev/assets/image?text=' + encodeURIComponent(prompt) + '&aspect=1:1&seed=' + Math.random()
      })
      setIsGenerating(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            CharacterForge Imagix
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Create stunning AI-powered characters with just a few words
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Wand2 className="mr-2 h-6 w-6" />
                  Character Creator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your character..."
                  className="w-full h-32 bg-white/5 border border-white/20 rounded-lg p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-5 w-5" />
                      Generate Character
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Quick Styles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setPrompt('Mystical elf warrior with glowing runes')}
                    className="bg-white/5 hover:bg-white/10 border-white/20 text-white hover:text-white p-4 h-auto flex-col items-start"
                  >
                    <div className="text-sm font-medium">Fantasy Warrior</div>
                    <div className="text-xs text-gray-400">Mystical elf warrior</div>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPrompt('Cyberpunk hacker with neon tattoos')}
                    className="bg-white/5 hover:bg-white/10 border-white/20 text-white hover:text-white p-4 h-auto flex-col items-start"
                  >
                    <div className="text-sm font-medium">Cyberpunk</div>
                    <div className="text-xs text-gray-400">Neon hacker</div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-center">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 w-full max-w-md">
              <CardContent className="p-8">
                {isGenerating ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <div className="w-8 h-8 bg-white rounded-full animate-ping"></div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-white">Creating Magic...</h3>
                    <p className="text-gray-300">AI is crafting your character</p>
                  </div>
                ) : character ? (
                  <div className="text-center">
                    <img
                      src={character.imageUrl}
                      alt="Generated character"
                      className="w-full h-64 object-cover rounded-lg mb-4"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/300x300?text=Character+Preview'
                      }}
                    />
                    <h3 className="text-lg font-semibold text-white">Your Character</h3>
                    <p className="text-sm text-gray-300 mt-2">Ready to download!</p>
                    <div className="flex gap-3 justify-center mt-4">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                        Share
                      </Button>
                    </div>
                  </div>
                ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="text-2xl">🎨</div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Ready to Create</h3>
                  <p className="text-gray-300">Describe your character to begin</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1200,
    isDirectory: false
  },
  {
    name: 'src/index.css',
    path: 'src/index.css',
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
    fileType: 'css',
    type: 'css',
    size: 100,
    isDirectory: false
  }
]
