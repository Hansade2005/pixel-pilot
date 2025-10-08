import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, CheckCircle, Copy, Terminal } from "lucide-react"
import Link from "next/link"

export default function QuickStartPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      
      <main className="flex-1 pt-20">
        {/* Breadcrumb */}
        <div className="border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Link href="/docs" className="hover:text-foreground">Documentation</Link>
              <span>/</span>
              <Link href="/docs#getting-started" className="hover:text-foreground">Getting Started</Link>
              <span>/</span>
              <span className="text-foreground">Quick Start</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Header */}
              <div>
                <Badge className="mb-4">Getting Started</Badge>
                <h1 className="text-4xl font-bold mb-4">Quick Start Guide</h1>
                <p className="text-xl text-muted-foreground">
                  Get up and running with PiPilot in under 5 minutes. Build your first AI-powered application with our intuitive platform.
                </p>
              </div>

              {/* Prerequisites */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Prerequisites
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <strong>Node.js 18+</strong> - Download from <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">nodejs.org</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <strong>Git</strong> - Version control system (optional but recommended)
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <strong>Code Editor</strong> - VS Code, WebStorm, or your preferred editor
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 1: Create Account */}
              <div className="space-y-4">
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
                  Create Your Account
                </h2>
                <p className="text-muted-foreground">
                  Sign up for a free account to get started with PiPilot.
                </p>
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <ol className="space-y-3 list-decimal list-inside">
                      <li>Navigate to the <Link href="/sign-up" className="text-primary hover:underline font-semibold">Sign Up page</Link></li>
                      <li>Enter your email and create a secure password</li>
                      <li>Verify your email address (check your inbox)</li>
                      <li>Complete your profile setup</li>
                    </ol>
                  </CardContent>
                </Card>
              </div>

              {/* Step 2: Create First Project */}
              <div className="space-y-4">
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
                  Create Your First Project
                </h2>
                <p className="text-muted-foreground">
                  Projects help you organize your databases, storage, and AI features.
                </p>
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <ol className="space-y-3 list-decimal list-inside">
                      <li>Click <strong>"New Project"</strong> from your dashboard</li>
                      <li>Give your project a name (e.g., "My First App")</li>
                      <li>Select your preferred region (closest to your users)</li>
                      <li>Click <strong>"Create Project"</strong></li>
                    </ol>
                    <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-sm text-blue-300">
                        <strong>💡 Tip:</strong> Your project will be ready in ~2 minutes. You'll get a PostgreSQL database, storage bucket, and API endpoints automatically.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Step 3: Get Connection String */}
              <div className="space-y-4">
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">3</span>
                  Get Your Connection Details
                </h2>
                <p className="text-muted-foreground">
                  Retrieve your database connection string and API keys.
                </p>
                <Card className="bg-muted/50">
                  <CardContent className="pt-6 space-y-4">
                    <ol className="space-y-3 list-decimal list-inside">
                      <li>Open your project dashboard</li>
                      <li>Navigate to <strong>Settings → Database</strong></li>
                      <li>Copy your connection string</li>
                    </ol>
                    <div className="bg-black/50 p-4 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">DATABASE_URL</span>
                        <Button variant="ghost" size="sm" className="h-6 text-xs">
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <code className="text-sm text-green-400 break-all">
                        postgresql://user:password@db.aiappbuilder.com:5432/dbname
                      </code>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Step 4: Install SDK */}
              <div className="space-y-4">
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">4</span>
                  Install the SDK
                </h2>
                <p className="text-muted-foreground">
                  Add the PiPilot SDK to your project.
                </p>
                <Tabs defaultValue="npm" className="w-full">
                  <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="npm">npm</TabsTrigger>
                    <TabsTrigger value="yarn">yarn</TabsTrigger>
                    <TabsTrigger value="pnpm">pnpm</TabsTrigger>
                  </TabsList>
                  <TabsContent value="npm">
                    <Card className="bg-black/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <Terminal className="h-4 w-4 text-muted-foreground" />
                          <Button variant="ghost" size="sm" className="h-6 text-xs">
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <code className="text-sm text-green-400">npm install @aiappbuilder/client</code>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="yarn">
                    <Card className="bg-black/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <Terminal className="h-4 w-4 text-muted-foreground" />
                          <Button variant="ghost" size="sm" className="h-6 text-xs">
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <code className="text-sm text-green-400">yarn add @aiappbuilder/client</code>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="pnpm">
                    <Card className="bg-black/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <Terminal className="h-4 w-4 text-muted-foreground" />
                          <Button variant="ghost" size="sm" className="h-6 text-xs">
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <code className="text-sm text-green-400">pnpm add @aiappbuilder/client</code>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Step 5: Write Your First Query */}
              <div className="space-y-4">
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">5</span>
                  Write Your First Query
                </h2>
                <p className="text-muted-foreground">
                  Connect to your database and run your first query.
                </p>
                <Tabs defaultValue="javascript" className="w-full">
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                  </TabsList>
                  <TabsContent value="javascript">
                    <Card className="bg-black/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">app.js</span>
                          <Button variant="ghost" size="sm" className="h-6 text-xs">
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <pre className="text-sm text-green-400 overflow-x-auto">
{`import { createClient } from '@aiappbuilder/client'

const client = createClient({
  projectUrl: 'https://your-project.aiappbuilder.com',
  apiKey: 'your-api-key'
})

// Create a table
await client.database.createTable('users', {
  id: 'uuid primary key default uuid_generate_v4()',
  name: 'text not null',
  email: 'text unique not null',
  created_at: 'timestamp default now()'
})

// Insert data
const { data, error } = await client
  .from('users')
  .insert({ name: 'John Doe', email: 'john@example.com' })

console.log('User created:', data)`}
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="python">
                    <Card className="bg-black/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">app.py</span>
                          <Button variant="ghost" size="sm" className="h-6 text-xs">
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <pre className="text-sm text-green-400 overflow-x-auto">
{`from aiappbuilder import Client

client = Client(
    project_url="https://your-project.aiappbuilder.com",
    api_key="your-api-key"
)

# Create a table
client.database.create_table("users", {
    "id": "uuid primary key default uuid_generate_v4()",
    "name": "text not null",
    "email": "text unique not null",
    "created_at": "timestamp default now()"
})

# Insert data
response = client.from_("users").insert({
    "name": "John Doe",
    "email": "john@example.com"
}).execute()

print("User created:", response.data)`}
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Next Steps */}
              <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
                <CardHeader>
                  <CardTitle>🎉 Congratulations!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    You've successfully set up your first PiPilot project. Here's what to explore next:
                  </p>
                  <div className="grid gap-3">
                    <Link href="/docs/getting-started/concepts">
                      <Button variant="outline" className="w-full justify-between">
                        Learn Core Concepts
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/docs/database/tables">
                      <Button variant="outline" className="w-full justify-between">
                        Working with Tables
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/docs/storage/upload">
                      <Button variant="outline" className="w-full justify-between">
                        Upload Files to Storage
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/docs/authentication/setup">
                      <Button variant="outline" className="w-full justify-between">
                        Add Authentication
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Table of Contents */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">On This Page</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <a href="#" className="block text-sm text-muted-foreground hover:text-foreground">Prerequisites</a>
                    <a href="#" className="block text-sm text-muted-foreground hover:text-foreground">1. Create Account</a>
                    <a href="#" className="block text-sm text-muted-foreground hover:text-foreground">2. Create Project</a>
                    <a href="#" className="block text-sm text-muted-foreground hover:text-foreground">3. Connection Details</a>
                    <a href="#" className="block text-sm text-muted-foreground hover:text-foreground">4. Install SDK</a>
                    <a href="#" className="block text-sm text-muted-foreground hover:text-foreground">5. First Query</a>
                    <a href="#" className="block text-sm text-muted-foreground hover:text-foreground">Next Steps</a>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
