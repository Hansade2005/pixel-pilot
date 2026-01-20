"use client"

import { useState, useRef, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import Link from "next/link"
import {
  Search,
  MessageCircle,
  HelpCircle,
  BookOpen,
  Zap,
  CreditCard,
  Settings,
  Code,
  Rocket,
  Mail,
  Send,
  Bot,
  Loader2,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Users,
  Shield,
  FileQuestion,
} from "lucide-react"

// FAQ Data organized by category
const faqCategories = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Rocket,
    color: "text-green-400",
    faqs: [
      {
        question: "What is PiPilot?",
        answer: "PiPilot is Canada's first Agentic Vibe Coding Platform - an AI-powered application builder that helps you create web applications through natural conversation. Simply describe what you want to build, and our AI will generate the code, design, and structure for you."
      },
      {
        question: "How do I create my first project?",
        answer: "After signing in, click 'New Project' in your workspace. Give your project a name and description, then start chatting with the AI. Describe what you want to build - whether it's a landing page, dashboard, or full application - and watch as PiPilot brings your vision to life."
      },
      {
        question: "Do I need coding experience to use PiPilot?",
        answer: "No! PiPilot is designed for everyone - from complete beginners to experienced developers. Our AI understands natural language, so you can describe what you want in plain English. However, if you do know how to code, you can also directly edit the generated code."
      },
      {
        question: "What types of applications can I build?",
        answer: "You can build virtually any web application including: landing pages, portfolios, dashboards, e-commerce sites, blogs, SaaS applications, admin panels, and more. PiPilot supports React, Next.js, and modern web technologies."
      },
    ]
  },
  {
    id: "features",
    title: "Features & Capabilities",
    icon: Sparkles,
    color: "text-purple-400",
    faqs: [
      {
        question: "What AI models does PiPilot use?",
        answer: "PiPilot uses cutting-edge AI models including Claude by Anthropic, GPT-4, and Gemini. You can switch between models based on your needs - some excel at complex logic while others are great for creative designs."
      },
      {
        question: "What is AI Memory?",
        answer: "AI Memory allows PiPilot to remember context about your project, preferences, and past conversations. This means the AI gets smarter about your specific project over time and can provide more relevant suggestions."
      },
      {
        question: "Can I use slash commands?",
        answer: "Yes! PiPilot supports powerful slash commands like /help, /settings, /clear, /export, and more. Type '/' in the chat to see all available commands and their descriptions."
      },
      {
        question: "Does PiPilot support real-time preview?",
        answer: "Absolutely! As you chat and the AI generates code, you'll see a live preview of your application update in real-time. You can switch between desktop, tablet, and mobile views."
      },
      {
        question: "Can I search and replace across my codebase?",
        answer: "Yes! Use the search feature (Ctrl/Cmd + Shift + F) to search across all files in your project. You can also use the Search & Replace feature to make bulk changes with preview before applying."
      },
    ]
  },
  {
    id: "billing",
    title: "Billing & Pricing",
    icon: CreditCard,
    color: "text-blue-400",
    faqs: [
      {
        question: "Is PiPilot free to use?",
        answer: "PiPilot offers a free tier with limited AI messages per month. For more usage and advanced features, we offer Pro and Enterprise plans. Check our pricing page for detailed information."
      },
      {
        question: "How do I upgrade my plan?",
        answer: "Go to Settings > Billing in your workspace, or visit the Pricing page. Select the plan that fits your needs and complete the checkout process. Your upgrade takes effect immediately."
      },
      {
        question: "Can I cancel my subscription anytime?",
        answer: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period. We don't offer refunds for partial months, but you won't be charged again."
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit cards (Visa, Mastercard, American Express) and debit cards through our secure payment processor, Stripe. We also support Apple Pay and Google Pay."
      },
    ]
  },
  {
    id: "technical",
    title: "Technical & Troubleshooting",
    icon: Settings,
    color: "text-orange-400",
    faqs: [
      {
        question: "My preview isn't loading. What should I do?",
        answer: "Try these steps: 1) Refresh the page, 2) Clear your browser cache, 3) Check if there are any JavaScript errors in the console, 4) Try a different browser. If the issue persists, contact our support team."
      },
      {
        question: "How do I export my project?",
        answer: "Click the Export button in your workspace or use the /export command. You can download your project as a ZIP file containing all source code, assets, and configuration files ready for deployment."
      },
      {
        question: "Can I connect my own domain?",
        answer: "Yes! Pro and Enterprise users can connect custom domains to their deployed projects. Go to Project Settings > Domain to configure your custom domain with our provided DNS settings."
      },
      {
        question: "How do I report a bug?",
        answer: "You can report bugs through our live chat support, by emailing hello@pipilot.dev, or by creating an issue on our GitHub repository. Please include steps to reproduce the issue and any error messages."
      },
      {
        question: "Is my code and data secure?",
        answer: "Absolutely. We use industry-standard encryption for all data in transit and at rest. Your code is stored securely and is only accessible to you. We never share or sell your data to third parties."
      },
    ]
  },
  {
    id: "account",
    title: "Account & Privacy",
    icon: Shield,
    color: "text-cyan-400",
    faqs: [
      {
        question: "How do I reset my password?",
        answer: "Click 'Forgot Password' on the login page and enter your email address. We'll send you a secure link to reset your password. The link expires after 24 hours for security."
      },
      {
        question: "Can I delete my account?",
        answer: "Yes, you can delete your account from Settings > Account > Delete Account. This action is permanent and will remove all your projects, data, and subscription. Please export any projects you want to keep first."
      },
      {
        question: "How do I change my email address?",
        answer: "Go to Settings > Account > Email. Enter your new email address and we'll send a verification link. Once verified, your email will be updated across all PiPilot services."
      },
      {
        question: "Does PiPilot comply with GDPR?",
        answer: "Yes, PiPilot is fully GDPR compliant. You have the right to access, modify, and delete your personal data at any time. Contact us at hello@pipilot.dev for any privacy-related requests."
      },
    ]
  },
]

