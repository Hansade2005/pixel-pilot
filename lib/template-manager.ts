// Template Manager for handling pre-built template projects
import { storageManager } from './storage-manager'
import type { Workspace, File } from './storage-manager'
import { baseTemplateFiles } from './templates/base-template'
import { cryptoTradingDashboardFiles } from './templates/crypto-trading-dashboard'
import { characterForgeImagixFiles } from './templates/characterforge-imagix'
import { forkliftNavigatorFiles } from './templates/forklift-navigator'
import { marketMosaicOnlineFiles } from './templates/market-mosaic-online'
import { pskServicesFiles } from './templates/psk-services'
import { pulseRobotTemplateFiles } from './templates/pulse-robot-template'
import { landingSimulatorSorceryFiles } from './templates/landing-simulator-sorcery'
import { cortexSecondBrainFiles } from './templates/cortex-second-brain'
import { saasTemplateFiles } from './templates/saas-template'
import { ecommercePlatformFiles } from './templates/ecommerce-platform'
import { chatApplicationFiles } from './templates/chat-application'
import { financeTrackerFiles } from './templates/finance-tracker'

// Type declaration for JSZip
declare global {
  interface Window {
    JSZip?: any
  }
}

export interface TemplateProject {
  id: string
  title: string
  category: string
  description: string
  author: string
  authorAvatar: string
  remixes: number
  thumbnailUrl: string
  files: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[]
  additionalPackages?: { [key: string]: string }
  createdAt?: Date
}

