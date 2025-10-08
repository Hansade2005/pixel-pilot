import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { APIPlayground } from "@/components/api-playground"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, Code, Terminal } from "lucide-react"

export default function APIPlaygroundPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      
      <main className="flex-1 pt-20">
        {/* Header */}
        <div className="border-b bg-gradient-to-br from-purple-500/5 to-blue-500/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                <Terminal className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">API Playground</h1>
                <p className="text-muted-foreground mt-1">Test and explore your API endpoints</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-6">
              <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30">
                <Zap className="h-3 w-3 mr-1" />
                Real-time Testing
              </Badge>
              <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30">
                <Code className="h-3 w-3 mr-1" />
                Code Generation
              </Badge>
              <Badge variant="outline" className="bg-green-500/10 border-green-500/30">
                <Terminal className="h-3 w-3 mr-1" />
                Multiple Languages
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-lg">Getting Started</CardTitle>
                <CardDescription>
                  The API Playground allows you to test your endpoints without writing code. 
                  Configure your request, execute it, and see the response in real-time. 
                  You can also generate code snippets in multiple languages.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <APIPlayground />
        </div>
      </main>

      <Footer />
    </div>
  )
}
