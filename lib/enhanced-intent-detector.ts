// Enhanced Intent Detection with Autonomous Planning Integration
// This system combines intent detection with autonomous planning for complex application development

import { generateText } from 'ai'
import { getModel } from '@/lib/ai-providers'
// Removed autonomous planner dependency - using direct instructions instead
import { KnowledgeBase } from './knowledge-base'

export interface EnhancedIntentData {
  // Basic intent information
  intent: string
  required_tools: string[]
  file_operations: string[]
  complexity: 'simple' | 'medium' | 'complex' | 'enterprise'
  action_plan: string[]
  confidence: number
  tool_usage_rules: string
  enforcement_notes: string
  
  // Enhanced autonomous planning data
  requires_autonomous_planning: boolean
  autonomous_instructions?: string
  execution_mode: 'simple_tools' | 'autonomous_execution' | 'hybrid'
  project_type?: string
  estimated_duration: string
  required_technologies: string[]
  quality_requirements: string[]
  
  // Planning metadata
  planning_confidence: number
  risk_assessment: 'low' | 'medium' | 'high'
  user_involvement_required: boolean
  fallback_strategy: string
}

export interface ComplexApplicationPattern {
  keywords: string[]
  project_type: string
  requires_autonomous_planning: boolean
  typical_components: string[]
  typical_pages: string[]
  required_features: string[]
  complexity_indicators: string[]
}

// Patterns that indicate complex applications requiring autonomous planning
const COMPLEX_APPLICATION_PATTERNS: ComplexApplicationPattern[] = [
  {
    keywords: ['ecommerce', 'e-commerce', 'online store', 'shopping', 'marketplace', 'store'],
    project_type: 'ecommerce',
    requires_autonomous_planning: true,
    typical_components: ['ProductCard', 'Cart', 'Checkout', 'PaymentForm', 'ProductList', 'CategoryFilter'],
    typical_pages: ['HomePage', 'ProductsPage', 'ProductDetailPage', 'CartPage', 'CheckoutPage'],
    required_features: ['product catalog', 'shopping cart', 'checkout process', 'payment integration'],
    complexity_indicators: ['multiple pages', 'state management', 'payment processing', 'inventory management']
  },
  {
    keywords: ['social media', 'social network', 'social platform', 'chat app', 'messaging'],
    project_type: 'social_media',
    requires_autonomous_planning: true,
    typical_components: ['Post', 'Comment', 'UserProfile', 'Feed', 'MessageThread', 'Notification'],
    typical_pages: ['HomePage', 'ProfilePage', 'FeedPage', 'MessagesPage', 'SettingsPage'],
    required_features: ['user profiles', 'posts and comments', 'real-time messaging', 'notifications'],
    complexity_indicators: ['user authentication', 'real-time updates', 'content management', 'social interactions']
  },
  {
    keywords: ['dashboard', 'admin panel', 'analytics', 'data visualization', 'reporting'],
    project_type: 'dashboard',
    requires_autonomous_planning: true,
    typical_components: ['Chart', 'DataTable', 'KPICard', 'FilterPanel', 'DatePicker', 'ExportButton'],
    typical_pages: ['DashboardPage', 'AnalyticsPage', 'ReportsPage', 'SettingsPage'],
    required_features: ['data visualization', 'filtering and search', 'export functionality', 'real-time updates'],
    complexity_indicators: ['data processing', 'multiple charts', 'complex filtering', 'performance optimization']
  },
  {
    keywords: ['blog', 'cms', 'content management', 'publishing platform', 'articles'],
    project_type: 'blog_cms',
    requires_autonomous_planning: true,
    typical_components: ['ArticleCard', 'Editor', 'CategoryTag', 'SearchBar', 'Pagination', 'CommentSection'],
    typical_pages: ['HomePage', 'ArticlePage', 'CategoryPage', 'AuthorPage', 'SearchPage'],
    required_features: ['article management', 'categories and tags', 'search functionality', 'comment system'],
    complexity_indicators: ['content editing', 'SEO optimization', 'user management', 'search functionality']
  },
  {
    keywords: ['portfolio', 'personal website', 'showcase', 'professional site'],
    project_type: 'portfolio',
    requires_autonomous_planning: false, // Simpler, can use regular tools
    typical_components: ['ProjectCard', 'SkillBadge', 'ContactForm', 'Hero', 'About', 'Testimonial'],
    typical_pages: ['HomePage', 'AboutPage', 'ProjectsPage', 'ContactPage'],
    required_features: ['project showcase', 'contact form', 'responsive design', 'smooth animations'],
    complexity_indicators: ['multiple sections', 'portfolio items', 'contact functionality']
  },
  {
    keywords: ['landing page', 'marketing site', 'product page', 'promotional'],
    project_type: 'landing_page',
    requires_autonomous_planning: false, // Simpler, can use regular tools
    typical_components: ['Hero', 'FeatureCard', 'Testimonial', 'CTA', 'PricingTable', 'FAQ'],
    typical_pages: ['LandingPage'],
    required_features: ['compelling hero', 'feature highlights', 'social proof', 'clear CTAs'],
    complexity_indicators: ['conversion optimization', 'responsive design', 'performance']
  }
]