export class TemplateManager {
  private static readonly TEMPLATES: TemplateProject[] = [
    {
      id: 'crypto-trading-dashboard',
      title: 'Cryptocurrency Trading Dashboard',
      category: 'Website',
      description: 'Advanced trading interface with real-time charts',
      author: 'Hans Ade',
      authorAvatar: '/hans.png',
      remixes: 17024,
      thumbnailUrl: 'https://api.a0.dev/assets/image?text=Cryptocurrency Trading Dashboard with real-time charts, trading interface, price graphs, buy sell buttons, market data, professional design&aspect=1:1&seed=123',
      files: cryptoTradingDashboardFiles,
      additionalPackages: {

        "d3": "^7.8.5",
        "@visx/visx": "^3.3.0",
        "socket.io-client": "^4.7.5",
      },
      createdAt: new Date('2024-01-15')
    },
    {
      id: 'characterforge-imagix',
      title: 'CharacterForge Imagix',
      category: 'Consumer App',
      description: 'AI-powered character creation platform',
      author: 'Hans Ade',
      authorAvatar: '/hans.png',
      remixes: 7421,
      thumbnailUrl: 'https://api.a0.dev/assets/image?text=AI character creation platform, 3D character models, customization tools, fantasy art generator, character builder interface, magical effects&aspect=1:1&seed=456',
      files: characterForgeImagixFiles,
      createdAt: new Date('2024-02-20')
    },
    {
      id: 'forklift-navigator',
      title: 'Forklift Navigator',
      category: 'Internal Tools',
      description: 'Dashboard de Controle for logistics',
      author: 'Hans Ade',
      authorAvatar: '/hans.png',
      remixes: 3000,
      thumbnailUrl: 'https://api.a0.dev/assets/image?text=Logistics dashboard, forklift navigation system, warehouse management, inventory control, route optimization, real-time tracking, industrial design&aspect=1:1&seed=456',
      files: forkliftNavigatorFiles,
      additionalPackages: {

        "leaflet": "^1.9.4",
        "react-leaflet": "^4.2.1",
        "socket.io-client": "^4.7.5",
        "react-flow": "^11.10.1",
      },
      createdAt: new Date('2024-03-10')
    },
    {
      id: 'market-mosaic-online',
      title: 'Market Mosaic Online',
      category: 'B2B App',
      description: 'Complex dashboard with analytics',
      author: 'Hans Ade',
      authorAvatar: '/hans.png',
      remixes: 7109,
      thumbnailUrl: 'https://api.a0.dev/assets/image?text=Market analytics dashboard, data visualization, charts and graphs, financial reports, market trends, business intelligence, modern UI&aspect=1:1&seed=789',
      files: marketMosaicOnlineFiles,
      additionalPackages: {

        "d3": "^7.8.5",
        "@visx/visx": "^3.3.0",
        "react-pdf": "^8.0.2",
      },
      createdAt: new Date('2024-04-05')
    },
    {
      id: 'psk-services',
      title: 'PSK Services',
      category: 'Website',
      description: 'Elevate Your Event Experience',
      author: 'Hans Ade',
      authorAvatar: '/hans.png',
      remixes: 4521,
      thumbnailUrl: 'https://api.a0.dev/assets/image?text=Event services website, elegant design, party planning, event management, luxury experience, booking system, professional layout&aspect=1:1&seed=101',
      files: pskServicesFiles,
    },
    {
      id: 'pulse-robot-template',
      title: 'Pulse Robot Template',
      category: 'Website',
      description: 'Atlas: Where Code Meets Motion',
      author: 'Hans Ade',
      authorAvatar: '/hans.png',
      remixes: 3890,
      thumbnailUrl: 'https://api.a0.dev/assets/image?text=Robot template website, futuristic design, AI technology, mechanical engineering, automation, robotics interface, tech innovation&aspect=1:1&seed=202',
      files: pulseRobotTemplateFiles,
    },
    {
      id: 'landing-simulator-sorcery',
      title: 'Landing Simulator Sorcery',
      category: 'Website',
      description: 'Create Games With Just a Prompt',
      author: 'Hans Ade',
      authorAvatar: '/hans.png',
      remixes: 6234,
      thumbnailUrl: 'https://api.a0.dev/assets/image?text=Game creation platform, magical interface, prompt-based game design, fantasy elements, interactive landing page, creative tools&aspect=1:1&seed=303',
      files: landingSimulatorSorceryFiles,
      additionalPackages: {
       
        "fabric": "^6.0.0",             
        "three": "^0.158.0",             
        "react-colorful": "^5.6.1",      
        "react-beautiful-dnd": "^13.1.1", 
      }
    },
    {
      id: 'cortex-second-brain',
      title: 'Cortex Second Brain',
      category: 'Consumer App',
      description: 'Your Personal AI Engine',
      author: 'Hans Ade',
      authorAvatar: '/hans.png',
      remixes: 8912,
      thumbnailUrl: 'https://api.a0.dev/assets/image?text=AI second brain application, knowledge management, neural network visualization, smart assistant, memory system, intelligent interface&aspect=1:1&seed=404',
      files: cortexSecondBrainFiles,
      additionalPackages: {
       
        "react-flow": "^11.10.1",        
        "d3": "^7.8.5",                  
        "@visx/visx": "^3.3.0",           
        "socket.io-client": "^4.7.5",     
      }
    },
    {
      id: 'ecommerce-platform',
      title: 'AI-Powered E-commerce Platform',
      category: 'Website',
      description: 'Complete e-commerce solution with product management, shopping cart, and payment integration',
      author: 'Hans Ade',
      authorAvatar: '/hans.png',
      remixes: 18000,
      thumbnailUrl: 'https://api.a0.dev/assets/image?text=AI-powered e-commerce platform with product catalog, shopping cart, secure checkout, user dashboard, payment processing, modern UI&aspect=1:1&seed=2000',
      files: ecommercePlatformFiles,
      additionalPackages: {
        "react-router-dom": "^6.8.1",
        "lucide-react": "^0.263.1"
      }
    },
    {
      id: 'chat-application',
      title: 'Real-time Chat Application',
      category: 'Consumer App',
      description: 'Modern chat app with real-time messaging, user authentication, and file sharing',
      author: 'Hans Ade',
      authorAvatar: '/hans.png',
      remixes: 15000,
      thumbnailUrl: 'https://api.a0.dev/assets/image?text=Real-time chat application with messaging interface, user profiles, online status, message bubbles, chat rooms, modern UI&aspect=1:1&seed=3000',
      files: chatApplicationFiles,
      additionalPackages: {
        "react-router-dom": "^6.8.1",
        "lucide-react": "^0.263.1"
      }
    },
    {
      id: 'finance-tracker',
      title: 'Personal Finance Tracker',
      category: 'Consumer App',
      description: 'Complete personal finance management tool with budgeting, goals, and expense tracking',
      author: 'Hans Ade',
      authorAvatar: '/hans.png',
      remixes: 12000,
      thumbnailUrl: 'https://api.a0.dev/assets/image?text=Personal finance tracker with dashboard, budget planning, expense tracking, financial goals, reports, money management&aspect=1:1&seed=4000',
      files: financeTrackerFiles,
      additionalPackages: {
        "react-router-dom": "^6.8.1",
        "lucide-react": "^0.263.1"
      }
    },
    {
      id: 'saas-template',
      title: 'SaaS Template',
      category: 'SaaS',
      description: 'Complete SaaS solution with Supabase auth, Stripe payments, and dashboard',
      author: 'Hans Ade',
      authorAvatar: '/hans.png',
      remixes: 2500,
      thumbnailUrl: 'https://api.a0.dev/assets/image?text=SaaS template with authentication, payments, dashboard, user management, subscription system, modern UI&aspect=1:1&seed=1000',
      files: saasTemplateFiles,
      additionalPackages: {
        "react-intersection-observer": "^9.16.0"
      }
    }
  ]

