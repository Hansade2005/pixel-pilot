"use client"

import React from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Github, 
  Globe, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  Copy,
  Settings,
  Key,
  Users,
  Zap
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DeploymentSetupAccordionProps {
  platform: 'github' | 'vercel' | 'netlify'
  connectionStatus: 'checking' | 'connected' | 'not_connected' | 'connecting'
  onConnect?: () => void
}

export function DeploymentSetupAccordion({ 
  platform, 
  connectionStatus, 
  onConnect = () => {} // Default empty function
}: DeploymentSetupAccordionProps) {
  const { toast } = useToast()

  const platformConfig = {
    github: {
      name: "GitHub",
      icon: Github,
      color: "bg-black text-white",
      description: "Deploy to GitHub repositories with automatic workflows",
      setupSteps: [
        {
          title: "Configure GitHub Token",
          description: "Set up your GitHub personal access token in account settings",
          steps: [
            "Go to your Account Settings",
            "Navigate to the Deployment Tokens section",
            "Click 'Connect GitHub'",
            "Create a personal access token with 'repo' and 'workflow' scopes",
            "Save the token in your account settings"
          ],
          action: {
            label: "Go to Account Settings",
            url: "/workspace/account",
            onClick: null
          }
        }
      ],
      features: [
        "Repository creation and management",
        "GitHub Actions workflows",
        "Branch protection rules",
        "Team collaboration",
        "Issue and PR management"
      ]
    },
    vercel: {
      name: "Vercel",
      icon: Globe,
      color: "bg-black text-white",
      description: "Deploy to Vercel with automatic builds and CDN",
      setupSteps: [
        {
          title: "Configure Vercel Token",
          description: "Set up your Vercel personal access token in account settings",
          steps: [
            "Go to your Account Settings",
            "Navigate to the Deployment Tokens section",
            "Click 'Connect Vercel'",
            "Create a personal access token in Vercel",
            "Save the token in your account settings"
          ],
          action: {
            label: "Go to Account Settings",
            url: "/workspace/account",
            onClick: null
          }
        }
      ],
      features: [
        "Automatic builds and deployments",
        "Global CDN and edge functions",
        "Custom domains with SSL",
        "Environment variables",
        "Preview deployments"
      ]
    },
    netlify: {
      name: "Netlify",
      icon: Globe,
      color: "bg-green-600 text-white",
      description: "Deploy to Netlify with serverless functions and forms",
      setupSteps: [
        {
          title: "Configure Netlify Token",
          description: "Set up your Netlify personal access token in account settings",
          steps: [
            "Go to your Account Settings",
            "Navigate to the Deployment Tokens section",
            "Click 'Connect Netlify'",
            "Create a personal access token in Netlify",
            "Save the token in your account settings"
          ],
          action: {
            label: "Go to Account Settings",
            url: "/workspace/account",
            onClick: null
          }
        }
      ],
      features: [
        "Automatic builds and deployments",
        "Serverless functions",
        "Form handling",
        "Custom domains with SSL",
        "Branch deployments"
      ]
    }
  }

  const config = platformConfig[platform]
  const IconComponent = config.icon

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "Text copied successfully",
    })
  }

  const handleActionClick = (action: any) => {
    if (action.onClick) {
      action.onClick()
    } else if (action.url) {
      window.open(action.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="space-y-4">
      {/* Platform Header */}
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${config.color}`}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">{config.name}</h3>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        {connectionStatus === 'connected' && (
          <Badge variant="secondary" className="ml-auto">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )}
      </div>

      {/* Connection Status */}
      {connectionStatus === 'connected' ? (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Connected to {config.name}</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Ready to deploy your applications to {config.name}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {config.setupSteps.map((step, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    {index + 1}
                  </div>
                  <span className="font-medium">{step.title}</span>
                  {step.title.includes("Recommended") && (
                    <Badge variant="secondary" className="ml-2">
                      Recommended
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Steps:</h4>
                    <ol className="text-sm space-y-1">
                      {step.steps.map((stepText, stepIndex) => (
                        <li key={stepIndex} className="flex items-start space-x-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium mt-0.5">
                            {stepIndex + 1}
                          </span>
                          <span className="text-muted-foreground">{stepText}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <Button
                    onClick={() => handleActionClick(step.action)}
                    className="w-full"
                    variant={step.title.includes("Recommended") ? "default" : "outline"}
                  >
                    {step.action.label}
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Features */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center space-x-2">
          <Zap className="h-4 w-4" />
          <span>Features</span>
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {config.features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
              <span className="text-muted-foreground">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center space-x-2">
          <Settings className="h-4 w-4" />
          <span>Quick Links</span>
        </h4>
        <div className="flex flex-wrap gap-2">
          {platform === 'github' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://github.com/settings/tokens', '_blank')}
              >
                <Key className="h-3 w-3 mr-1" />
                GitHub Tokens
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://github.com/settings/applications', '_blank')}
              >
                <Users className="h-3 w-3 mr-1" />
                OAuth Apps
              </Button>
            </>
          )}
          {platform === 'vercel' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://vercel.com/account/tokens', '_blank')}
            >
              <Key className="h-3 w-3 mr-1" />
              Vercel Tokens
            </Button>
          )}
          {platform === 'netlify' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://app.netlify.com/user/applications#personal-access-tokens', '_blank')}
            >
              <Key className="h-3 w-3 mr-1" />
              Netlify Tokens
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
