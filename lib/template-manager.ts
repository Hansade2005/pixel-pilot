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
      }
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
    },
    {
      id: 'forklift-navigator',
      title: 'Forklift Navigator',
      category: 'Prototype',
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
      }
    },
    {
      id: 'market-mosaic-online',
      title: 'Market Mosaic Online',
      category: 'Consumer App',
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
      }
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
        "react-intersection-observer": "^3.0.0"
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
  }

  static getAllTemplates(): TemplateProject[] {
    return this.TEMPLATES
  }

  static getTemplateById(id: string): TemplateProject | undefined {
    return this.TEMPLATES.find(t => t.id === id)
  }
}

export const templateManager = new TemplateManager()