// Get the enhanced planning model (Mistral Pixtral-12B-2409)
const getEnhancedPlanningModel = () => {
  try {
    return getModel('pixtral-12b-2409')
  } catch (error) {
    console.warn('Enhanced planning model not available, falling back to default')
    return getModel('auto')
  }
}

export class EnhancedIntentDetector {
  
  /**
   * Detect user intent with autonomous planning capabilities
   */
  static async detectEnhancedIntent(
    userMessage: string,
    projectContext: string,
    conversationHistory: any[] = [],
    existingFiles: string[] = [],
    packageJson?: any
  ): Promise<EnhancedIntentData> {
    try {
      const planningModel = getEnhancedPlanningModel()
      
      // First, determine if this requires autonomous planning
      const planningAssessment = await this.assessPlanningRequirements(userMessage)
      
      // Get relevant knowledge base context
      const relevantKnowledge = KnowledgeBase.search(userMessage)
      const knowledgeContext = relevantKnowledge
        .map(item => `${item.title}: ${item.content.substring(0, 300)}...`)
        .join('\n\n')

      const enhancedIntentPrompt = `You are an elite AI intent detection and autonomous planning specialist. Analyze this user request and determine the optimal execution strategy.

🎯 **USER REQUEST**: ${userMessage}

📋 **PROJECT CONTEXT**: ${projectContext}

📁 **EXISTING FILES**: ${existingFiles.join(', ')}

📦 **CURRENT DEPENDENCIES**: ${packageJson ? JSON.stringify(packageJson.dependencies || {}, null, 2) : 'No package.json found'}

🧠 **RELEVANT KNOWLEDGE**: ${knowledgeContext}

🔄 **CONVERSATION HISTORY**: ${conversationHistory.slice(-5).map((msg, i) => `${msg.role}: ${msg.content.substring(0, 100)}...`).join('\n')}

🚨 **CRITICAL ANALYSIS REQUIREMENTS**:

1. **COMPLEXITY ASSESSMENT**: Determine if this is a simple request or requires building a complete application
2. **AUTONOMOUS PLANNING**: Decide if autonomous planning and execution is needed
3. **EXECUTION STRATEGY**: Choose between simple tools, autonomous execution, or hybrid approach
4. **TOOL SELECTION**: Select appropriate tools based on complexity and requirements

📊 **COMPLEXITY INDICATORS**:

**SIMPLE REQUESTS** (use regular tools):
- Single file modifications
- Adding a few components
- Basic styling changes
- Simple feature additions
- Questions and explanations

**COMPLEX REQUESTS** (use autonomous planning):
- "Create an ecommerce store"
- "Build a social media platform"
- "Make a dashboard with analytics"
- "Build a complete blog/CMS"
- "Create a full application with multiple pages"
- Requests mentioning multiple features, pages, or complex functionality

🎯 **AUTONOMOUS PLANNING TRIGGERS**:

If the user request includes:
- Building complete applications from scratch
- Multiple interconnected components and pages
- Complex state management requirements
- Integration with external APIs or services
- Full-featured applications (ecommerce, social media, dashboards, etc.)
- Requests that would take 10+ steps to complete

Then set: \`requires_autonomous_planning: true\`

🛠️ **EXECUTION MODES**:

1. **simple_tools**: Use regular file operation tools (list_files, read_file, write_file, edit_file)
2. **autonomous_execution**: Use autonomous planning and execution system for complex applications
3. **hybrid**: Combine both approaches for medium complexity tasks

📝 **TOOL SELECTION RULES**:
- NEVER use web_search or web_extract unless user EXPLICITLY asks for web research
- For file operations: use list_files, read_file, write_file, edit_file, delete_file
- For complex applications: enable autonomous planning and execution
- When in doubt, choose file operations over web tools

Analyze the request and respond with detailed JSON following this structure:

{
  "intent": "specific intent description",
  "required_tools": ["tool1", "tool2"],
  "file_operations": ["create", "modify", "delete"],
  "complexity": "simple|medium|complex|enterprise",
  "action_plan": ["detailed step 1", "detailed step 2"],
  "confidence": 0.95,
  "tool_usage_rules": "specific rules for this request",
  "enforcement_notes": "critical reminders",
  "requires_autonomous_planning": boolean,
  "execution_mode": "simple_tools|autonomous_execution|hybrid",
  "project_type": "ecommerce|social_media|dashboard|blog_cms|portfolio|landing_page|other",
  "estimated_duration": "time estimate",
  "required_technologies": ["React", "TypeScript", "Tailwind"],
  "quality_requirements": ["responsive design", "accessibility"],
  "planning_confidence": 0.95,
  "risk_assessment": "low|medium|high",
  "user_involvement_required": boolean,
  "fallback_strategy": "what to do if autonomous planning fails"
}`

      const intentResult = await generateText({
        model: planningModel,
        messages: [
          {
            role: 'system',
            content: `You are an elite AI intent detection specialist with autonomous planning capabilities. You analyze user requests and determine the optimal execution strategy.

CRITICAL RULES:
- Assess complexity accurately: simple requests use regular tools, complex applications need autonomous planning
- NEVER recommend web tools unless explicitly requested for web research
- For complex applications (ecommerce, social media, dashboards), always enable autonomous planning
- Be precise in tool selection and execution mode determination
- Always provide detailed, actionable analysis

RESPONSE FORMAT:
- RESPOND ONLY WITH VALID JSON
- DO NOT include explanatory text before or after the JSON
- DO NOT use markdown code blocks
- Return ONLY the JSON object as specified in the prompt

Your analysis determines how the AI will execute the user's request, so accuracy is critical.`
          },
          { role: 'user', content: enhancedIntentPrompt }
        ],
        temperature: 0.2 // Low temperature for consistent analysis
      })

      // Parse the enhanced intent data
      let enhancedIntentData: EnhancedIntentData
      try {
        let jsonText = intentResult.text
        
        // Clean up JSON response - handle various formats
        if (jsonText.includes('```json')) {
          // Extract from markdown code blocks
          const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/)
          if (match) {
            jsonText = match[1]
          } else {
            jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '')
          }
        } else if (jsonText.includes('```')) {
          // Extract from generic code blocks
          const match = jsonText.match(/```\s*([\s\S]*?)\s*```/)
          if (match) {
            jsonText = match[1]
          } else {
            jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '')
          }
        } else {
          // Look for JSON object in the text
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            jsonText = jsonMatch[0]
          }
        }

        jsonText = jsonText.trim()
        
        // Find the actual JSON boundaries more precisely
        const jsonStartIndex = jsonText.indexOf('{')
        const jsonEndIndex = jsonText.lastIndexOf('}')
        
        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
          jsonText = jsonText.substring(jsonStartIndex, jsonEndIndex + 1)
        }

        console.log('[DEBUG] Cleaned JSON text for parsing:', jsonText.substring(0, 200) + '...')
        enhancedIntentData = JSON.parse(jsonText)
        
        // Generate autonomous instructions if required
        if (enhancedIntentData.requires_autonomous_planning) {
          console.log('[ENHANCED INTENT] Generating autonomous instructions...')
          try {
            enhancedIntentData.autonomous_instructions = this.generateAutonomousInstructions(
              enhancedIntentData,
              userMessage,
              existingFiles
            )
          } catch (instructionError) {
            console.warn('[ENHANCED INTENT] Failed to generate instructions:', instructionError)
            // Fallback to hybrid mode if instruction generation fails
            enhancedIntentData.execution_mode = 'hybrid'
            enhancedIntentData.requires_autonomous_planning = false
          }
        }

      } catch (parseError) {
        console.warn('Failed to parse enhanced intent result:', parseError)
        console.log('[DEBUG] Raw enhanced intent result:', intentResult.text)
        
        // Create fallback intent data
        enhancedIntentData = this.createFallbackIntentData(userMessage, planningAssessment)
      }

      // Validate and enhance the intent data
      enhancedIntentData = this.validateAndEnhanceIntentData(enhancedIntentData, userMessage)

      console.log('[ENHANCED INTENT] Analysis complete:', {
        intent: enhancedIntentData.intent,
        complexity: enhancedIntentData.complexity,
        execution_mode: enhancedIntentData.execution_mode,
        requires_autonomous_planning: enhancedIntentData.requires_autonomous_planning,
        confidence: enhancedIntentData.confidence
      })

      return enhancedIntentData

    } catch (error) {
      console.error('Enhanced intent detection failed:', error)
      return this.createFallbackIntentData(userMessage, { requires_planning: false, confidence: 0.5 })
    }
  }

  /**
   * Assess if the request requires autonomous planning
   */
  private static async assessPlanningRequirements(userMessage: string): Promise<{
    requires_planning: boolean
    confidence: number
    detected_patterns: string[]
  }> {
    const lowerMessage = userMessage.toLowerCase()
    const detectedPatterns: string[] = []
    let requiresPlanning = false

    // Check against complex application patterns
    for (const pattern of COMPLEX_APPLICATION_PATTERNS) {
      const matchingKeywords = pattern.keywords.filter(keyword => 
        lowerMessage.includes(keyword)
      )
      
      if (matchingKeywords.length > 0) {
        detectedPatterns.push(pattern.project_type)
        if (pattern.requires_autonomous_planning) {
          requiresPlanning = true
        }
      }
    }

    // Additional complexity indicators
    const complexityIndicators = [
      'complete', 'full', 'entire', 'whole', 'comprehensive',
      'multiple pages', 'many components', 'complex',
      'with authentication', 'with database', 'with api',
      'professional', 'production-ready', 'enterprise'
    ]

    const hasComplexityIndicators = complexityIndicators.some(indicator => 
      lowerMessage.includes(indicator)
    )

    if (hasComplexityIndicators) {
      requiresPlanning = true
    }

    // Calculate confidence based on detected patterns and indicators
    let confidence = 0.5
    if (detectedPatterns.length > 0) confidence += 0.3
    if (hasComplexityIndicators) confidence += 0.2
    if (requiresPlanning) confidence = Math.min(confidence + 0.2, 1.0)

    return {
      requires_planning: requiresPlanning,
      confidence,
      detected_patterns: detectedPatterns
    }
  }

  /**
   * Create fallback intent data when analysis fails
   */
  private static createFallbackIntentData(
    userMessage: string, 
    planningAssessment: { requires_planning: boolean, confidence: number }
  ): EnhancedIntentData {
    return {
      intent: 'general_development',
      required_tools: ['list_files', 'read_file', 'write_file'],
      file_operations: ['analyze', 'create', 'modify'],
      complexity: planningAssessment.requires_planning ? 'complex' : 'medium',
      action_plan: ['Analyze project structure', 'Implement requested changes'],
      confidence: planningAssessment.confidence,
      tool_usage_rules: 'Use file operation tools. Avoid web tools unless explicitly requested.',
      enforcement_notes: 'Focus on file operations and direct implementation.',
      requires_autonomous_planning: planningAssessment.requires_planning,
      execution_mode: planningAssessment.requires_planning ? 'autonomous_execution' : 'simple_tools',
      project_type: 'other',
      estimated_duration: planningAssessment.requires_planning ? '30-60 minutes' : '10-20 minutes',
      required_technologies: ['React', 'TypeScript', 'Tailwind CSS'],
      quality_requirements: ['responsive design', 'clean code'],
      planning_confidence: planningAssessment.confidence,
      risk_assessment: planningAssessment.requires_planning ? 'medium' : 'low',
      user_involvement_required: false,
      fallback_strategy: 'Use regular file operation tools if autonomous planning fails'
    }
  }

  /**
   * Validate and enhance intent data
   */
  private static validateAndEnhanceIntentData(
    intentData: EnhancedIntentData,
    userMessage: string
  ): EnhancedIntentData {
    // Ensure required fields are present
    if (!intentData.execution_mode) {
      intentData.execution_mode = intentData.requires_autonomous_planning ? 'autonomous_execution' : 'simple_tools'
    }

    if (!intentData.estimated_duration) {
      intentData.estimated_duration = intentData.complexity === 'complex' ? '30-60 minutes' : '10-20 minutes'
    }

    if (!intentData.required_technologies) {
      intentData.required_technologies = ['React', 'TypeScript', 'Tailwind CSS']
    }

    if (!intentData.quality_requirements) {
      intentData.quality_requirements = ['responsive design', 'clean code', 'accessibility']
    }

    if (!intentData.planning_confidence) {
      intentData.planning_confidence = intentData.confidence
    }

    if (!intentData.risk_assessment) {
      intentData.risk_assessment = intentData.complexity === 'complex' ? 'medium' : 'low'
    }

    if (intentData.user_involvement_required === undefined) {
      intentData.user_involvement_required = false
    }

    if (!intentData.fallback_strategy) {
      intentData.fallback_strategy = 'Use regular file operation tools if autonomous execution fails'
    }

    return intentData
  }

  /**
   * Get execution recommendations based on intent analysis
   */
  static getExecutionRecommendations(intentData: EnhancedIntentData): {
    should_use_autonomous_planning: boolean
    recommended_tools: string[]
    execution_strategy: string
    estimated_steps: number
    risk_mitigation: string[]
  } {
    const recommendations = {
      should_use_autonomous_planning: intentData.requires_autonomous_planning,
      recommended_tools: intentData.required_tools,
      execution_strategy: intentData.execution_mode,
      estimated_steps: 10, // Default estimated steps for autonomous execution
      risk_mitigation: [] as string[]
    }

    // Add risk mitigation strategies
    if (intentData.risk_assessment === 'high') {
      recommendations.risk_mitigation.push(
        'Implement comprehensive error handling',
        'Add validation at each step',
        'Create rollback mechanisms'
      )
    }

    if (intentData.complexity === 'complex' || intentData.complexity === 'enterprise') {
      recommendations.risk_mitigation.push(
        'Break down into smaller phases',
        'Implement progressive enhancement',
        'Add extensive testing'
      )
    }

    return recommendations
  }

  /**
   * Generate direct autonomous instructions based on project type and requirements
   */
  private static generateAutonomousInstructions(
    intentData: EnhancedIntentData,
    userMessage: string,
    existingFiles: string[]
  ): string {
    const projectType = intentData.project_type || 'custom'
    const pattern = COMPLEX_APPLICATION_PATTERNS.find(p => p.project_type === projectType)
    
    let instructions = `🤖 **AUTONOMOUS EXECUTION MODE ACTIVATED**
🎯 **Project Type**: ${projectType.toUpperCase()}
📋 **User Request**: ${userMessage}
⚡ **Complexity**: ${intentData.complexity}
⏱️ **Estimated Duration**: ${intentData.estimated_duration}

🚨 **AUTONOMOUS EXECUTION INSTRUCTIONS**:
- Execute systematically without waiting for user approval
- Verify package.json dependencies before using any packages
- Read existing files before modifying them
- Create complete, production-ready implementations
- Provide progress updates as you complete each major step

`

    if (pattern) {
      instructions += `📋 **COMPONENTS TO CREATE**:
${pattern.typical_components.map(comp => `- ${comp}`).join('\n')}

📄 **PAGES TO CREATE**:
${pattern.typical_pages.map(page => `- ${page}`).join('\n')}

🔧 **KEY FEATURES TO IMPLEMENT**:
${pattern.required_features.map(feature => `- ${feature}`).join('\n')}

`
    }

    instructions += `🎨 **DESIGN REQUIREMENTS**:
- Modern, professional design with glass morphism effects
- Dark theme as default
- Smooth animations using Framer Motion
- Mobile-responsive design
- Accessible UI with proper ARIA labels

⚡ **TECHNICAL REQUIREMENTS**:
- React 18+ with functional components and hooks
- TypeScript for type safety
- Tailwind CSS for styling
- Shadcn/UI components where appropriate
- Vite for build optimization

🔄 **EXECUTION STRATEGY**:
1. Analyze project structure first
2. Check and update dependencies
3. Create core components
4. Build main pages
5. Implement key features
6. Add styling and animations
7. Ensure responsive design
8. Test and optimize`

    return instructions
  }
}

// Enhanced intent detector is already exported above