// Quick help topics
const quickHelp = [
  {
    title: "Quick Start Guide",
    description: "Learn the basics in 5 minutes",
    icon: Rocket,
    href: "/docs/quickstart",
    color: "from-green-500 to-emerald-600"
  },
  {
    title: "Video Tutorials",
    description: "Watch step-by-step guides",
    icon: BookOpen,
    href: "/docs/tutorials",
    color: "from-purple-500 to-pink-600"
  },
  {
    title: "API Documentation",
    description: "For developers and integrations",
    icon: Code,
    href: "/docs/api",
    color: "from-blue-500 to-cyan-600"
  },
  {
    title: "Community Discord",
    description: "Join our community",
    icon: Users,
    href: "https://discord.gg/pipilot",
    color: "from-indigo-500 to-purple-600"
  },
]

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [aiQuestion, setAiQuestion] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [showAiChat, setShowAiChat] = useState(false)
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Filter FAQs based on search query
  const filteredCategories = faqCategories.map(category => ({
    ...category,
    faqs: category.faqs.filter(
      faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.faqs.length > 0)

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory])

  // Handle AI question submission
  const handleAskAI = async () => {
    if (!aiQuestion.trim()) return

    const userMessage = aiQuestion.trim()
    setAiQuestion("")
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }])
    setIsAiLoading(true)
    setShowAiChat(true)

    try {
      // Simulate AI response (in production, this would call your AI API)
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Generate contextual response based on keywords
      let response = ""
      const lowerQuestion = userMessage.toLowerCase()

      if (lowerQuestion.includes("price") || lowerQuestion.includes("cost") || lowerQuestion.includes("plan")) {
        response = "PiPilot offers flexible pricing plans! We have a **Free tier** for getting started, a **Pro plan** at $19/month for power users, and **Enterprise** for teams. Visit our [Pricing page](/pricing) for full details. Would you like me to explain the differences between plans?"
      } else if (lowerQuestion.includes("start") || lowerQuestion.includes("begin") || lowerQuestion.includes("new")) {
        response = "Getting started with PiPilot is easy! 🚀\n\n1. **Sign up** for a free account\n2. Click **'New Project'** in your workspace\n3. **Describe** what you want to build in the chat\n4. Watch as AI generates your app!\n\nWould you like me to walk you through creating your first project?"
      } else if (lowerQuestion.includes("export") || lowerQuestion.includes("download")) {
        response = "To export your project:\n\n1. Open your project in the workspace\n2. Click the **Export** button in the toolbar, or\n3. Type `/export` in the chat\n\nYou'll get a ZIP file with all your source code, ready to deploy anywhere! Need help with deployment?"
      } else if (lowerQuestion.includes("ai") || lowerQuestion.includes("model")) {
        response = "PiPilot uses multiple AI models:\n\n• **Claude** (Anthropic) - Great for complex reasoning\n• **GPT-4** (OpenAI) - Versatile and creative\n• **Gemini** (Google) - Fast and efficient\n\nYou can switch models anytime using the model selector in your workspace!"
      } else if (lowerQuestion.includes("bug") || lowerQuestion.includes("error") || lowerQuestion.includes("issue")) {
        response = "Sorry to hear you're having issues! Here's how to get help:\n\n1. **Refresh** the page and try again\n2. **Clear** your browser cache\n3. Check our **status page** for any outages\n4. **Contact support** via live chat or email hello@pipilot.dev\n\nCan you describe the specific error you're seeing?"
      } else {
        response = `Thanks for your question about "${userMessage}"!\n\nI'm here to help with anything related to PiPilot. You can ask me about:\n\n• Getting started & tutorials\n• Features & capabilities\n• Billing & pricing\n• Technical issues\n• Account settings\n\nFor complex issues, our support team is also available via the **live chat widget** or email at **hello@pipilot.dev**. How else can I help?`
      }

      setChatHistory(prev => [...prev, { role: 'ai', content: response }])
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error. Please try again or contact our support team at hello@pipilot.dev" }])
    } finally {
      setIsAiLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 lovable-gradient" />

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 noise-texture" />

      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="relative z-10 pt-16 pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-12 max-w-4xl mx-auto">
            <Badge className="mb-4 bg-blue-500/20 text-blue-300 border-blue-500/30">
              <HelpCircle className="h-3 w-3 mr-1" />
              Support Center
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              How Can We
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> Help You?</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
              Find answers to common questions, get help from our AI assistant, or reach out to our support team.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto mb-8">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* AI Assistant Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/30 overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Bot className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-xl">Ask PiPilot AI</CardTitle>
                    <p className="text-gray-400 text-sm">Get instant answers from our AI assistant</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Chat History */}
                {showAiChat && chatHistory.length > 0 && (
                  <div className="mb-4 max-h-80 overflow-y-auto space-y-4 p-4 bg-gray-900/50 rounded-lg">
                    {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-200'
                        }`}>
                          {msg.role === 'ai' && (
                            <div className="flex items-center gap-2 mb-2 text-purple-400 text-sm font-medium">
                              <Bot className="h-4 w-4" />
                              PiPilot AI
                            </div>
                          )}
                          <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                        </div>
                      </div>
                    ))}
                    {isAiLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-800 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-purple-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}

                {/* Input Area */}
                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="Ask anything about PiPilot..."
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAskAI()}
                    className="flex-1 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400"
                    disabled={isAiLoading}
                  />
                  <Button
                    onClick={handleAskAI}
                    disabled={isAiLoading || !aiQuestion.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isAiLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Suggested Questions */}
                {!showAiChat && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-gray-400 text-sm">Try asking:</span>
                    {["How do I get started?", "What are the pricing plans?", "How do I export my project?"].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setAiQuestion(q)
                        }}
                        className="text-sm text-purple-400 hover:text-purple-300 hover:underline"
                      >
                        "{q}"
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Help Cards */}
          <div className="max-w-6xl mx-auto mb-16">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Quick Help</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickHelp.map((item, idx) => (
                <Link key={idx} href={item.href}>
                  <Card className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all hover:scale-105 cursor-pointer h-full">
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
                        <item.icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                      <p className="text-gray-400 text-sm">{item.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              {searchQuery ? `Search Results for "${searchQuery}"` : "Frequently Asked Questions"}
            </h2>

            {filteredCategories.length === 0 ? (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-8 text-center">
                  <FileQuestion className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">No results found</h3>
                  <p className="text-gray-400 mb-4">
                    We couldn't find any FAQs matching "{searchQuery}". Try different keywords or ask our AI assistant above.
                  </p>
                  <Button variant="outline" onClick={() => setSearchQuery("")}>
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {filteredCategories.map((category) => (
                  <Card key={category.id} className="bg-gray-800/50 border-gray-700">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <category.icon className={`h-5 w-5 ${category.color}`} />
                        <CardTitle className="text-white text-lg">{category.title}</CardTitle>
                        <Badge variant="outline" className="text-gray-400 border-gray-600 ml-auto">
                          {category.faqs.length} {category.faqs.length === 1 ? 'question' : 'questions'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {category.faqs.map((faq, idx) => (
                          <AccordionItem key={idx} value={`${category.id}-${idx}`} className="border-gray-700">
                            <AccordionTrigger className="text-white hover:text-purple-400 text-left">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-300 leading-relaxed">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Contact Section */}
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">Still Need Help?</h2>
                  <p className="text-gray-400">Our support team is here to assist you</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="text-center p-6 bg-gray-800/50 rounded-xl">
                    <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="h-7 w-7 text-purple-400" />
                    </div>
                    <h3 className="text-white font-semibold mb-2">Live Chat</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Chat with our support team in real-time using the chat widget
                    </p>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                      Online Now
                    </Badge>
                  </div>

                  <div className="text-center p-6 bg-gray-800/50 rounded-xl">
                    <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                      <Mail className="h-7 w-7 text-blue-400" />
                    </div>
                    <h3 className="text-white font-semibold mb-2">Email Support</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Send us an email and we'll respond within 24 hours
                    </p>
                    <Link href="mailto:hello@pipilot.dev">
                      <Button variant="outline" className="text-blue-400 border-blue-500/50 hover:bg-blue-500/10">
                        <Mail className="h-4 w-4 mr-2" />
                        hello@pipilot.dev
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