  static async applyTemplate(templateId: string, workspaceId: string): Promise<void> {
    const template = this.TEMPLATES.find(t => t.id === templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    await storageManager.init()

    // First, apply all base template files (package.json, index.html, configs, shadcn/ui components)
    for (const file of baseTemplateFiles) {
      // If this is package.json and template has additional packages, merge them
      if (file.name === 'package.json' && template.additionalPackages) {
        const basePackageJson = JSON.parse(file.content)
        const enhancedPackageJson = {
          ...basePackageJson,
          dependencies: {
            ...basePackageJson.dependencies,
            ...template.additionalPackages
          }
        }

        await storageManager.createFile({
          ...file,
          content: JSON.stringify(enhancedPackageJson, null, 2),
          workspaceId,
          fileType: file.fileType || 'json',
          type: file.type || file.fileType || 'json',
          size: JSON.stringify(enhancedPackageJson, null, 2).length,
          isDirectory: false
        })
      } else {
        // Ensure all required properties are present
        const fileData = {
          ...file,
          workspaceId,
          fileType: file.fileType || 'unknown',
          type: file.type || file.fileType || 'unknown',
          size: file.size || file.content.length,
          isDirectory: file.isDirectory || false
        }
        await storageManager.createFile(fileData)
      }
    }

    // Then, apply template-specific files
    for (const file of template.files) {
      // Ensure all required properties are present
      const fileData = {
        ...file,
        workspaceId,
        fileType: file.fileType || 'unknown',
        type: file.type || file.fileType || 'unknown',
        size: file.size || file.content.length,
        isDirectory: file.isDirectory || false
      }
      await storageManager.createFile(fileData)
    }

    // Emit files-changed event to notify UI components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('files-changed', { 
        detail: { projectId: workspaceId } 
      }))
    }
  }

  static getAllTemplates(): TemplateProject[] {
    return this.TEMPLATES
  }

  static getTemplateById(id: string): TemplateProject | undefined {
    return this.TEMPLATES.find(t => t.id === id)
  }
}

// Template ZIP Download Utility
export class TemplateDownloader {
  private static async ensureJSZipLoaded(): Promise<void> {
    // Load JSZip from CDN if not already loaded
    if (typeof window !== 'undefined' && !(window as any).JSZip) {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
      script.async = true
      document.head.appendChild(script)

      await new Promise((resolve) => {
        const       checkJSZip = () => {
        if ((window as any).JSZip) {
          resolve(void 0)
        } else {
          setTimeout(checkJSZip, 100)
        }
      }
        checkJSZip()
      })
    }

    if (!(window as any).JSZip) {
      throw new Error('JSZip library not loaded')
    }
  }

  static async downloadTemplateAsZip(templateId: string): Promise<void> {
    try {
      await this.ensureJSZipLoaded()

      const template = TemplateManager.getTemplateById(templateId)
      if (!template) {
        throw new Error(`Template ${templateId} not found`)
      }

      if (!(window as any).JSZip) {
        throw new Error('JSZip library not loaded')
      }

      // Create new ZIP instance
      const zip = new (window as any).JSZip()

      // Get all files from the template (both base and template-specific)
      const allFiles = [
        ...baseTemplateFiles,
        ...template.files
      ]

      console.log(`Template Export: Found ${allFiles.length} files for ${template.title}`)

      if (allFiles.length === 0) {
        throw new Error('No files found in template')
      }

      // Track export statistics
      let filesExported = 0
      let filesSkipped = 0
      let emptyFiles = 0

      // Create directory structure in ZIP
      const createdDirs = new Set<string>()

      // First pass: create all directory structures
      for (const file of allFiles) {
        if (file.isDirectory) {
          const dirPath = file.path.endsWith('/') ? file.path : file.path + '/'
          if (!createdDirs.has(dirPath)) {
            zip.folder(dirPath)
            createdDirs.add(dirPath)
          }
        }
      }

      // Second pass: add all files
      for (const file of allFiles) {
        try {
          // Skip directories (already handled above)
          if (file.isDirectory) continue

          // Ensure parent directories exist in ZIP
          const pathParts = file.path.split('/')
          const fileName = pathParts.pop() || file.name
          let currentPath = ''

          for (let i = 0; i < pathParts.length; i++) {
            currentPath += pathParts[i] + '/'
            if (!createdDirs.has(currentPath)) {
              zip.folder(currentPath)
              createdDirs.add(currentPath)
            }
          }

          // Handle different content scenarios
          if (file.content && file.content.trim().length > 0) {
            // File has content
            zip.file(file.path, file.content)
            filesExported++
          } else if (file.content === '' || file.content === null || file.content === undefined) {
            // Empty file - still include it
            zip.file(file.path, '')
            emptyFiles++
          } else {
            // File has some content
            zip.file(file.path, file.content)
            filesExported++
          }
        } catch (fileError) {
          console.warn(`Failed to export file ${file.path}:`, fileError)
          filesSkipped++
        }
      }

      console.log(`Template export complete: ${filesExported} files exported, ${emptyFiles} empty files included, ${filesSkipped} files skipped`)

      // Generate ZIP content
      const zipContent = await zip.generateAsync({ type: 'uint8array' })

      // Create blob and download
      const blob = new Blob([zipContent], { type: 'application/zip' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${template.title.replace(/[^a-zA-Z0-9]/g, '-')}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      console.log(`Template ${template.title} downloaded successfully as ZIP`)

    } catch (error) {
      console.error('Template download error:', error)
      throw error
    }
  }
}

export const templateManager = new TemplateManager()
