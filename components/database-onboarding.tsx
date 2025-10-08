"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { 
  Check, 
  Copy, 
  Database, 
  Globe, 
  Zap, 
  ArrowRight, 
  Loader2,
  Server,
  Lock,
  Terminal,
  CheckCircle2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DatabaseOnboardingProps {
  open: boolean
  onClose: () => void
  userId?: string
}

export function DatabaseOnboarding({ open, onClose, userId }: DatabaseOnboardingProps) {
  const [step, setStep] = useState(1)
  const [projectName, setProjectName] = useState("")
  const [region, setRegion] = useState("us-east-1")
  const [isCreating, setIsCreating] = useState(false)
  const [connectionString, setConnectionString] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  const regions = [
    { value: "us-east-1", label: "US East (N. Virginia)", flag: "🇺🇸" },
    { value: "us-west-2", label: "US West (Oregon)", flag: "🇺🇸" },
    { value: "eu-west-1", label: "EU (Ireland)", flag: "🇪🇺" },
    { value: "ap-southeast-1", label: "Asia Pacific (Singapore)", flag: "🇸🇬" },
    { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)", flag: "🇯🇵" }
  ]

  const handleCreateProject = async () => {
    setIsCreating(true)
    
    // Simulate project creation
    await new Promise(resolve => setTimeout(resolve, 2500))
    
    // Generate mock credentials
    const mockConnectionString = `postgresql://user_${Math.random().toString(36).substr(2, 9)}:${Math.random().toString(36).substr(2, 16)}@db.aiappbuilder.com:5432/${projectName.toLowerCase().replace(/\s+/g, '_')}`
    const mockApiKey = `aab_${Math.random().toString(36).substr(2, 32)}`
    
    setConnectionString(mockConnectionString)
    setApiKey(mockApiKey)
    setIsCreating(false)
    setStep(3)
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleComplete = () => {
    onClose()
    // Redirect to project dashboard
    window.location.href = `/database/${projectName.toLowerCase().replace(/\s+/g, '-')}`
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Database className="h-5 w-5 text-white" />
            </div>
            Create Your Database
          </DialogTitle>
          <DialogDescription>
            Set up a production-ready PostgreSQL database in minutes
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-8 mt-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                step > s ? "bg-green-500 border-green-500 text-white" : 
                step === s ? "bg-purple-500 border-purple-500 text-white" : 
                "bg-muted border-muted-foreground/20 text-muted-foreground"
              )}>
                {step > s ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div className={cn(
                  "w-24 h-0.5 mx-2",
                  step > s ? "bg-green-500" : "bg-muted-foreground/20"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Project Details */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                placeholder="My Awesome App"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="text-lg"
              />
              <p className="text-sm text-muted-foreground">
                Choose a memorable name for your project
              </p>
            </div>

            <div className="space-y-2">
              <Label>Select Region</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {regions.map((r) => (
                  <Card
                    key={r.value}
                    className={cn(
                      "cursor-pointer transition-all hover:border-purple-500",
                      region === r.value && "border-purple-500 bg-purple-500/10"
                    )}
                    onClick={() => setRegion(r.value)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <span className="text-2xl">{r.flag}</span>
                      <div className="flex-1">
                        <div className="font-medium">{r.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.value === region && "✓ Selected"}
                        </div>
                      </div>
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Choose the region closest to your users for optimal performance
              </p>
            </div>

            <Button 
              onClick={() => setStep(2)} 
              disabled={!projectName.trim()}
              className="w-full"
              size="lg"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Configuration & Creation */}
        {step === 2 && (
          <div className="space-y-6">
            <Card className="border-purple-500/50 bg-purple-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-purple-500" />
                  Your Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Project Name</span>
                  <span className="font-medium">{projectName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Region</span>
                  <span className="font-medium">
                    {regions.find(r => r.value === region)?.label}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Database</span>
                  <span className="font-medium">PostgreSQL 15</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400">
                    Free Tier
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <Server className="h-8 w-8 text-blue-400 mb-2" />
                  <h3 className="font-semibold mb-1">Auto-Scaling</h3>
                  <p className="text-xs text-muted-foreground">
                    Automatically scales with your traffic
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Lock className="h-8 w-8 text-green-400 mb-2" />
                  <h3 className="font-semibold mb-1">Secure by Default</h3>
                  <p className="text-xs text-muted-foreground">
                    Row-level security enabled
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Zap className="h-8 w-8 text-yellow-400 mb-2" />
                  <h3 className="font-semibold mb-1">Real-time</h3>
                  <p className="text-xs text-muted-foreground">
                    Live data synchronization
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => setStep(1)} 
                variant="outline"
                className="flex-1"
                size="lg"
              >
                Back
              </Button>
              <Button 
                onClick={handleCreateProject}
                disabled={isCreating}
                className="flex-1"
                size="lg"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Database...
                  </>
                ) : (
                  <>
                    Create Database
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Connection Details */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Database Created!</h3>
              <p className="text-muted-foreground">
                Your database is ready to use. Save these credentials securely.
              </p>
            </div>

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Connection String
                </CardTitle>
                <CardDescription>
                  Use this to connect from your application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-black/50 p-4 rounded-lg border border-white/10">
                  <code className="text-xs sm:text-sm text-green-400 break-all">
                    {connectionString}
                  </code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(connectionString, "connection")}
                  className="w-full"
                >
                  {copied === "connection" ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Connection String
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  API Key
                </CardTitle>
                <CardDescription>
                  Use this for API authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-black/50 p-4 rounded-lg border border-white/10">
                  <code className="text-xs sm:text-sm text-green-400 break-all">
                    {apiKey}
                  </code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(apiKey, "api")}
                  className="w-full"
                >
                  {copied === "api" ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy API Key
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <div className="text-blue-400 mt-1">
                    💡
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 text-blue-300">Important</h4>
                    <p className="text-sm text-blue-200/80">
                      Store these credentials in a safe place. You can always find them in your project settings, 
                      but we recommend using environment variables in your application.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="pt-4">
              <Button 
                onClick={handleComplete}
                className="w-full"
                size="lg"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
