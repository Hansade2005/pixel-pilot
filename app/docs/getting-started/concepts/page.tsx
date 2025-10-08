"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database, Server, Cloud, Lock, Zap, Code, FileJson, Users } from "lucide-react"
import Link from "next/link"

export default function CoreConceptsPage() {
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
              <span className="text-foreground">Core Concepts</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-12">
              {/* Header */}
              <div>
                <Badge className="mb-4">Getting Started</Badge>
                <h1 className="text-4xl font-bold mb-4">Core Concepts</h1>
                <p className="text-xl text-muted-foreground">
                  Understand the fundamental building blocks of PiPilot and how they work together to power your applications.
                </p>
              </div>

              {/* Projects */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                    <Server className="h-6 w-6 text-purple-400" />
                  </div>
                  <h2 className="text-3xl font-bold">Projects</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  A <strong>Project</strong> is the top-level container for your application. Each project includes:
                </p>
                <Card className="bg-muted/50">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start gap-3">
                      <Database className="h-5 w-5 text-blue-400 mt-0.5" />
                      <div>
                        <strong className="text-foreground">PostgreSQL Database</strong>
                        <p className="text-sm text-muted-foreground">Fully managed, production-ready relational database</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Cloud className="h-5 w-5 text-green-400 mt-0.5" />
                      <div>
                        <strong className="text-foreground">Storage Bucket</strong>
                        <p className="text-sm text-muted-foreground">Scalable object storage for files and media</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Lock className="h-5 w-5 text-orange-400 mt-0.5" />
                      <div>
                        <strong className="text-foreground">Authentication System</strong>
                        <p className="text-sm text-muted-foreground">Built-in user authentication and authorization</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-yellow-400 mt-0.5" />
                      <div>
                        <strong className="text-foreground">API Endpoints</strong>
                        <p className="text-sm text-muted-foreground">Auto-generated REST and GraphQL APIs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-300">
                    <strong>💡 Best Practice:</strong> Create separate projects for development, staging, and production environments. This ensures clean separation and prevents accidental data loss.
                  </p>
                </div>
              </div>

              {/* Database */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                    <Database className="h-6 w-6 text-blue-400" />
                  </div>
                  <h2 className="text-3xl font-bold">Database</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Every project comes with a <strong>PostgreSQL database</strong> that's ready to use. Key features:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Tables & Schemas</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Create tables with custom schemas, define relationships, and use advanced PostgreSQL features like JSONB, arrays, and full-text search.
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Row Level Security</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Define granular access policies at the row level. Control who can read, insert, update, or delete specific rows based on user context.
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Real-time Subscriptions</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Listen to database changes in real-time. Perfect for building collaborative apps, live dashboards, and notification systems.
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Extensions</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Enable powerful PostgreSQL extensions like PostGIS for geospatial data, pg_cron for scheduled jobs, and pgvector for AI embeddings.
                    </CardContent>
                  </Card>
                </div>
                <Card className="bg-black/50">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground mb-2">Example: Creating a table with relationships</p>
                    <pre className="text-sm text-green-400 overflow-x-auto">
{`// Create users table
await client.database.createTable('users', {
  id: 'uuid primary key default uuid_generate_v4()',
  name: 'text not null',
  email: 'text unique not null'
})

// Create posts table with foreign key
await client.database.createTable('posts', {
  id: 'uuid primary key default uuid_generate_v4()',
  user_id: 'uuid references users(id) on delete cascade',
  title: 'text not null',
  content: 'text',
  created_at: 'timestamp default now()'
})`}
                    </pre>
                  </CardContent>
                </Card>
              </div>

              {/* Storage */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
                    <Cloud className="h-6 w-6 text-green-400" />
                  </div>
                  <h2 className="text-3xl font-bold">Storage</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>Storage</strong> provides S3-compatible object storage for handling files, images, videos, and any other media.
                </p>
                <Card className="bg-muted/50">
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Buckets</h3>
                      <p className="text-sm text-muted-foreground">
                        Organize files into buckets (similar to folders). Each bucket can have its own access policies and settings.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Public vs Private Files</h3>
                      <p className="text-sm text-muted-foreground">
                        <strong>Public files</strong> are accessible via direct URLs. <strong>Private files</strong> require authentication and use signed URLs with expiration times.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Automatic Image Optimization</h3>
                      <p className="text-sm text-muted-foreground">
                        Resize, crop, and transform images on-the-fly using URL parameters. No need for manual processing.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Authentication */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
                    <Lock className="h-6 w-6 text-orange-400" />
                  </div>
                  <h2 className="text-3xl font-bold">Authentication</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Built-in <strong>authentication system</strong> that handles user registration, login, password reset, and session management.
                </p>
                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Multiple Auth Providers
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                      <p>Support for various authentication methods:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Email & Password</li>
                        <li>Magic Link (passwordless)</li>
                        <li>OAuth (Google, GitHub, etc.)</li>
                        <li>Phone/SMS</li>
                        <li>Single Sign-On (SSO)</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        JWT Tokens
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Secure JSON Web Tokens (JWT) for stateless authentication. Tokens are automatically refreshed and include user metadata for easy access control.
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* API */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30">
                    <Code className="h-6 w-6 text-pink-400" />
                  </div>
                  <h2 className="text-3xl font-bold">Auto-Generated APIs</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Your database schema automatically generates RESTful API endpoints. No need to write backend code.
                </p>
                <Card className="bg-black/50">
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">GET - Fetch all records</p>
                      <code className="text-sm text-green-400">GET /api/v1/users</code>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">GET - Fetch single record</p>
                      <code className="text-sm text-green-400">GET /api/v1/users/:id</code>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">POST - Create new record</p>
                      <code className="text-sm text-green-400">POST /api/v1/users</code>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">PATCH - Update record</p>
                      <code className="text-sm text-green-400">PATCH /api/v1/users/:id</code>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">DELETE - Remove record</p>
                      <code className="text-sm text-green-400">DELETE /api/v1/users/:id</code>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Data Flow */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                    <FileJson className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h2 className="text-3xl font-bold">How It All Works Together</h2>
                </div>
                <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold flex-shrink-0">1</span>
                        <div>
                          <h3 className="font-semibold mb-1">Client requests data</h3>
                          <p className="text-sm text-muted-foreground">Your app makes a request using the SDK or direct API call</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold flex-shrink-0">2</span>
                        <div>
                          <h3 className="font-semibold mb-1">Authentication check</h3>
                          <p className="text-sm text-muted-foreground">JWT token is validated, user context is established</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold flex-shrink-0">3</span>
                        <div>
                          <h3 className="font-semibold mb-1">Authorization policies</h3>
                          <p className="text-sm text-muted-foreground">Row Level Security policies determine what data user can access</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold flex-shrink-0">4</span>
                        <div>
                          <h3 className="font-semibold mb-1">Query execution</h3>
                          <p className="text-sm text-muted-foreground">Database query runs with optimized performance</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold flex-shrink-0">5</span>
                        <div>
                          <h3 className="font-semibold mb-1">Response returned</h3>
                          <p className="text-sm text-muted-foreground">Data is formatted and sent back to your application</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Next Steps */}
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle>Ready to Build?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">
                    Now that you understand the core concepts, explore specific features:
                  </p>
                  <div className="grid gap-2">
                    <Link href="/docs/database/tables">
                      <Button variant="outline" className="w-full justify-start">
                        <Database className="h-4 w-4 mr-2" />
                        Database Tables & Queries
                      </Button>
                    </Link>
                    <Link href="/docs/storage/upload">
                      <Button variant="outline" className="w-full justify-start">
                        <Cloud className="h-4 w-4 mr-2" />
                        File Upload & Storage
                      </Button>
                    </Link>
                    <Link href="/docs/authentication/setup">
                      <Button variant="outline" className="w-full justify-start">
                        <Lock className="h-4 w-4 mr-2" />
                        User Authentication
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">On This Page</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <a href="#" className="block text-sm text-muted-foreground hover:text-foreground">Projects</a>
                    <a href="#" className="block text-sm text-muted-foreground hover:text-foreground">Database</a>
                    <a href="#" className="block text-sm text-muted-foreground hover:text-foreground">Storage</a>
                    <a href="#" className="block text-sm text-muted-foreground hover:text-foreground">Authentication</a>
                    <a href="#" className="block text-sm text-muted-foreground hover:text-foreground">APIs</a>
                    <a href="#" className="block text-sm text-muted-foreground hover:text-foreground">Data Flow</a>
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
