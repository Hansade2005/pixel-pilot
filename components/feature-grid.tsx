import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Code, Zap, Globe, GitBranch, Smartphone, Database, Shield, Palette } from "lucide-react"

const features = [
  {
    icon: MessageSquare,
    title: "Natural Language Interface",
    description: "Describe your app in plain English and watch it come to life instantly.",
  },
  {
    icon: Code,
    title: "Smart Code Generation",
    description: "AI generates clean, production-ready code following best practices.",
  },
  {
    icon: Zap,
    title: "Instant Preview",
    description: "See your changes in real-time with our integrated preview system.",
  },
  {
    icon: Globe,
    title: "One-Click Deployment",
    description: "Deploy to production with a single click using Vercel integration.",
  },
  {
    icon: GitBranch,
    title: "Version Control",
    description: "Built-in Git integration for seamless collaboration and versioning.",
  },
  {
    icon: Smartphone,
    title: "Responsive Design",
    description: "Every app is mobile-first and works perfectly on all devices.",
  },
  {
    icon: Database,
    title: "Database Integration",
    description: "Connect to Supabase, PostgreSQL, and other databases effortlessly.",
  },
  {
    icon: Shield,
    title: "Security First",
    description: "Built-in authentication, authorization, and security best practices.",
  },
  {
    icon: Palette,
    title: "Beautiful UI Components",
    description: "Access to a library of modern, customizable UI components.",
  },
]

export function FeatureGrid() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map((feature, index) => (
        <Card key={index} className="border border-border hover:border-accent/50 transition-colors">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 mb-4">
              <feature.icon className="h-6 w-6 text-accent" />
            </div>
            <CardTitle className="text-lg">{feature.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-muted-foreground">{feature.description}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
