"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { storageManager } from "@/lib/storage-manager"

interface Project {
  id: string
  name: string
  thumbnail: string
  description: string
  category: string
  createdAt: string
}

// Helper function to generate thumbnail URLs
const generateThumbnailUrl = (projectName: string, description: string, seed: string) => {
  // Create a descriptive prompt based on project name and description
  const prompt = `${projectName}: ${description}. Modern web application interface, clean design, professional UI, technology focused`
  return `https://api.a0.dev/assets/image?text=${encodeURIComponent(prompt)}&aspect=16:9&seed=${seed}`
}

export function ProjectGrid() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Get current user
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Initialize storage manager and fetch workspaces
          await storageManager.init()
          const workspaces = await storageManager.getWorkspaces(user.id)

          // Convert workspaces to Project format
          const projectData: Project[] = workspaces
            .filter(workspace => !workspace.isTemplate) // Only show user projects, not templates
            .slice(0, 6) // Limit to 6 projects for the grid
            .map(workspace => {
              const seed = workspace.id.slice(-3) // Use last 3 chars of ID as seed for consistency
              const thumbnailUrl = generateThumbnailUrl(
                workspace.name,
                workspace.description || "A project created with PiPilot",
                seed
              )

              return {
                id: workspace.id,
                name: workspace.name,
                thumbnail: thumbnailUrl,
                description: workspace.description || "A project created with PiPilot",
                category: workspace.isPublic ? "Public" : "Private",
                createdAt: workspace.createdAt
              }
            })

          setProjects(projectData)
        }
      } catch (error) {
        console.error("Error fetching projects:", error)
        // Fallback to sample data if there's an error
        setProjects([
          {
            id: "sample-1",
            name: "E-commerce Dashboard",
            thumbnail: generateThumbnailUrl("E-commerce Dashboard", "Modern dashboard for managing online store with real-time analytics", "123"),
            description: "Modern dashboard for managing online store with real-time analytics",
            category: "Business",
            createdAt: new Date().toISOString()
          },
          {
            id: "sample-2",
            name: "Task Management App",
            thumbnail: generateThumbnailUrl("Task Management App", "Collaborative project management tool with real-time updates", "456"),
            description: "Collaborative project management tool with real-time updates",
            category: "Productivity",
            createdAt: new Date().toISOString()
          },
          {
            id: "sample-3",
            name: "Portfolio Website",
            thumbnail: generateThumbnailUrl("Portfolio Website", "Personal portfolio with modern design and smooth animations", "789"),
            description: "Personal portfolio with modern design and smooth animations",
            category: "Personal",
            createdAt: new Date().toISOString()
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  if (loading) {
    return (
      <section className="w-full max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Featured Projects
          </h2>
          <p className="text-white/70 text-lg">
            Loading your projects...
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-white/5 border-white/10 animate-pulse">
              <div className="aspect-video bg-white/10 rounded-t-lg"></div>
              <CardContent className="p-4">
                <div className="h-4 bg-white/10 rounded mb-2"></div>
                <div className="h-3 bg-white/10 rounded mb-1"></div>
                <div className="h-3 bg-white/10 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    )
  }

  if (projects.length === 0) {
    return (
      <section className="w-full max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Featured Projects
          </h2>
          <p className="text-white/70 text-lg">
            No projects yet. Start building something amazing!
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-4">
          Your Projects
        </h2>
        <p className="text-white/70 text-lg">
          Continue working on your amazing projects
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Link key={project.id} href={`/pc-workspace?projectId=${project.id}`} className="group">
            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden">
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={project.thumbnail}
                  alt={project.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {project.category}
                  </Badge>
                </div>
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ExternalLink className="w-5 h-5 text-white" />
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-blue-400 transition-colors">
                  {project.name}
                </h3>
                <p className="text-white/70 text-sm line-clamp-2">
                  {project.description}
                </p>
                <div className="mt-3 text-xs text-white/50">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}