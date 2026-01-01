// Helper to parse leads from leads.md file
// This categorizes leads based on their context

export interface Lead {
  name: string
  handle: string
  email: string
  context: string
  source: string
  segment: 'investor' | 'creator' | 'partner' | 'user' | 'other'
  company?: string
}

export function classifyLeadSegment(context: string, source: string, handle: string): Lead['segment'] {
  const contextLower = context.toLowerCase()
  const sourceLower = source.toLowerCase()
  const handleLower = handle.toLowerCase()
  
  // Investor keywords
  const investorKeywords = [
    'vc', 'venture', 'capital', 'partner', 'investor', 'angels', 'angel',
    'fund', 'seed', 'series', 'yc', 'y combinator', 'a16z', 'sequoia',
    'kleiner perkins', 'greylock', 'lightspeed', 'founder', 'ceo'
  ]
  
  // Creator keywords
  const creatorKeywords = [
    'educator', 'teacher', 'content creator', 'youtuber', 'blogger',
    'indie hacker', 'creator', 'builds', 'shares tutorials', 'promotes',
    'instructor', 'influencer', 'coach', 'writer'
  ]
  
  // Partner keywords
  const partnerKeywords = [
    'cto', 'cpo', 'vp', 'head of', 'lead', 'director', 'manager',
    'team', 'chrome', 'google', 'meta', 'microsoft', 'apple',
    'platform', 'integration', 'api', 'partnership'
  ]
  
  // Check for investors
  if (investorKeywords.some(kw => contextLower.includes(kw) || handleLower.includes(kw))) {
    return 'investor'
  }
  
  // Check for creators
  if (creatorKeywords.some(kw => contextLower.includes(kw))) {
    return 'creator'
  }
  
  // Check for partners
  if (partnerKeywords.some(kw => contextLower.includes(kw) || handleLower.includes(kw))) {
    return 'partner'
  }
  
  // Default to user
  return 'user'
}

export function extractCompany(handle: string): string | undefined {
  // Extract company from handle like "@name (Company)"
  const companyMatch = handle.match(/\(([^)]+)\)/)
  if (companyMatch && companyMatch[1]) {
    // Remove role/description
    const company = companyMatch[1]
      .replace(/\s+(Founder|CEO|CTO|Partner|→|Co-founder|Investor)/i, '')
      .trim()
    return company || undefined
  }
  return undefined
}

export function parseLeadsFromMarkdown(markdown: string): Lead[] {
  const leads: Lead[] = []
  const lines = markdown.split('\n')
  
  let inTable = false
  for (const line of lines) {
    // Skip title and separator rows
    if (line.startsWith('# Emails') || (line.startsWith('|') && line.includes('---'))) {
      continue
    }
    
    // Check if table header - match exact column names from leads.md
    // | Lead Name | Handle/Source | Email | Context/Interest | Source |
    if (line.includes('Lead Name') && line.includes('Handle/Source') && line.includes('Context/Interest')) {
      inTable = true
      continue
    }
    
    // Parse table rows
    if (inTable && line.startsWith('|')) {
      const columns = line.split('|').map(col => col.trim()).filter(Boolean)
      
      // Table structure: Lead Name | Handle/Source | Email | Context/Interest | Source
      if (columns.length >= 5) {
        const [name, handle, email, context, source] = columns
        
        // Skip if email is invalid or empty
        if (!email || !email.includes('@')) continue
        
        // Skip if name is empty
        if (!name) continue
        
        const segment = classifyLeadSegment(context, source, handle)
        const company = extractCompany(handle)
        
        leads.push({
          name,
          handle,
          email,
          context,
          source,
          segment,
          company
        })
      }
    }
  }
  
  return leads
}

// Load and cache leads data
let cachedLeads: Lead[] | null = null

export async function getLeads(): Promise<Lead[]> {
  if (cachedLeads) {
    return cachedLeads
  }
  
  try {
    const response = await fetch('/leads.md')
    const markdown = await response.text()
    cachedLeads = parseLeadsFromMarkdown(markdown)
    return cachedLeads
  } catch (error) {
    console.error('Error loading leads:', error)
    return []
  }
}

// Server-side version
export function getLeadsSync(markdown: string): Lead[] {
  return parseLeadsFromMarkdown(markdown)
}
