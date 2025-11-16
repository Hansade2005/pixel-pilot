import { streamText, generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getModel } from '@/lib/ai-providers'
import { DEFAULT_CHAT_MODEL, getModelById } from '@/lib/ai-models'

// Global user ID for tool access
declare global {
  var currentUserId: string
}

// Use Node.js runtime for full IndexedDB and file system access
// export const runtime = 'edge' // Removed: Edge runtime doesn't support IndexedDB

// Get AI model by ID with fallback to default
const getAIModel = (modelId?: string) => {
  try {
    const selectedModelId = modelId || DEFAULT_CHAT_MODEL
    const modelInfo = getModelById(selectedModelId)
    
    if (!modelInfo) {
      console.warn(`Model ${selectedModelId} not found, using default: ${DEFAULT_CHAT_MODEL}`)
      return getModel(DEFAULT_CHAT_MODEL)
    }
    
    console.log(`Using AI model: ${modelInfo.name} (${modelInfo.provider})`)
    return getModel(selectedModelId)
  } catch (error) {
    console.error('Failed to get AI model:', error)
    console.log(`Falling back to default model: ${DEFAULT_CHAT_MODEL}`)
    return getModel(DEFAULT_CHAT_MODEL)
  }
}

// Get Mistral Pixtral model for NLP and intent detection
const getMistralPixtralModel = () => {
  try {
    return getModel('pixtral-12b-2409')
  } catch (error) {
    console.warn('Mistral Pixtral model not available, falling back to default')
    return getModel(DEFAULT_CHAT_MODEL)
  }
}

// Add Tavily API configuration with environment variable support
const tavilyConfig = {
  apiKeys: [
    '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',
    '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',
    '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'
  ],
  searchUrl: 'https://api.tavily.com/search',
  extractUrl: 'https://api.tavily.com/extract',
  currentKeyIndex: 0
};

// Clean and format web search results for better AI consumption
function cleanWebSearchResults(results: any[], query: string): string {
  if (!results || results.length === 0) {
    return `No results found for query: "${query}"`
  }

  let cleanedText = `🔍 **Web Search Results for: "${query}"**\n\n`
  
  results.forEach((result, index) => {
    const title = result.title || 'Untitled'
    const url = result.url || 'No URL'
    const content = result.content || result.raw_content || 'No content available'
    
    // Clean and truncate content to 1500 chars total
    const maxContentPerResult = Math.floor(1500 / results.length)
    const cleanedContent = content
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, ' ') // Replace multiple newlines with single space
      .trim()
      .substring(0, maxContentPerResult)
    
    cleanedText += `**${index + 1}. ${title}**\n`
    cleanedText += `🔗 ${url}\n`
    cleanedText += `${cleanedContent}${cleanedContent.length >= maxContentPerResult ? '...' : ''}\n\n`
  })
  
  // Ensure total length doesn't exceed 1500 characters
  if (cleanedText.length > 1500) {
    cleanedText = cleanedText.substring(0, 1497) + '...'
  }
  
  return cleanedText
}

// Web search function using Tavily API
async function searchWeb(query: string) {
  // Check if API keys are available
  if (tavilyConfig.apiKeys.length === 0) {
    throw new Error('No Tavily API keys are configured.');
  }
  
  try {
    console.log('Starting web search for:', query);
    
    // Rotate through available API keys
    const apiKey = tavilyConfig.apiKeys[tavilyConfig.currentKeyIndex];
    tavilyConfig.currentKeyIndex = (tavilyConfig.currentKeyIndex + 1) % tavilyConfig.apiKeys.length;
    
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query: query,
        search_depth: "basic",
        include_answer: false,
        include_raw_content: true,
        max_results: 5
      })
    });

    if (!response.ok) {
      throw new Error(`Web search failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Clean and format results for AI consumption
    const cleanedResults = cleanWebSearchResults(data.results || [], query)
    
    console.log('Web search successful (cleaned and formatted):', {
      query,
      resultCount: data.results?.length || 0,
      cleanedLength: cleanedResults.length
    })
    
    return {
      rawData: data,
      cleanedResults: cleanedResults,
      query: query,
      resultCount: data.results?.length || 0
    }
  } catch (error) {
    console.error('Web search error:', error);
    throw error;
  }
}

// Clean and format extracted content for better AI consumption
function cleanExtractedContent(content: any[], urls: string[]): string {
  if (!content || content.length === 0) {
    return `No content extracted from URLs: ${urls.join(', ')}`
  }

  let cleanedText = `📄 **Content Extraction Results**\n\n`
  
  content.forEach((item, index) => {
    const url = item.url || urls[index] || 'Unknown URL'
    const title = item.title || 'Untitled'
    const text = item.text || item.raw_content || 'No content available'
    
    // Clean and truncate content to fit within 1500 chars total
    const maxContentPerItem = Math.floor(1500 / content.length)
    const cleanedItemText = text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, ' ') // Replace multiple newlines with single space
      .trim()
      .substring(0, maxContentPerItem)
    
    cleanedText += `**${index + 1}. ${title}**\n`
    cleanedText += `🔗 ${url}\n`
    cleanedText += `${cleanedItemText}${cleanedItemText.length >= maxContentPerItem ? '...' : ''}\n\n`
  })
  
  // Ensure total length doesn't exceed 1500 characters
  if (cleanedText.length > 1500) {
    cleanedText = cleanedText.substring(0, 1497) + '...'
  }
  
  return cleanedText
}

// Content extraction function using Tavily API
async function extractContent(urls: string | string[]) {
  // Check if API keys are available
  if (tavilyConfig.apiKeys.length === 0) {
    throw new Error('No Tavily API keys are configured.');
  }
  
  try {
    // Ensure urls is always an array
    const urlArray = Array.isArray(urls) ? urls : [urls];
    
    // Rotate through available API keys
    const apiKey = tavilyConfig.apiKeys[tavilyConfig.currentKeyIndex];
    tavilyConfig.currentKeyIndex = (tavilyConfig.currentKeyIndex + 1) % tavilyConfig.apiKeys.length;
    
    console.log('Starting content extraction for:', urlArray);
    const response = await fetch('https://api.tavily.com/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        urls: urlArray,
        include_images: false,
        extract_depth: "basic"
      })
    });

    if (!response.ok) {
      throw new Error(`Content extraction failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Clean and format extracted content for AI consumption
    const cleanedContent = cleanExtractedContent(data.content || [], urlArray)
    
    console.log('Content extraction successful (cleaned and formatted):', {
      urlCount: urlArray.length,
      contentCount: data.content?.length || 0,
      cleanedLength: cleanedContent.length
    })
    
    return {
      rawData: data,
      cleanedContent: cleanedContent,
      urls: urlArray,
      contentCount: data.content?.length || 0
    }
  } catch (error) {
    console.error('Content extraction error:', error);
    throw error;
  }
}

// File operation tools using storage manager
async function executeWriteFile(projectId: string, path: string, content: string, userId: string, storageManager: any) {
  try {
    // Check if file already exists
    const existingFile = await storageManager.getFile(projectId, path)

    if (existingFile) {
      // Update existing file
      await storageManager.updateFile(projectId, path, { content })
      return { success: true, message: `File ${path} updated successfully.` }
    } else {
      // Create new file
      const newFile = {
        workspaceId: projectId,
        name: path.split('/').pop() || path,
        path,
        content,
        fileType: path.split('.').pop() || 'text',
        type: path.split('.').pop() || 'text',
        size: content.length,
        isDirectory: false
      }
      
      await storageManager.createFile(newFile)
      return { success: true, message: `File ${path} created successfully.` }
    }
  } catch (error) {
    return { success: false, error: `Error creating file: ${error}` }
  }
}

// Search/Replace constants for file editing
const SEARCH_START = "<<<<<<< SEARCH";
const DIVIDER = "=======";
const REPLACE_END = ">>>>>>> REPLACE";

// Helper function to escape special regex characters
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Parse AI response into search/replace blocks
function parseSearchReplaceBlocks(aiResponse: string) {
  const blocks: Array<{search: string, replace: string}> = [];
  const lines = aiResponse.split('\n');
  
  let currentBlock: {search: string[], replace: string[]} | null = null;
  let mode: 'none' | 'search' | 'replace' = 'none';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.trim() === SEARCH_START) {
      currentBlock = { search: [], replace: [] };
      mode = 'search';
    } else if (line.trim() === DIVIDER && currentBlock) {
      mode = 'replace';
    } else if (line.trim() === REPLACE_END && currentBlock) {
      blocks.push({
        search: currentBlock.search.join('\n'),
        replace: currentBlock.replace.join('\n')
      });
      currentBlock = null;
      mode = 'none';
    } else if (mode === 'search' && currentBlock) {
      currentBlock.search.push(line);
    } else if (mode === 'replace' && currentBlock) {
      currentBlock.replace.push(line);
    }
  }
  
  return blocks;
}

// Apply search/replace edits to content
function applySearchReplaceEdits(content: string, blocks: Array<{search: string, replace: string}>) {
  let modifiedContent = content;
  const appliedEdits: Array<{
    blockIndex: number;
    search: string;
    replace: string;
    status: string;
  }> = [];
  const failedEdits: Array<{
    blockIndex: number;
    search: string;
    replace: string;
    status: string;
    reason: string;
  }> = [];
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const searchText = block.search;
    const replaceText = block.replace;
    
    if (modifiedContent.includes(searchText)) {
      modifiedContent = modifiedContent.replace(searchText, replaceText);
      appliedEdits.push({
        blockIndex: i,
        search: searchText,
        replace: replaceText,
        status: 'applied'
      });
    } else {
      failedEdits.push({
        blockIndex: i,
        search: searchText,
        replace: replaceText,
        status: 'failed',
        reason: 'Search text not found in content'
      });
    }
  }
  
  return { modifiedContent, appliedEdits, failedEdits };
}

async function executeReadFile(projectId: string, path: string, userId: string, storageManager: any) {
  try {
    const file = await storageManager.getFile(projectId, path)

    if (!file) {
      return { success: false, error: `File not found: ${path}` }
    }

    return { 
      success: true, 
      content: file.content || '', 
      name: file.name,
      type: file.type,
      message: `File read: ${path}` 
    }
  } catch (error) {
    return { success: false, error: `Failed to read file: ${error}` }
  }
}

async function executeListFiles(projectId: string, userId: string, storageManager: any) {
  try {
    const files = await storageManager.getFiles(projectId)

    return { 
      success: true, 
      files: files.map((file: any) => ({
        path: file.path,
        name: file.name,
        type: file.type,
        created_at: file.createdAt
      })), 
      message: `Found ${files.length} files in project` 
    }
  } catch (error) {
    return { success: false, error: `Failed to list files: ${error}` }
  }
}

async function executeDeleteFile(projectId: string, path: string, userId: string, storageManager: any) {
  try {
    await storageManager.deleteFile(projectId, path)

    return { success: true, message: `File deleted: ${path}` }
  } catch (error) {
    return { success: false, error: `Failed to delete file: ${error}` }
  }
}

// Enhanced project context builder with selective full content
async function buildEnhancedProjectContext(projectId: string, storageManager: any) {
  try {
    const files = await storageManager.getFiles(projectId)
    
    // Get current timestamp in Cline's format
    const currentTime = new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true
    }) + ' (UTC)'
    
    // Sort files alphabetically like Cline does
    const sortedFiles = files
      .map((f: any) => f.path)
      .sort()
    
    // Get directories structure
    const directories = new Set<string>()
    sortedFiles.forEach((path: string) => {
      const parts = path.split('/')
      let currentPath = ''
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += (currentPath ? '/' : '') + parts[i]
        directories.add(currentPath + '/')
      }
    })
    
    const sortedDirectories = Array.from(directories).sort()
    
    // Build context exactly like Cline's format
    let context = `<environment_details>
# VSCode Visible Files
${sortedFiles.length > 0 ? sortedFiles[0] : 'No files visible'}

# VSCode Open Tabs
${sortedFiles.slice(0, 10).join('\n')}${sortedFiles.length > 10 ? '\n...' : ''}

# Current Time
${currentTime}

# Current Working Directory (${projectId}) Files
${sortedFiles.join('\n')}

${sortedDirectories.length > 0 ? `# Directories
${sortedDirectories.join('\n')}` : ''}

(File list${sortedFiles.length > 50 ? ' truncated' : ' complete'}. Use list_files on specific subdirectories if you need to explore further.)

# Current Mode
AGENT MODE
</environment_details>`
    
    return context
  } catch (error) {
    console.error('Error building enhanced project context:', error)
    return `<environment_details>
# Error
Failed to build project context: ${error instanceof Error ? error.message : 'Unknown error'}

# Fallback Instructions  
- Use list_files tool to see current files in the project
- Use read_file tool to read specific files when needed
- Use write_file tool to create or modify files

# Current Mode
AGENT MODE
</environment_details>`
  }
}

// AI-Enhanced Memory Processing Functions
async function processMemoryWithAI(
  conversationMemory: any,
  userMessage: string,
  projectContext: string,
  toolCalls?: any[]
) {
  try {
    const mistralPixtral = getMistralPixtralModel()
    
    const enhancedMemory = await generateText({
      model: mistralPixtral,
      messages: [
        { role: 'system', content: 'You are an AI assistant analyzing development conversations.' },
        { role: 'user', content: `Analyze this development conversation and enhance the memory with intelligent insights:

User Message: "${userMessage}"
Project Context: ${projectContext}
Conversation History: ${JSON.stringify(conversationMemory?.messages?.slice(-20) || [])}
Tool Calls: ${JSON.stringify(toolCalls || [])}

Provide a JSON response with enhanced memory analysis:
{
  "semanticSummary": "Intelligent summary of development progress and key decisions",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "technicalPatterns": ["pattern1", "pattern2"],
  "architecturalDecisions": ["decision1", "decision2"],
  "nextLogicalSteps": ["step1", "step2"],
  "potentialImprovements": ["improvement1", "improvement2"],
  "relevanceScore": 0.0-1.0,
  "contextForFuture": "What future developers should know about this work"
}

Focus on extracting meaningful patterns, decisions, and insights that will be valuable for future development.` }
      ],
      temperature: 0.3
    })

    try {
      // Check if the response is actually JSON
      console.log('[DEBUG] Memory enhancement response type check:', {
        hasText: !!enhancedMemory.text,
        textLength: enhancedMemory.text?.length || 0,
        startsWithBrace: enhancedMemory.text?.trim().startsWith('{') || false,
        textPreview: enhancedMemory.text?.substring(0, 100) || 'no text'
      })
      
      if (enhancedMemory.text && enhancedMemory.text.trim().startsWith('{')) {
        // Extract JSON from markdown response if present
        let jsonText = enhancedMemory.text
        if (jsonText.includes('```json')) {
          jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '')
        } else if (jsonText.includes('```')) {
          jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '')
        }
        jsonText = jsonText.trim()
        
        // Remove any text after the JSON object
        const jsonEndIndex = jsonText.lastIndexOf('}')
        if (jsonEndIndex !== -1) {
          jsonText = jsonText.substring(0, jsonEndIndex + 1)
        }
        
        const parsed = JSON.parse(jsonText)
      return {
        semanticSummary: parsed.semanticSummary || 'Development progress analyzed',
        keyInsights: parsed.keyInsights || [],
        technicalPatterns: parsed.technicalPatterns || [],
        architecturalDecisions: parsed.architecturalDecisions || [],
        nextLogicalSteps: parsed.nextLogicalSteps || [],
        potentialImprovements: parsed.potentialImprovements || [],
        relevanceScore: parsed.relevanceScore || 0.8,
        contextForFuture: parsed.contextForFuture || 'Standard development patterns used'
        }
      } else {
        // Handle non-JSON responses (plain text)
        console.log('[DEBUG] AI returned plain text instead of JSON for memory enhancement')
        return {
          semanticSummary: enhancedMemory.text || 'Development progress tracked',
          keyInsights: ['Basic development patterns established'],
          technicalPatterns: ['Standard React/TypeScript patterns'],
          architecturalDecisions: ['Component-based architecture'],
          nextLogicalSteps: ['Continue with current patterns'],
          potentialImprovements: ['Consider adding tests'],
          relevanceScore: 0.7,
          contextForFuture: 'Standard development approach used'
        }
      }
    } catch (parseError) {
      console.warn('Failed to parse AI memory enhancement, using fallback:', parseError)
      return {
        semanticSummary: 'Development progress tracked',
        keyInsights: ['Basic development patterns established'],
        technicalPatterns: ['Standard React/TypeScript patterns'],
        architecturalDecisions: ['Component-based architecture'],
        nextLogicalSteps: ['Continue with current patterns'],
        potentialImprovements: ['Consider adding tests'],
        relevanceScore: 0.7,
        contextForFuture: 'Standard development approach used'
      }
    }
  } catch (error) {
    console.error('AI memory enhancement failed:', error)
    // Return fallback enhancement
    return {
      semanticSummary: 'Memory processing completed',
      keyInsights: ['Development work tracked'],
      technicalPatterns: ['React/TypeScript patterns'],
      architecturalDecisions: ['Component architecture'],
      nextLogicalSteps: ['Continue development'],
      potentialImprovements: ['Add documentation'],
      relevanceScore: 0.6,
      contextForFuture: 'Development work in progress'
    }
  }
}

// Smart Memory Retrieval with AI
async function findRelevantMemories(
  userQuery: string,
  projectContext: string,
  conversationMemory: any
) {
  try {
    const mistralPixtral = getMistralPixtralModel()
    
    const relevantMemories = await generateText({
      model: mistralPixtral,
      messages: [
        { role: 'system', content: 'You are an AI assistant that finds relevant information from development memory.' },
        { role: 'user', content: `Find the most relevant information from this development memory for the user's current request:

User Query: "${userQuery}"
Project Context: ${projectContext}
Conversation Memory: ${JSON.stringify(conversationMemory?.messages?.slice(-30) || [])}

Analyze and provide a JSON response with the most relevant information:
{
  "relevantContext": "Most relevant information for the current request",
  "keyRelevantFiles": ["file1", "file2"],
  "relevantDecisions": ["decision1", "decision2"],
  "applicablePatterns": ["pattern1", "pattern2"],
  "relevanceScore": 0.0-1.0,
  "whyRelevant": "Explanation of why this information is relevant"
}

Focus on finding information that directly helps with the current request.` }
      ],
      temperature: 0.3
    })

    try {
      // Check if the response is actually JSON
      console.log('[DEBUG] Memory retrieval response type check:', {
        hasText: !!relevantMemories.text,
        textLength: relevantMemories.text?.length || 0,
        startsWithBrace: relevantMemories.text?.trim().startsWith('{') || false,
        textPreview: relevantMemories.text?.substring(0, 100) || 'no text'
      })
      
      if (relevantMemories.text && relevantMemories.text.trim().startsWith('{')) {
        const parsed = JSON.parse(relevantMemories.text)
      return {
        relevantContext: parsed.relevantContext || 'No specific relevant context found',
        keyRelevantFiles: parsed.keyRelevantFiles || [],
        relevantDecisions: parsed.relevantDecisions || [],
        applicablePatterns: parsed.applicablePatterns || [],
        relevanceScore: parsed.relevanceScore || 0.5,
        whyRelevant: parsed.whyRelevant || 'General development context'
        }
      } else {
        // Handle non-JSON responses (plain text)
        console.log('[DEBUG] AI returned plain text instead of JSON for memory retrieval')
        return {
          relevantContext: relevantMemories.text || 'General development context available',
          keyRelevantFiles: [],
          relevantDecisions: ['Standard development patterns'],
          applicablePatterns: ['React/TypeScript best practices'],
          relevanceScore: 0.5,
          whyRelevant: 'Provides general development guidance'
        }
      }
    } catch (parseError) {
      console.warn('Failed to parse AI memory retrieval, using fallback:', parseError)
      return {
        relevantContext: 'General development context available',
        keyRelevantFiles: [],
        relevantDecisions: ['Standard development patterns'],
        applicablePatterns: ['React/TypeScript best practices'],
        relevanceScore: 0.5,
        whyRelevant: 'Provides general development guidance'
      }
    }
  } catch (error) {
    console.error('AI memory retrieval failed:', error)
    return {
      relevantContext: 'Basic development context',
      keyRelevantFiles: [],
      relevantDecisions: ['Standard patterns'],
      applicablePatterns: ['Best practices'],
      relevanceScore: 0.4,
      whyRelevant: 'General development knowledge'
    }
  }
}

// AI Learning from Development Patterns
async function learnFromPatterns(
  projectId: string,
  userId: string,
  conversationMemory: any,
  projectFiles: any[]
) {
  try {
    const mistralPixtral = getMistralPixtralModel()
    
    // OPTIMIZATION 1: Filter files - only src/ files, exclude ui components
    const relevantFiles = projectFiles.filter(file => 
      file.path.startsWith('src/') && 
      !file.path.startsWith('src/components/ui/') &&
      !file.isDirectory
    )
    
    // OPTIMIZATION 2: Truncate file content to max 50 tokens (~200 chars) per file
    const truncatedFiles = relevantFiles.slice(0, 10).map(file => ({
      path: file.path,
      content: (file.content || '').substring(0, 200) + (file.content?.length > 200 ? '...' : ''),
      type: file.fileType || 'text'
    }))
    
    // OPTIMIZATION 3: Only last 5 messages with truncation
    const recentMessages = (conversationMemory?.messages || [])
      .slice(-5)
      .map((msg: any) => ({
        role: msg.role,
        content: (msg.content || '').substring(0, 100) + (msg.content?.length > 100 ? '...' : '')
      }))
    
    // OPTIMIZATION 4: Ultra-compact prompt to stay under 200 tokens total
    const promptContent = `Recent: ${JSON.stringify(recentMessages)}
Files: ${JSON.stringify(truncatedFiles)}
JSON: {"style":"brief","patterns":["p1"],"tech":["t1"],"score":0.7,"recs":["r1"]}`
    
    // Debug: Estimate token usage (rough approximation: 4 chars = 1 token)
    const estimatedTokens = Math.ceil((promptContent.length + 60) / 4) // +60 for system message
    console.log(`[DEBUG] learn_patterns optimized token estimate: ${estimatedTokens} tokens`)
    
    const learningInsights = await generateText({
      model: mistralPixtral,
      messages: [
        { role: 'system', content: 'Analyze dev patterns from minimal context. Respond with compact JSON.' },
        { role: 'user', content: promptContent }
      ],
      temperature: 0.1
      // Note: maxTokens not available in this AI SDK version, relying on prompt engineering
    })

    try {
      // Check if the response is actually JSON
      console.log('[DEBUG] Learning insights response type check:', {
        hasText: !!learningInsights.text,
        textLength: learningInsights.text?.length || 0,
        startsWithBrace: learningInsights.text?.trim().startsWith('{') || false,
        textPreview: learningInsights.text?.substring(0, 100) || 'no text'
      })
      
      if (learningInsights.text && learningInsights.text.trim().startsWith('{')) {
        // Extract JSON from markdown response if present
        let jsonText = learningInsights.text
        if (jsonText.includes('```json')) {
          jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '')
        } else if (jsonText.includes('```')) {
          jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '')
        }
        jsonText = jsonText.trim()
        
        // Remove any text after the JSON object
        const jsonEndIndex = jsonText.lastIndexOf('}')
        if (jsonEndIndex !== -1) {
          jsonText = jsonText.substring(0, jsonEndIndex + 1)
        }
        
        const parsed = JSON.parse(jsonText)
      return {
        codingStyle: parsed.style || parsed.codingStyle || 'Standard React/TypeScript patterns',
        componentPatterns: parsed.patterns || parsed.componentPatterns || ['Functional components'],
        stylingPreferences: parsed.styling || parsed.stylingPreferences || ['Tailwind CSS'],
        technicalDecisions: parsed.tech || parsed.technicalDecisions || ['Component-based architecture'],
        commonApproaches: parsed.approaches || parsed.commonApproaches || ['Modular development'],
        optimizationAreas: parsed.areas || parsed.optimizationAreas || ['Code organization'],
        learningScore: parsed.score || parsed.learningScore || 0.7,
        recommendations: parsed.recs || parsed.recommendations || ['Continue current patterns']
        }
      } else {
        // Handle non-JSON responses (plain text)
        console.log('[DEBUG] AI returned plain text instead of JSON for learning insights')
        return {
          codingStyle: learningInsights.text || 'Standard React/TypeScript patterns',
          componentPatterns: ['Functional components'],
          stylingPreferences: ['Tailwind CSS'],
          technicalDecisions: ['Component-based architecture'],
          commonApproaches: ['Modular development'],
          optimizationAreas: ['Code organization'],
          learningScore: 0.6,
          recommendations: ['Continue current patterns']
        }
      }
    } catch (parseError) {
      console.warn('Failed to parse AI learning insights, using fallback:', parseError)
      return {
        codingStyle: 'Standard React/TypeScript patterns',
        componentPatterns: ['Functional components'],
        stylingPreferences: ['Tailwind CSS'],
        technicalDecisions: ['Component-based architecture'],
        commonApproaches: ['Modular development'],
        optimizationAreas: ['Code organization'],
        learningScore: 0.6,
        recommendations: ['Continue current patterns']
      }
    }
  } catch (error) {
    console.error('AI learning analysis failed:', error)
    return {
      codingStyle: 'Standard development patterns',
      componentPatterns: ['Basic components'],
      stylingPreferences: ['CSS frameworks'],
      technicalDecisions: ['Standard architecture'],
      commonApproaches: ['Basic development'],
      optimizationAreas: ['General improvement'],
      learningScore: 0.5,
      recommendations: ['Follow best practices']
    }
  }
}

// Helper function to detect if user is reporting code issues
function isReportingCodeIssues(userMessage: string, intentData?: any): boolean {
  const lowerMessage = userMessage.toLowerCase()

  // Keywords that indicate code issues or problems
  const codeIssueKeywords = [
    'error', 'bug', 'issue', 'problem', 'broken', 'not working', 'fails', 'failing',
    'crash', 'crashes', 'exception', 'debug', 'fix', 'broken', 'malfunction',
    'dependency issue', 'import error', 'compilation error', 'runtime error',
    'type error', 'syntax error', 'linting error', 'build error', 'test failure',
    'doesn\'t work', 'won\'t work', 'can\'t', 'unable to', 'stuck', 'hangs',
    'freezes', 'stops working', 'not responding', 'issues with', 'problems with',
    'trouble with', 'having issues', 'having problems', 'need help with'
  ]

  // Check if any code issue keywords are present
  const hasCodeIssueKeywords = codeIssueKeywords.some(keyword =>
    lowerMessage.includes(keyword)
  )

  // Check intent data for debugging or fixing patterns
  const hasDebugIntent = intentData?.intent?.toLowerCase().includes('debug') ||
                        intentData?.intent?.toLowerCase().includes('fix') ||
                        intentData?.intent?.toLowerCase().includes('error')

  return hasCodeIssueKeywords || hasDebugIntent
}

// Helper function to create file operation tools based on AI mode
function createFileOperationTools(projectId: string, aiMode: 'ask' | 'agent' = 'agent', conversationMemory: any[] = [], userId?: string, intentData?: any, userMessage?: string) {
  const tools: any = {}

  // Check if user is reporting code issues - only include advanced tools then
  const userReportingIssues = userMessage ? isReportingCodeIssues(userMessage, intentData) : false

  // Check if web tools are explicitly needed based on intent detection
  const needsWebTools = intentData?.required_tools?.includes('web_search') || intentData?.required_tools?.includes('web_extract')

  // Debug logging to verify web tools are conditionally included
  console.log('[DEBUG] Web Tools Conditional Logic:', {
    needsWebTools,
    requiredTools: intentData?.required_tools || [],
    intent: intentData?.intent || 'unknown',
    confidence: intentData?.confidence || 0
  })
  
  

  // Enhanced conversation memory tool with AI-powered context retrieval
  // Only include when user is reporting code issues
  if (userReportingIssues) {
    tools.recall_context = tool({
    description: 'Recall previous conversation context and key points with AI-enhanced analysis',
    inputSchema: z.object({
      limit: z.number().optional().describe('Number of recent messages to recall (default: 10)'),
      includeUserMessages: z.boolean().optional().describe('Include user messages in the recall (default: true)'),
      includeAssistantMessages: z.boolean().optional().describe('Include assistant messages in the recall (default: true)'),
      useAIEnhancement: z.boolean().optional().describe('Use AI to enhance context retrieval (default: true)')
    }),
    execute: async ({ limit = 10, includeUserMessages = true, includeAssistantMessages = true, useAIEnhancement = true }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        // Import storage manager for conversation memory
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        
        // Get conversation memory from storage using the passed user ID
        const actualUserId = userId || global.currentUserId || 'current-user'
        const conversationMemory = await storageManager.getConversationMemory(projectId, actualUserId)
        const conversationHistory = conversationMemory?.messages || []
        
        let filteredMessages = conversationHistory
        
        // Filter by message type if specified
        if (!includeUserMessages || !includeAssistantMessages) {
          filteredMessages = conversationHistory.filter((msg: any) => {
            if (!includeUserMessages && msg.role === 'user') return false
            if (!includeAssistantMessages && msg.role === 'assistant') return false
            return true
          })
        }
        
        // Limit the number of messages
        const limitedMessages = filteredMessages.slice(-limit)
        
        // Basic analysis for key points
        const keyPoints: string[] = []
        const fileOperations: string[] = []
        const decisions: string[] = []
        
        limitedMessages.forEach((msg: any) => {
          if (msg.role === 'assistant') {
            // Extract key information from assistant messages
            if (msg.content.includes('created') || msg.content.includes('modified')) {
              fileOperations.push(msg.content.substring(0, 100) + '...')
            }
            if (msg.content.includes('decided') || msg.content.includes('chose')) {
              decisions.push(msg.content.substring(0, 100) + '...')
            }
          }
        })
        
        // AI-enhanced context retrieval if enabled
        let aiEnhancedContext = null
        if (useAIEnhancement && conversationMemory) {
          try {
            const projectContext = await buildEnhancedProjectContext(projectId, storageManager)
            aiEnhancedContext = await findRelevantMemories(
              'What is most important to remember from our development work?',
              projectContext,
              conversationMemory
            )
          } catch (aiError) {
            console.warn('AI enhancement failed, using basic context:', aiError)
          }
        }
        
        // Combine basic and AI-enhanced insights
        const enhancedKeyPoints = aiEnhancedContext ? [
          ...keyPoints,
          ...aiEnhancedContext.relevantDecisions,
          ...aiEnhancedContext.applicablePatterns
        ] : keyPoints
        
        const enhancedSummary = aiEnhancedContext ? 
          `${aiEnhancedContext.relevantContext}\n\nConversation contains ${limitedMessages.length} messages with ${fileOperations.length} file operations and ${decisions.length} key decisions` :
          `Conversation contains ${limitedMessages.length} messages with ${fileOperations.length} file operations and ${decisions.length} key decisions`
        
        return {
          success: true,
          message: `Retrieved ${limitedMessages.length} messages from conversation memory${aiEnhancedContext ? ' with AI enhancement' : ''}`,
          messages: limitedMessages.map((msg: any) => ({
            role: msg.role,
            content: msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : ''),
            timestamp: msg.timestamp || new Date().toISOString()
          })),
          summary: enhancedSummary,
          keyPoints: enhancedKeyPoints,
          count: limitedMessages.length,
          // AI-enhanced insights
          aiInsights: aiEnhancedContext ? {
            relevantContext: aiEnhancedContext.relevantContext,
            technicalPatterns: aiEnhancedContext.applicablePatterns,
            relevanceScore: aiEnhancedContext.relevanceScore,
            whyRelevant: aiEnhancedContext.whyRelevant
          } : null,
          toolCallId
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] recall_context failed:', error)
        
        // Provide fallback response instead of failing
        return { 
          success: true, 
          message: `Context recall completed with some issues: ${errorMessage}`,
          messages: [],
          summary: 'No context available due to error',
          keyPoints: [],
          count: 0,
          toolCallId
        }
      }
    }
  })

  } // End conditional for recall_context

  // Add knowledge base tool
  // Only include when user is reporting code issues
  if (userReportingIssues) {
    tools.search_knowledge = tool({
    description: 'Get a specific knowledge item by ID',
    inputSchema: z.object({
      id: z.string().describe('ID of the knowledge item to retrieve')
    }),
    execute: async ({ id }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        // Import knowledge base service
        const { KnowledgeBase } = await import('@/lib/knowledge-base')
        
        const item = KnowledgeBase.getById(id)
        
        if (!item) {
          // If item not found, provide a helpful response with available IDs
          const allItems = KnowledgeBase.getAll()
          const availableIds = allItems.map((item: any) => item.id).join(', ')
          
          return {
            success: false,
            error: `Knowledge item with ID '${id}' not found. Available IDs: ${availableIds}`,
            toolCallId
          }
        }
        
        return {
          success: true,
          message: `Retrieved knowledge item: ${item.title}`,
          content: item.content,
          toolCallId
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] search_knowledge failed:', error)
        
        // Provide fallback response instead of failing
        return { 
          success: false, 
          error: `Failed to retrieve knowledge item: ${errorMessage}.`,
          toolCallId
        }
      }
    }
  })

  } // End conditional for search_knowledge

  // Get knowledge item tool
  // Only include when user is reporting code issues
  if (userReportingIssues) {
    tools.get_knowledge_item = tool({
    description: 'Get a specific knowledge item by ID',
    inputSchema: z.object({
      id: z.string().describe('ID of the knowledge item to retrieve')
    }),
    execute: async ({ id }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        // Import knowledge base service
        const { KnowledgeBase } = await import('@/lib/knowledge-base')
        
        const item = KnowledgeBase.getById(id)
        
        if (!item) {
          // If item not found, provide a helpful response with available IDs
          const allItems = KnowledgeBase.getAll()
          const availableIds = allItems.map((item: any) => item.id).join(', ')
          
          return {
            success: false,
            error: `Knowledge item with ID '${id}' not found. Available IDs: ${availableIds}`,
            toolCallId
          }
        }
        
        return {
          success: true,
          message: `Retrieved knowledge item: ${item.title}`,
          content: item.content,
          toolCallId
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] get_knowledge_item failed:', error)
        
        // Provide fallback response instead of failing
        return { 
          success: false, 
          error: `Failed to retrieve knowledge item: ${errorMessage}. Please try again or use search_knowledge instead.`,
          toolCallId
        }
      }
    }
  })

  } // End conditional for get_knowledge_item

  // Tool Results Summary - generates interactive assistant message bubble with emojis
  tools.tool_results_summary = tool({
    description: 'Generate an interactive summary of changes made, displayed in assistant message bubble with emojis',
    inputSchema: z.object({
      description: z.string().describe('Description of the changes that were made')
    }),
    execute: async ({ description }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }

      try {
        // Generate timestamp for the summary
        const timestamp = new Date().toISOString()

        // Generate AI-powered summary formatted for assistant message bubble
        try {
          const currentModel = getModel('auto')

          const summaryPrompt = `Create a friendly, engaging summary of the following changes for display in a chat assistant message bubble. Use relevant emojis throughout to make it interactive and visually appealing:

Changes: ${description}

Format as a natural assistant response with emojis that would appear in a chat bubble. Keep it to 2-3 sentences maximum. Be conversational and helpful.`

          const summaryResult = await generateText({
            model: currentModel,
            messages: [
              { role: 'system', content: 'You are a friendly chat assistant creating engaging summaries with emojis for display in message bubbles. Make it conversational and visually appealing with relevant emojis.' },
              { role: 'user', content: summaryPrompt }
            ],
            temperature: 0.4
          })

          const assistantMessage = summaryResult.text?.trim() || ''

          // Return formatted response for assistant message bubble display
          return {
            success: true,
            message: assistantMessage,
            displayType: 'assistant_bubble',
            summary: assistantMessage,
            timestamp,
            toolCallId,
            // Additional metadata for proper display
            formatted: true,
            emojiEnhanced: true,
            bubbleStyle: 'summary'
          }
        } catch (aiError) {
          console.error('[ERROR] Failed to generate AI summary:', aiError)

          // Fallback to basic assistant message format
          const fallbackMessage = `📝 I've processed the changes you mentioned! ${description} Everything looks good and has been updated accordingly.`

          return {
            success: true,
            message: fallbackMessage,
            displayType: 'assistant_bubble',
            summary: fallbackMessage,
            timestamp,
            toolCallId,
            formatted: true,
            emojiEnhanced: true,
            bubbleStyle: 'summary'
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] tool_results_summary failed:', error)

        // Error fallback with proper assistant message formatting
        const errorFallback = `⚠️ I encountered an issue while summarizing the changes, but here's what I can tell you: ${description || 'Some changes were made to the project.'}`

        return {
          success: true,
          message: errorFallback,
          displayType: 'assistant_bubble',
          summary: errorFallback,
          timestamp: new Date().toISOString(),
          toolCallId,
          formatted: true,
          emojiEnhanced: true,
          bubbleStyle: 'summary'
        }
      }
    }
  })
  
  // Read and list tools - available in both modes
  tools.read_file = tool({
    description: 'Read the contents of a file',
    inputSchema: z.object({
      path: z.string().describe('File path to read')
    }),
    execute: async ({ path }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        
        // Validate path
        if (!path || typeof path !== 'string') {
          return { 
            success: false, 
            error: `Invalid file path provided`,
            path,
            toolCallId
          }
        }
        
        const file = await storageManager.getFile(projectId, path)

        if (!file) {
          return { 
            success: false, 
            error: `File not found: ${path}. Use list_files to see available files.`,
            path,
            toolCallId
          }
        }

        return { 
          success: true, 
          message: `✅ File ${path} read successfully.`,
          path,
          content: file.content || '',
          name: file.name,
          type: file.type,
          size: file.size,
          action: 'read',
          toolCallId
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[ERROR] read_file failed for ${path}:`, error)
        
        return { 
          success: false, 
          error: `Failed to read file ${path}: ${errorMessage}`,
          path,
          toolCallId
        }
      }
    }
  })

  // List files tool
  // Only include when user is reporting code issues
  if (userReportingIssues) {
    tools.list_files = tool({
    description: 'List all files in the project',
    inputSchema: z.object({}),
    execute: async ({}, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        
        const files = await storageManager.getFiles(projectId)

        return { 
          success: true, 
          message: `✅ Found ${files.length} files in project.`,
          files: files.map(f => ({
            path: f.path,
            name: f.name,
            type: f.type,
            size: f.size,
            isDirectory: f.isDirectory,
            createdAt: f.createdAt
          })),
          count: files.length,
          action: 'list',
          toolCallId
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] list_files failed:', error)
        
        // Provide fallback response instead of failing
        return { 
          success: true, 
          message: `File listing completed with some issues: ${errorMessage}. Returning empty file list.`,
          files: [],
          count: 0,
          action: 'list',
          toolCallId
        }
      }
    }
  })

  } // End conditional for list_files

  // Write and delete tools - only available in Agent mode
  if (aiMode === 'agent') {
    tools.write_file = tool({
      description: 'Create a new file with specified content',
      inputSchema: z.object({
        path: z.string().describe('File path relative to project root'),
        content: z.string().describe('File content to write')
      }),
      execute: async ({ path, content },
         { abortSignal, toolCallId }) => {
        // Check for cancellation
        if (abortSignal?.aborted) {
          throw new Error('Operation cancelled')
        }
        
        try {
          // Validate inputs
          if (!path || typeof path !== 'string') {
            return { 
              success: false, 
              error: `Invalid file path provided`,
              path,
              toolCallId
            }
          }
          
          if (content === undefined || content === null) {
            return { 
              success: false, 
              error: `Invalid content provided`,
              path,
              toolCallId
            }
          }
          
          // Import storage manager
          const { storageManager } = await import('@/lib/storage-manager')
          await storageManager.init()
          
          // Check if file already exists
          const existingFile = await storageManager.getFile(projectId, path)

          if (existingFile) {
            // Update existing file
            await storageManager.updateFile(projectId, path, { content })
            return { 
              success: true, 
              message: `✅ File ${path} updated successfully.`,
              path,
              action: 'updated',
              toolCallId
            }
          } else {
            // Create new file
            const newFile = await storageManager.createFile({
              workspaceId: projectId,
              name: path.split('/').pop() || path,
              path,
              content,
              fileType: path.split('.').pop() || 'text',
              type: path.split('.').pop() || 'text',
              size: content.length,
              isDirectory: false
            })
            
            return { 
              success: true, 
              message: `✅ File ${path} created successfully.`,
              path,
              action: 'created',
              fileId: newFile.id,
              toolCallId
            }
          }
        } catch (error) {
          // Enhanced error handling
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`[ERROR] write_file failed for ${path}:`, error)
          
          return { 
            success: false, 
            error: `Failed to write file ${path}: ${errorMessage}`,
            path,
            toolCallId
          }
        }
      }
    })
    
    tools.delete_file = tool({
      description: 'Delete a file from the project',
      inputSchema: z.object({
        path: z.string().describe('File path relative to project root')
      }),
      execute: async ({ path }, { abortSignal, toolCallId }) => {
        // Check for cancellation
        if (abortSignal?.aborted) {
          throw new Error('Operation cancelled')
        }
        
        try {
          // Validate path
          if (!path || typeof path !== 'string') {
            return { 
              success: false, 
              error: `Invalid file path provided`,
              path,
              toolCallId
            }
          }
          
          // Import storage manager
          const { storageManager } = await import('@/lib/storage-manager')
          await storageManager.init()
          
          // Check if file exists
          const existingFile = await storageManager.getFile(projectId, path)

          if (!existingFile) {
            return { 
              success: false, 
              error: `File not found: ${path}. Use list_files to see available files.`,
              path,
              toolCallId
            }
          }

          // Delete the file
          const result = await storageManager.deleteFile(projectId, path)
          
          if (result) {
            return { 
              success: true, 
              message: `✅ File ${path} deleted successfully.`,
              path,
              action: 'deleted',
              toolCallId
            }
          } else {
            return { 
              success: false, 
              error: `Failed to delete file ${path}`,
              path,
              toolCallId
            }
          }
        } catch (error) {
          // Enhanced error handling
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`[ERROR] delete_file failed for ${path}:`, error)
          
          return { 
            success: false, 
            error: `Failed to delete file ${path}: ${errorMessage}`,
            path,
            toolCallId
          }
        }
      }
    })

    tools.edit_file = tool({
      description: 'Edit an existing file using precise search/replace operations. Provide the search and replace blocks directly as parameters.',
      inputSchema: z.object({
        path: z.string().describe('File path relative to project root to edit'),
        searchReplaceBlocks: z.array(z.object({
          search: z.string().describe('Exact text to find in the file (must match exactly including whitespace)'),
          replace: z.string().describe('Text to replace the search text with'),
          replaceAll: z.boolean().optional().describe('If true, replace all occurrences. If false or omitted, replace only the first occurrence.'),
          occurrenceIndex: z.number().optional().describe('If specified, replace only the Nth occurrence (1-based index). Overrides replaceAll.'),
          validateAfter: z.string().optional().describe('Optional text that should exist in the file after this operation (for validation)')
        })).describe('Array of search/replace operations to perform'),
        dryRun: z.boolean().optional().describe('If true, validate all operations without applying changes'),
        rollbackOnFailure: z.boolean().optional().describe('If true, rollback all changes if any operation fails (default: true)')
      }),
      execute: async ({ path, searchReplaceBlocks, dryRun = false, rollbackOnFailure = true }, { abortSignal, toolCallId }) => {
        // Check for cancellation
        if (abortSignal?.aborted) {
          throw new Error('Operation cancelled')
        }
        
        try {
          // Validate inputs
          if (!path || typeof path !== 'string') {
            return { 
              success: false, 
              error: `Invalid file path provided`,
              path,
              toolCallId
            }
          }

          if (!searchReplaceBlocks || !Array.isArray(searchReplaceBlocks) || searchReplaceBlocks.length === 0) {
            return { 
              success: false, 
              error: `No search/replace blocks provided`,
              path,
              toolCallId
            }
          }

          // Import storage manager
          const { storageManager } = await import('@/lib/storage-manager')
          await storageManager.init()
          
          // Check if file exists
          const existingFile = await storageManager.getFile(projectId, path)

          if (!existingFile) {
            return { 
              success: false, 
              error: `File not found: ${path}. Use list_files to see available files.`,
              path,
              toolCallId
            }
          }

          // Helper functions
          function escapeRegExp(string: string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          }

          function findNthOccurrence(content: string, searchText: string, n: number): number {
            let index = -1;
            for (let i = 0; i < n; i++) {
              index = content.indexOf(searchText, index + 1);
              if (index === -1) return -1;
            }
            return index;
          }

          function replaceNthOccurrence(content: string, searchText: string, replaceText: string, n: number): string {
            const index = findNthOccurrence(content, searchText, n);
            if (index === -1) return content;
            return content.substring(0, index) + replaceText + content.substring(index + searchText.length);
          }

          // Initialize tracking arrays
          const appliedEdits: Array<{
            blockIndex: number;
            search: string;
            replace: string;
            status: string;
            replaceAll?: boolean;
            occurrenceIndex?: number;
            occurrencesReplaced?: number;
            validationPassed?: boolean;
          }> = [];
          const failedEdits: Array<{
            blockIndex: number;
            search: string;
            replace: string;
            status: string;
            reason: string;
            validationError?: string;
          }> = [];

          // Store original content for rollback
          const originalContent = existingFile.content;
          let modifiedContent = originalContent;
          const contentSnapshots: string[] = [originalContent];

          // Phase 1: Dry run validation (always performed)
          console.log(`[DEBUG] Starting validation phase for ${searchReplaceBlocks.length} blocks`);
          
          let tempContent = originalContent;
          const validationResults: Array<{
            blockIndex: number;
            canApply: boolean;
            reason?: string;
            occurrencesFound: number;
          }> = [];

          for (let i = 0; i < searchReplaceBlocks.length; i++) {
            const block = searchReplaceBlocks[i];
            const searchText = block.search;
            const replaceText = block.replace;
            const replaceAll = block.replaceAll || false;
            const occurrenceIndex = block.occurrenceIndex;
            const validateAfter = block.validateAfter;

            // Count occurrences in current temp content
            const occurrences = (tempContent.match(new RegExp(escapeRegExp(searchText), 'g')) || []).length;
            
            let canApply = true;
            let reason = '';

            if (occurrences === 0) {
              canApply = false;
              reason = 'Search text not found in content';
            } else if (occurrenceIndex && occurrenceIndex > occurrences) {
              canApply = false;
              reason = `Requested occurrence ${occurrenceIndex} but only ${occurrences} occurrences found`;
            }

            validationResults.push({
              blockIndex: i,
              canApply,
              reason,
              occurrencesFound: occurrences
            });

            // If this block can be applied, simulate the change for next validation
            if (canApply) {
              if (occurrenceIndex) {
                tempContent = replaceNthOccurrence(tempContent, searchText, replaceText, occurrenceIndex);
              } else if (replaceAll) {
                tempContent = tempContent.replaceAll(searchText, replaceText);
              } else {
                tempContent = tempContent.replace(searchText, replaceText);
              }

              // Validate the content after this change if specified
              if (validateAfter && !tempContent.includes(validateAfter)) {
                canApply = false;
                reason = `Validation failed: expected text "${validateAfter}" not found after operation`;
                validationResults[i].canApply = false;
                validationResults[i].reason = reason;
              }
            }
          }

          // Check if any validations failed
          const failedValidations = validationResults.filter(r => !r.canApply);
          
          if (dryRun) {
            // Return dry run results
            return {
              success: failedValidations.length === 0,
              message: `🔍 Dry run completed. ${validationResults.length - failedValidations.length}/${validationResults.length} operations would succeed.`,
              path,
              action: 'dry_run_completed',
              toolCallId,
              dryRunResults: {
                totalBlocks: searchReplaceBlocks.length,
                validBlocks: validationResults.length - failedValidations.length,
                invalidBlocks: failedValidations.length,
                validationResults,
                previewContent: tempContent
              }
            };
          }

          // Phase 2: Apply changes (only if not dry run)
          console.log(`[DEBUG] Applying ${validationResults.length - failedValidations.length} valid operations`);
          
          for (let i = 0; i < searchReplaceBlocks.length; i++) {
            const block = searchReplaceBlocks[i];
            const validation = validationResults[i];
            
            if (!validation.canApply) {
              failedEdits.push({
                blockIndex: i,
                search: block.search,
                replace: block.replace,
                status: 'failed',
                reason: validation.reason || 'Validation failed'
              });
              
              if (rollbackOnFailure) {
                console.log(`[DEBUG] Block ${i} failed, rolling back all changes`);
                modifiedContent = originalContent;
                return {
                  success: false,
                  error: `Operation ${i + 1} failed: ${validation.reason}. All changes rolled back.`,
                  path,
                  toolCallId,
                  rollbackPerformed: true,
                  failedEdits
                };
              }
              continue;
            }

            const searchText = block.search;
            const replaceText = block.replace;
            const replaceAll = block.replaceAll || false;
            const occurrenceIndex = block.occurrenceIndex;

            // Apply the replacement
            let occurrencesReplaced = 0;
            
            if (occurrenceIndex) {
              modifiedContent = replaceNthOccurrence(modifiedContent, searchText, replaceText, occurrenceIndex);
              occurrencesReplaced = 1;
            } else if (replaceAll) {
              const beforeCount = (modifiedContent.match(new RegExp(escapeRegExp(searchText), 'g')) || []).length;
              modifiedContent = modifiedContent.replaceAll(searchText, replaceText);
              occurrencesReplaced = beforeCount;
            } else {
              modifiedContent = modifiedContent.replace(searchText, replaceText);
              occurrencesReplaced = 1;
            }

            // Validate after replacement if specified
            let validationPassed = true;
            if (block.validateAfter && !modifiedContent.includes(block.validateAfter)) {
              validationPassed = false;
              if (rollbackOnFailure) {
                console.log(`[DEBUG] Post-operation validation failed for block ${i}, rolling back`);
                modifiedContent = originalContent;
                return {
                  success: false,
                  error: `Post-operation validation failed for block ${i + 1}. All changes rolled back.`,
                  path,
                  toolCallId,
                  rollbackPerformed: true,
                  validationError: `Expected text "${block.validateAfter}" not found after operation`
                };
              }
            }

            appliedEdits.push({
              blockIndex: i,
              search: searchText,
              replace: replaceText,
              status: 'applied',
              replaceAll,
              occurrenceIndex,
              occurrencesReplaced,
              validationPassed
            });

            // Take snapshot after each successful operation
            contentSnapshots.push(modifiedContent);
          }

          // Check if any edits were applied
          if (appliedEdits.length === 0) {
            return {
              success: false,
              error: `No changes could be applied. All ${failedEdits.length} search/replace operations failed.`,
              path,
              toolCallId,
              failedEdits
            }
          }

          // Update the file in storage
          await storageManager.updateFile(projectId, path, { 
            content: modifiedContent,
            updatedAt: new Date().toISOString()
          });

          console.log(`[DEBUG] Successfully applied ${appliedEdits.length} edits to ${path}`);
          
          return {
            success: true,
            message: `✅ File ${path} updated successfully. Applied ${appliedEdits.length}/${searchReplaceBlocks.length} changes.`,
            path,
            content: modifiedContent,
            action: 'edit_completed',
            toolCallId,
            appliedEdits,
            failedEdits: failedEdits.length > 0 ? failedEdits : undefined,
            validationResults,
            rollbackOnFailure,
            contentSnapshots: contentSnapshots.length > 2 ? ['original', '...', 'final'] : contentSnapshots.map((_, i) => i === 0 ? 'original' : `step_${i}`)
          }

        } catch (error) {
          // Enhanced error handling
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`[ERROR] edit_file failed for ${path}:`, error)
          
          return { 
            success: false, 
            error: `Failed to edit file ${path}: ${errorMessage}`,
            path,
            toolCallId
          }
        }
      }
    })
  }
  
  // Add web search tool - ONLY when explicitly needed based on intent detection
  if (needsWebTools) {
    tools.web_search = tool({
    description: 'Search the web for current information and context. Returns clean, structured text instead of raw JSON data.',
    inputSchema: z.object({
      query: z.string().describe('Search query to find relevant web content')
    }),
    execute: async ({ query }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        const searchResults = await searchWeb(query)
        
        return {
          success: true,
          message: `Web search completed successfully for query: "${query}"`,
          // Send clean, structured text instead of raw JSON
          cleanResults: searchResults.cleanedResults,
          // Keep minimal metadata for reference
          metadata: {
            query: searchResults.query,
            resultCount: searchResults.resultCount,
            totalLength: searchResults.cleanedResults.length
          },
          query,
          toolCallId
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] web_search failed:', error)
        
        return { 
          success: false, 
          error: `Web search failed: ${errorMessage}`,
          query,
          toolCallId
        }
      }
    }
  })

    // Add web content extraction tool using AnyAPI - ONLY when explicitly needed
    tools.web_extract = tool({
    description: 'Extract content from web pages using AnyAPI. Returns clean, structured text.',
    inputSchema: z.object({
      urls: z.union([
        z.string().url().describe('URL to extract content from'),
        z.array(z.string().url()).describe('Array of URLs to extract content from')
      ]).describe('URL or URLs to extract content from')
    }),
    execute: async ({ urls }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      // Ensure urls is always an array
      const urlArray = Array.isArray(urls) ? urls : [urls];
      
      try {
        // Import the web scraper
        const { webScraper } = await import('@/lib/web-scraper');
        
        // Process URLs sequentially to manage API key usage
        const extractionResults = await Promise.all(
          urlArray.map(async (url) => {
            try {
              const scraperResult = await webScraper.execute({ url });
              
              // Debug logging for web extraction
              console.log(`[DEBUG] Web extract for ${url}:`, {
                hasResult: !!scraperResult,
                resultType: typeof scraperResult,
                resultKeys: scraperResult ? Object.keys(scraperResult) : [],
                hasCleanResults: scraperResult?.cleanResults ? true : false,
                cleanResultsType: typeof scraperResult?.cleanResults,
                cleanResultsLength: scraperResult?.cleanResults?.length || 0
              });
              
              // Extract content from the scraper result
              const extractContent = (result: any): string => {
                // The webScraper returns cleanResults directly
                if (result && typeof result === 'object' && result.cleanResults) {
                  return result.cleanResults;
                }
                
                // Fallback to message if cleanResults not available
                if (result && typeof result === 'object' && result.message) {
                  return result.message;
                }
                
                // Last resort: stringify the result (but avoid circular references)
                try {
                  return JSON.stringify(result, (key, value) => {
                    if (key === 'metadata' || key === 'apiKeyUsed') {
                      return '[REDACTED]';
                    }
                    return value;
                  }, 2);
                } catch {
                  return 'Content extracted successfully';
                }
              };
              
              return {
                success: true,
                url,
                cleanResults: extractContent(scraperResult),
                metadata: {
                  url,
                  timestamp: new Date().toISOString(),
                  apiKeyUsed: scraperResult.metadata?.apiKeyUsed || 'unknown'
                }
              };
            } catch (error) {
              console.error(`[ERROR] Web extract failed for ${url}:`, error);
              return {
                success: false,
                url,
                error: error instanceof Error ? error.message : 'Unknown error',
                cleanResults: ''
              };
            }
          })
        );
        
        // Separate successful and failed extractions
        const successfulResults = extractionResults.filter(result => result.success);
        const failedResults = extractionResults.filter(result => !result.success);
        
        // Debug logging for final result
        console.log('[DEBUG] Web extract final result:', {
          totalUrls: urlArray.length,
          successfulCount: successfulResults.length,
          failedCount: failedResults.length,
          cleanResultsLength: successfulResults.map(r => r.cleanResults?.length || 0),
          sampleCleanResults: successfulResults[0]?.cleanResults?.substring(0, 100) || 'none'
        });
        
        return {
          success: successfulResults.length > 0,
          message: successfulResults.length > 0 
            ? `Successfully extracted content from ${successfulResults.length} URL(s)` 
            : 'Failed to extract content from any URLs',
          cleanResults: successfulResults.map(result => result.cleanResults).join('\n\n'),
          metadata: {
            successCount: successfulResults.length,
            failedCount: failedResults.length,
            urls: urlArray
          },
          toolCallId
        };
      } catch (error) {
        console.error('[ERROR] Web extract failed:', error);
        
        return { 
          success: false, 
          error: `Web extract failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cleanResults: '',
          metadata: {
            urls: urlArray
          },
          toolCallId
        };
      }
    }
  })
  } // End conditional for web tools

  // AI-Powered Learning and Pattern Recognition Tool (optimized for minimal token usage)
  // Only include when user is reporting code issues
  if (aiMode === 'agent' && userReportingIssues) { // Re-enabled with strict optimizations
  tools.learn_patterns = tool({
    description: 'Analyze development patterns from recent messages and src files (optimized, <200 tokens)',
    inputSchema: z.object({
      analysisType: z.enum(['coding_style', 'component_patterns', 'technical_decisions', 'optimization_areas']).optional().describe('Type of analysis to perform (default: all)'),
      includeRecommendations: z.boolean().optional().describe('Include improvement recommendations (default: true)'),
      projectScope: z.enum(['current', 'all_projects', 'recent']).optional().describe('Scope of analysis (default: current)')
    }),
    execute: async ({ analysisType = 'coding_style', includeRecommendations = true, projectScope = 'current' }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        // Import storage manager
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        
        // Get conversation memory and project files
        const conversationMemory = await storageManager.getConversationMemory(projectId, global.currentUserId || 'current-user')
        const projectFiles = await storageManager.getFiles(projectId)
        
        if (!conversationMemory) {
          return {
            success: false,
            error: 'No conversation memory found for pattern analysis',
            toolCallId
          }
        }
        
        // Use AI to analyze patterns and learn from development history
        const learningInsights = await learnFromPatterns(
          projectId,
          global.currentUserId || 'current-user',
          conversationMemory,
          projectFiles
        )
        
        // Generate analysis report based on requested type
        let analysisReport = ''
        let keyInsights: any[] = []
        
        switch (analysisType) {
          case 'coding_style':
            analysisReport = `## Coding Style Analysis\n\n**Your Preferred Style:** ${learningInsights.codingStyle}\n\n**Component Patterns:** ${learningInsights.componentPatterns.join(', ')}\n\n**Styling Preferences:** ${learningInsights.stylingPreferences.join(', ')}`
            keyInsights = [learningInsights.codingStyle, ...learningInsights.componentPatterns, ...learningInsights.stylingPreferences]
            break
            
          case 'component_patterns':
            analysisReport = `## Component Pattern Analysis\n\n**Established Patterns:** ${learningInsights.componentPatterns.join(', ')}\n\n**Technical Decisions:** ${learningInsights.technicalDecisions.join(', ')}\n\n**Common Approaches:** ${learningInsights.commonApproaches.join(', ')}`
            keyInsights = [...learningInsights.componentPatterns, ...learningInsights.technicalDecisions, ...learningInsights.commonApproaches]
            break
            
          case 'technical_decisions':
            analysisReport = `## Technical Decision Analysis\n\n**Architecture Choices:** ${learningInsights.technicalDecisions.join(', ')}\n\n**Common Approaches:** ${learningInsights.commonApproaches.join(', ')}\n\n**Learning Score:** ${Math.round(learningInsights.learningScore * 100)}%`
            keyInsights = [...learningInsights.technicalDecisions, ...learningInsights.commonApproaches]
            break
            
          case 'optimization_areas':
            analysisReport = `## Optimization Analysis\n\n**Areas for Improvement:** ${learningInsights.optimizationAreas.join(', ')}\n\n**Recommendations:** ${learningInsights.recommendations.join(', ')}\n\n**Learning Score:** ${Math.round(learningInsights.learningScore * 100)}%`
            keyInsights = [...learningInsights.optimizationAreas, ...learningInsights.recommendations]
            break
            
          default:
            analysisReport = `## Complete Pattern Analysis\n\n**Coding Style:** ${learningInsights.codingStyle}\n\n**Component Patterns:** ${learningInsights.componentPatterns.join(', ')}\n\n**Technical Decisions:** ${learningInsights.technicalDecisions.join(', ')}\n\n**Optimization Areas:** ${learningInsights.optimizationAreas.join(', ')}\n\n**Recommendations:** ${learningInsights.recommendations.join(', ')}\n\n**Learning Score:** ${Math.round(learningInsights.learningScore * 100)}%`
            keyInsights = [
              learningInsights.codingStyle,
              ...learningInsights.componentPatterns,
              ...learningInsights.technicalDecisions,
              ...learningInsights.optimizationAreas,
              ...learningInsights.recommendations
            ]
        }
        
        return {
          success: true,
          message: `Pattern analysis completed successfully for ${analysisType}`,
          analysis: {
            type: analysisType,
            report: analysisReport,
            insights: keyInsights,
            learningScore: learningInsights.learningScore,
            recommendations: includeRecommendations ? learningInsights.recommendations : []
          },
          toolCallId
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] learn_patterns failed:', error)
        
        return { 
          success: false, 
          error: `Pattern analysis failed: ${errorMessage}`,
          toolCallId
        }
      }
    }
  })
  } // End learn_patterns conditional

  // AI Dependency Analyzer - Validates imports and auto-adds missing dependencies
  // Only include when user is reporting code issues
  if (userReportingIssues) {
    tools.analyze_dependencies = tool({
    description: 'Analyze file imports, validate against package.json, and automatically add missing dependencies with latest versions',
    inputSchema: z.object({
      filePath: z.string().describe('Path of the file to analyze'),
      fileContent: z.string().describe('Content of the file to analyze'),
      autoFix: z.boolean().optional().describe('Automatically suggest package.json updates (default: true)')
    }),
    execute: async ({ filePath, fileContent, autoFix = true }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        // Import storage manager
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        
        // Get package.json
        const packageJsonFile = await storageManager.getFile(projectId, 'package.json')
        if (!packageJsonFile) {
          return {
            success: false,
            error: 'package.json not found',
            toolCallId
          }
        }
        
        let packageJson: any = {}
        try {
          packageJson = JSON.parse(packageJsonFile.content)
        } catch (error) {
          return {
            success: false,
            error: 'Invalid package.json format',
            toolCallId
          }
        }
        
        // Use AI to analyze imports and get latest package versions
        const mistralPixtral = getMistralPixtralModel()
        
        const analysisPrompt = `Analyze this file for import statements and validate against package.json dependencies.

File: ${filePath}
Content: ${fileContent.substring(0, 2000)}${fileContent.length > 2000 ? '...' : ''}

Current package.json dependencies:
${JSON.stringify({
  dependencies: packageJson.dependencies || {},
  devDependencies: packageJson.devDependencies || {}
}, null, 2)}

Find all import statements and identify missing packages. For missing packages, provide the latest stable version.

Common package versions (use these if found):
- axios: "^1.6.0", lodash: "^4.17.21", moment: "^2.29.4"
- @types/react: "^18.2.0", @types/node: "^20.0.0"
- framer-motion: "^10.16.0", react-router-dom: "^6.20.0"
- tailwindcss: "^3.4.0", @headlessui/react: "^1.7.0"

Respond with JSON:
{
  "imports": [{"package": "react", "statement": "import React from 'react'", "exists": true}],
  "missingDeps": [{"package": "axios", "version": "^1.6.0", "type": "dependency"}],
  "valid": true/false,
  "summary": "Brief analysis"
}

Dependency types:
- Runtime packages (axios, lodash, framer-motion) → "dependency"  
- Type definitions (@types/*) → "devDependency"
- Build tools, testing, linting → "devDependency"`
        
        const analysis = await generateText({
          model: mistralPixtral,
          messages: [
            { role: 'system', content: 'You are a dependency analyzer. Extract import statements and validate against package.json. Respond with compact JSON only.' },
            { role: 'user', content: analysisPrompt }
          ],
          temperature: 0.1
        })
        
        // Parse AI response
        let analysisResult: any = {}
        try {
          let jsonText = analysis.text || '{}'
          if (jsonText.includes('```json')) {
            jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '')
          } else if (jsonText.includes('```')) {
            jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '')
          }
          jsonText = jsonText.trim()
          
          // Find JSON object bounds
          const startIndex = jsonText.indexOf('{')
          const endIndex = jsonText.lastIndexOf('}')
          if (startIndex !== -1 && endIndex !== -1) {
            jsonText = jsonText.substring(startIndex, endIndex + 1)
          }
          
          analysisResult = JSON.parse(jsonText)
        } catch (parseError) {
          console.warn('Failed to parse dependency analysis, using fallback')
          analysisResult = {
            imports: [],
            missingDeps: [],
            valid: true,
            summary: 'Analysis completed with fallback parsing'
          }
        }
        
        // AUTO-FIX: Add missing dependencies to package.json using edit_file tool
        let packageJsonUpdated = false
        const addedDependencies: string[] = []
        
        if (autoFix && analysisResult.missingDeps?.length > 0) {
          try {
            for (const missingDep of analysisResult.missingDeps) {
              const packageName = missingDep.package
              const version = missingDep.version || '^1.0.0' // Default version if AI doesn't provide one
              const depType = missingDep.type || 'dependency'
              
              // Determine which section to update
              const sectionKey = depType === 'devDependency' ? 'devDependencies' : 'dependencies'
              const currentSection = packageJson[sectionKey] || {}
              
              // Skip if package already exists
              if (currentSection[packageName]) {
                continue
              }
              
              // Use edit_file logic to add the dependency
              try {
                // Update the in-memory package.json object
                const updatedPackageJson = { ...packageJson }
                
                if (depType === 'devDependency') {
                  updatedPackageJson.devDependencies = updatedPackageJson.devDependencies || {}
                  updatedPackageJson.devDependencies[packageName] = version
                } else {
                  updatedPackageJson.dependencies = updatedPackageJson.dependencies || {}
                  updatedPackageJson.dependencies[packageName] = version
                }
                
                // Update the file using storage manager
                await storageManager.updateFile(projectId, 'package.json', {
                  content: JSON.stringify(updatedPackageJson, null, 2),
                  updatedAt: new Date().toISOString()
                })
                
                addedDependencies.push(`${packageName}@${version} (${depType})`)
                packageJsonUpdated = true
                
                console.log(`[DEPENDENCY AUTO-FIX] Added ${packageName}@${version} to ${sectionKey}`)
              } catch (editError) {
                console.warn(`[DEPENDENCY AUTO-FIX] Failed to add ${packageName}:`, editError)
              }
            }
          } catch (autoFixError) {
            console.error('[ERROR] Auto-fix dependencies failed:', autoFixError)
          }
        }
        
        // Build response
        const result = {
          success: true,
          message: packageJsonUpdated ? 
            `Dependencies auto-added to package.json for ${filePath}: ${addedDependencies.join(', ')}` :
            `Dependency analysis completed for ${filePath}`,
          analysis: {
            filePath,
            imports: analysisResult.imports || [],
            missingDependencies: analysisResult.missingDeps || [],
            isValid: analysisResult.valid !== false || packageJsonUpdated,
            summary: analysisResult.summary || 'Dependencies validated',
            autoFixed: packageJsonUpdated,
            addedDependencies: addedDependencies,
            suggestions: packageJsonUpdated ? 
              [`Run 'npm install' to install the newly added dependencies`] :
              (analysisResult.missingDeps?.map((dep: any) => `npm install ${dep.package}`) || [])
          },
          toolCallId
        }
        
        // Log issues if any
        if (analysisResult.missingDeps?.length > 0) {
          console.warn(`[DEPENDENCY WARNING] Missing dependencies in ${filePath}:`, analysisResult.missingDeps)
        }
        
        return result
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] analyze_dependencies failed:', error)
        
        return { 
          success: false, 
          error: `Dependency analysis failed: ${errorMessage}`,
          toolCallId
        }
      }
    }
  })

  } // End conditional for analyze_dependencies

  // AI Code Scanner - Validates import/export relationships between project files
  // Only include when user is reporting code issues
  if (userReportingIssues) {
    tools.scan_code_imports = tool({
    description: 'Scan file imports/exports and validate relationships between project files to prevent runtime errors',
    inputSchema: z.object({
      filePath: z.string().describe('Path of the file to scan'),
      fileContent: z.string().describe('Content of the file to scan'),
      validateExports: z.boolean().optional().describe('Validate export/import relationships (default: true)')
    }),
    execute: async ({ filePath, fileContent, validateExports = true }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        // Import storage manager
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        
        // Get all project files for reference validation
        const allProjectFiles = await storageManager.getFiles(projectId)
        
        // Filter to only project files (exclude node_modules)
        const projectFiles = allProjectFiles.filter(file => 
          !file.path.includes('node_modules') && 
          !file.isDirectory &&
          (file.path.endsWith('.ts') || file.path.endsWith('.tsx') || file.path.endsWith('.js') || file.path.endsWith('.jsx'))
        )
        
        // Create truncated file map with only import/export sections
        const fileExportMap: any = {}
        for (const file of projectFiles) {
          if (file.content) {
            // Extract only import and export sections to save tokens
            const lines = file.content.split('\n')
            const importLines = lines.filter(line => 
              line.trim().startsWith('import ') || 
              line.trim().startsWith('export ')
            )
            
            fileExportMap[file.path] = {
              imports: importLines.filter(line => line.trim().startsWith('import ')).slice(0, 10), // Max 10 imports
              exports: importLines.filter(line => line.trim().startsWith('export ')).slice(0, 10), // Max 10 exports
              hasDefaultExport: file.content.includes('export default'),
              hasNamedExports: file.content.includes('export {') || file.content.includes('export const') || file.content.includes('export function')
            }
          }
        }
        
        // Use AI to analyze import/export relationships
        const mistralPixtral = getMistralPixtralModel()
        
        const scanPrompt = `Analyze this file's imports and validate against project file exports.

Target File: ${filePath}
Content (first 1000 chars): ${fileContent.substring(0, 1000)}${fileContent.length > 1000 ? '...' : ''}

Project Files Export Map (truncated for efficiency):
${JSON.stringify(fileExportMap, null, 2)}

Validate:
1. All imported files exist in project
2. Imported exports exist in target files  
3. Import syntax matches export type (default vs named)

Respond with compact JSON:
{
  "imports": [{"from": "./Button", "imports": ["Button"], "exists": true, "exportsMatch": true}],
  "issues": [{"type": "missing_file", "import": "./Missing", "message": "File not found"}],
  "valid": true/false,
  "summary": "Brief scan result"
}`
        
        const scanResult = await generateText({
          model: mistralPixtral,
          messages: [
            { role: 'system', content: 'You are a code scanner. Validate import/export relationships. Respond with compact JSON only.' },
            { role: 'user', content: scanPrompt }
          ],
          temperature: 0.1
        })
        
        // Parse AI response
        let scanAnalysis: any = {}
        try {
          let jsonText = scanResult.text || '{}'
          if (jsonText.includes('```json')) {
            jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '')
          } else if (jsonText.includes('```')) {
            jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '')
          }
          jsonText = jsonText.trim()
          
          // Find JSON object bounds
          const startIndex = jsonText.indexOf('{')
          const endIndex = jsonText.lastIndexOf('}')
          if (startIndex !== -1 && endIndex !== -1) {
            jsonText = jsonText.substring(startIndex, endIndex + 1)
          }
          
          scanAnalysis = JSON.parse(jsonText)
        } catch (parseError) {
          console.warn('Failed to parse code scan analysis, using fallback')
          scanAnalysis = {
            imports: [],
            issues: [],
            valid: true,
            summary: 'Scan completed with fallback parsing'
          }
        }
        
        // Build comprehensive response
        const result = {
          success: true,
          message: `Code scan completed for ${filePath}`,
          analysis: {
            filePath,
            imports: scanAnalysis.imports || [],
            issues: scanAnalysis.issues || [],
            isValid: scanAnalysis.valid !== false,
            summary: scanAnalysis.summary || 'Code scan completed',
            totalProjectFiles: projectFiles.length,
            scannedImports: scanAnalysis.imports?.length || 0,
            foundIssues: scanAnalysis.issues?.length || 0
          },
          toolCallId
        }
        
        // Log issues if any
        if (scanAnalysis.issues?.length > 0) {
          console.warn(`[CODE SCAN WARNING] Issues found in ${filePath}:`, scanAnalysis.issues)
        }
        
        return result
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] scan_code_imports failed:', error)
        
        return { 
          success: false, 
          error: `Code scan failed: ${errorMessage}`,
          toolCallId
        }
      }
    }
  })

  } // End conditional for scan_code_imports

  // Debug logging to show which tools are included
  const toolNames = Object.keys(tools)
  console.log('[DEBUG] Final Tool Set:', {
    totalTools: toolNames.length,
    toolNames: toolNames.sort(),
    hasWebSearch: toolNames.includes('web_search'),
    hasWebExtract: toolNames.includes('web_extract'),
    hasReadFile: toolNames.includes('read_file'),
    hasWriteFile: toolNames.includes('write_file'),
    hasEditFile: toolNames.includes('edit_file')
  })

  return tools
}





// NLP Intent Detection using Mistral Pixtral
async function detectUserIntent(userMessage: string, projectContext: string, conversationHistory: any[]) {
  try {
    const mistralPixtralModel = getMistralPixtralModel()
    
    const intentPrompt = `Analyze the user's request and determine their intent for building or modifying a React application.

🚨 CRITICAL RULES - READ FIRST:
- NEVER recommend web_search or web_extract unless user EXPLICITLY asks for web research
- For file modifications, product additions, or code changes, recommend ONLY list_files, read_file, write_file, edit_file
- Web tools are FORBIDDEN for basic development tasks
- If user wants to add products, edit files, or modify code, use file operations only

User Message: "${userMessage}"

Project Context: ${projectContext}

Recent Conversation History (last 5 exchanges):
${conversationHistory.slice(-10).map((msg, i) => `${msg.role}: ${msg.content}`).join('\n')}

Based on the user's request, determine:
1. **Primary Intent**: What does the user want to accomplish?
2. **Required Tools**: Which tools should be used? (PREFER list_files, read_file, write_file, edit_file, delete_file - AVOID web_search, web_extract unless explicitly requested)
3. **File Operations**: What files need to be created, modified, or deleted?
4. **Complexity Level**: Simple, Medium, or Complex task?
5. **Action Plan**: Step-by-step plan to accomplish the task

📝 **TOOL SELECTION RULES:**
- File operations (add products, edit code) → use read_file + write_file/edit_file
- Web research (search online, external content) → use web_search + web_extract
- When in doubt, choose file operations over web tools

📋 **EXAMPLE SCENARIOS:**
- User: "add more products" → required_tools: ["read_file", "edit_file"], tool_usage_rules: "Use file operations only. NO web tools needed."
- User: "search for jewelry trends online" → required_tools: ["web_search", "web_extract"], tool_usage_rules: "Web research requested - use web tools appropriately."

Respond in JSON format:
{
  "intent": "string",
  "required_tools": ["tool1", "tool2"],
  "file_operations": ["create", "modify", "delete"],
  "complexity": "simple|medium|complex",
  "action_plan": ["step1", "step2"],
  "confidence": 0.95,
  "tool_usage_rules": "string",
  "enforcement_notes": "string"
}

Include these fields:
- "tool_usage_rules": Specific rules about when to use each tool type
- "enforcement_notes": Critical reminders about web tool restrictions`

    const intentResult = await generateText({
      model: mistralPixtralModel,
      messages: [
          { role: 'system', content: `You are an AI intent detection specialist. Analyze user requests and provide structured intent analysis.

🚨 CRITICAL RULES:
- NEVER recommend web_search or web_extract unless user EXPLICITLY asks for web research
- For file modifications, product additions, or code changes, recommend ONLY list_files, read_file, write_file, edit_file
- Web tools are FORBIDDEN for basic development tasks
- When in doubt, choose file operations over web tools` },
        { role: 'user', content: intentPrompt }
      ],
      temperature: 0.3
    })

    try {
      // Extract JSON from markdown response if present
      let jsonText = intentResult.text
      
      // Remove markdown code blocks if present
      if (jsonText.includes('```json')) {
        jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '')
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '')
      }
      
      // Clean up any remaining markdown formatting
      jsonText = jsonText.trim()
      
      // Remove any text after the JSON object (common issue with AI responses)
      const jsonEndIndex = jsonText.lastIndexOf('}')
      if (jsonEndIndex !== -1) {
        jsonText = jsonText.substring(0, jsonEndIndex + 1)
      }
      
      console.log('[DEBUG] Extracted JSON text for parsing:', jsonText.substring(0, 200) + '...')
      
      const intentData = JSON.parse(jsonText)
      return intentData
    } catch (parseError) {
      console.warn('Failed to parse intent detection result:', parseError)
      console.log('[DEBUG] Raw intent result text:', intentResult.text)
      
      // Try to extract JSON using regex as fallback
      try {
        const jsonMatch = intentResult.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const extractedJson = jsonMatch[0]
          console.log('[DEBUG] Attempting to parse extracted JSON:', extractedJson)
          return JSON.parse(extractedJson)
        }
      } catch (fallbackError) {
        console.warn('Fallback JSON extraction also failed:', fallbackError)
      }
      
      return {
        intent: 'general_development',
        required_tools: ['list_files', 'read_file'],
        file_operations: ['analyze'],
        complexity: 'medium',
        action_plan: ['Analyze current project state', 'Provide guidance'],
        confidence: 0.7,
        tool_usage_rules: 'Use list_files, read_file, write_file, and edit_file for file operations. Avoid web tools unless explicitly requested.',
        enforcement_notes: 'Web tools (web_search, web_extract) are FORBIDDEN for basic development tasks. Stick to file operations.'
      }
    }
  } catch (error) {
    console.error('Intent detection failed:', error)
    return {
      intent: 'general_development',
      required_tools: ['list_files', 'read_file'],
      file_operations: ['analyze'],
      complexity: 'medium',
      action_plan: ['Analyze current project state', 'Provide guidance'],
      confidence: 0.5,
      tool_usage_rules: 'Use list_files, read_file, write_file, and edit_file for file operations. Avoid web tools unless explicitly requested.',
      enforcement_notes: 'Web tools (web_search, web_extract) are FORBIDDEN for basic development tasks. Stick to file operations.'
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // FORCE TOOLS TO BE ALWAYS ENABLED
    let { messages, projectId, useTools = true, modelId, aiMode = 'agent' } = body
    
    // Ensure we always have a projectId - generate one if missing
    if (!projectId) {
      projectId = body.project?.id || 'default-project-' + Date.now()
      console.log(`[DEBUG] Generated default projectId: ${projectId}`)
    }
    
    // ALWAYS FORCE TOOLS TO BE ENABLED
    useTools = true
    
    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 })
    }
    
    // Get user from Supabase
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Set global user ID for tool access
    global.currentUserId = user.id

    // Validate model access based on subscription plan
    const selectedModelId = modelId || DEFAULT_CHAT_MODEL
    if (selectedModelId !== DEFAULT_CHAT_MODEL) {
      try {
        // Get user's subscription plan
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('subscription_plan')
          .eq('user_id', user.id)
          .single()

        const userPlan = userSettings?.subscription_plan || 'free'

        // Import the model validation function
        const { canUseModel } = await import('@/lib/stripe-config')

        // Check if user can use the selected model
        if (!canUseModel(userPlan, selectedModelId)) {
          console.log(`[MODEL ACCESS] User ${user.id} (plan: ${userPlan}) attempted to use model ${selectedModelId} but only has access to: auto`)

          return new Response(JSON.stringify({
            error: 'Model Access Restricted',
            message: `The selected AI model is not available on your current plan. Upgrade to Pro to access all premium AI models.`,
            upgradeUrl: '/pricing',
            allowedModels: ['auto'],
            plan: userPlan
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      } catch (error) {
        console.error('[MODEL ACCESS] Error validating model access:', error)
        // On error, fallback to auto model
        modelId = DEFAULT_CHAT_MODEL
      }
    }

    // CRITICAL: Sync client-side files to server-side InMemoryStorage
    // This ensures AI tools can access the files that exist in IndexedDB
    const clientFiles = body.files || []
    console.log(`[DEBUG] Syncing ${clientFiles.length} files to server-side storage for AI access`)
    
    if (clientFiles.length > 0) {
    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
        // Clear existing files in InMemoryStorage to ensure clean state
        const existingFiles = await storageManager.getFiles(projectId)
        for (const existingFile of existingFiles) {
          await storageManager.deleteFile(projectId, existingFile.path)
        }
        
        // Sync all client files to server storage
        for (const file of clientFiles) {
          if (file.path && !file.isDirectory) {
            await storageManager.createFile({
              workspaceId: projectId,
              name: file.name,
              path: file.path,
              content: file.content || '',
              fileType: file.type || file.fileType || 'text',
              type: file.type || file.fileType || 'text',
              size: file.size || (file.content || '').length,
              isDirectory: false
            })
            console.log(`[DEBUG] Synced file to server storage: ${file.path}`)
          }
        }
        
        // Verify sync worked
        const syncedFiles = await storageManager.getFiles(projectId)
        console.log(`[DEBUG] File sync complete: ${syncedFiles.length} files now available to AI tools`)
        
      } catch (syncError) {
        console.error('[ERROR] Failed to sync files to server storage:', syncError)
        // Continue anyway - tools may still work for write operations
      }
    }

    // CRITICAL: Sync conversation messages to server-side storage for Context Recall
    // This ensures the AI can access conversation history through the recall_context tool
    console.log(`[DEBUG] Syncing ${messages.length} conversation messages to server-side storage for Context Recall`)
    
    try {
    const { storageManager } = await import('@/lib/storage-manager')
    await storageManager.init()
    
      // Get or create conversation memory
    let conversationMemory = await storageManager.getConversationMemory(projectId, user.id)
    
    if (!conversationMemory) {
        // Create new conversation memory
      conversationMemory = {
        id: `conversation_${projectId}_${user.id}`,
        projectId,
        userId: user.id,
          messages: [],
        summary: 'New conversation session',
        keyPoints: [],
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
        
        await storageManager.createConversationMemory(conversationMemory)
        console.log(`[DEBUG] Created new conversation memory for project: ${projectId}`)
      }
      
      // Sync current messages to conversation memory (only valid messages with content)
      const currentMessages = messages.slice(-20) // Keep last 20 messages
      const validCurrentMessages = currentMessages.filter(msg => 
        msg.content && msg.content.trim().length > 0
      )
      
      const existingMessageIds = new Set(conversationMemory.messages.map(m => m.content.substring(0, 50)))
      
      let newMessagesAdded = 0
      validCurrentMessages.forEach(msg => {
        const messageId = msg.content.substring(0, 50)
        if (!existingMessageIds.has(messageId)) {
          conversationMemory.messages.push({
            role: msg.role,
            content: msg.content,
            timestamp: new Date().toISOString()
          })
          existingMessageIds.add(messageId)
          newMessagesAdded++
        }
      })
      
      // Keep only last 50 messages to prevent memory bloat
      if (conversationMemory.messages.length > 50) {
        conversationMemory.messages = conversationMemory.messages.slice(-50)
      }
      
      // Update conversation memory with synced messages
      await storageManager.updateConversationMemory(
        conversationMemory.id,
        {
          messages: conversationMemory.messages,
          lastActivity: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      )
      
      console.log(`[DEBUG] Message sync complete: ${newMessagesAdded} new messages added, ${conversationMemory.messages.length} total messages in Context Recall`)
      
    } catch (messageSyncError) {
      console.error('[ERROR] Failed to sync messages to server storage:', messageSyncError)
      // Continue anyway - tools may still work
    }

    // ENHANCED: Build comprehensive project context with file contents
    let projectContext = ''
    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
    if (body.project) {
      const project = body.project
      projectContext = `\n\nCurrent project: ${project.name}
Project description: ${project.description || 'No description'}

${await buildEnhancedProjectContext(projectId, storageManager)}`
    } else {
      projectContext = `\n\nCurrent project: Vite React Project
Project description: Vite + React + TypeScript project with Tailwind CSS

${await buildEnhancedProjectContext(projectId, storageManager)}`
      }
    } catch (error) {
      console.warn('Failed to build enhanced project context:', error)
      // Fallback to basic context
      projectContext = `\n\nCurrent project: Vite React Project
Project description: Vite + React + TypeScript project

Use list_files tool to see current files in the project.
Use read_file tool to read specific files when needed.`
    }

        // Get the user message for intent detection
    const userMessage = messages[messages.length - 1]?.content || ''
    
    // Get the conversation memory that was synced earlier
    const { storageManager } = await import('@/lib/storage-manager')
    await storageManager.init()
    let conversationMemory = await storageManager.getConversationMemory(projectId, user.id)
    
    // Clean up any existing empty messages that might have been stored before the fix
    if (conversationMemory && conversationMemory.messages) {
      const originalCount = conversationMemory.messages.length
      conversationMemory.messages = conversationMemory.messages.filter(msg => 
        msg.content && msg.content.trim().length > 0
      )
      
      if (originalCount !== conversationMemory.messages.length) {
        console.log(`[DEBUG] Cleaned up ${originalCount - conversationMemory.messages.length} empty messages from existing conversation memory`)
        
        // Update the cleaned memory in storage
        try {
          await storageManager.updateConversationMemory(
            conversationMemory.id,
            {
              messages: conversationMemory.messages,
              updatedAt: new Date().toISOString()
            }
          )
        } catch (cleanupError) {
          console.warn('[WARNING] Failed to update cleaned conversation memory:', cleanupError)
        }
      }
    }
    
    // Enhanced tool request detection with autonomous planning integration
    let isToolRequest = true // Default to true for better AI performance
    let userIntent = null
    let enhancedIntentData = null
    let shouldUseAutonomousPlanning = false
    
    try {
      // Import the enhanced intent detector
      const { EnhancedIntentDetector } = await import('@/lib/enhanced-intent-detector')
      
      // Get existing files for context
      const existingFiles = clientFiles.map((f: { path?: string }) => f.path).filter(Boolean)
      
      // Use enhanced intent detection with autonomous planning capabilities
      enhancedIntentData = await EnhancedIntentDetector.detectEnhancedIntent(
        userMessage,
        projectContext,
        conversationMemory ? conversationMemory.messages : [],
        existingFiles,
        body.packageJson
      )
      
      // Set legacy userIntent for backward compatibility
      userIntent = {
        intent: enhancedIntentData.intent,
        required_tools: enhancedIntentData.required_tools,
        file_operations: enhancedIntentData.file_operations,
        complexity: enhancedIntentData.complexity,
        action_plan: enhancedIntentData.action_plan,
        confidence: enhancedIntentData.confidence,
        tool_usage_rules: enhancedIntentData.tool_usage_rules,
        enforcement_notes: enhancedIntentData.enforcement_notes
      }
      
      // Determine execution strategy
      shouldUseAutonomousPlanning = enhancedIntentData.requires_autonomous_planning
      isToolRequest = enhancedIntentData.required_tools && enhancedIntentData.required_tools.length > 0
      
      console.log('[DEBUG] Enhanced Intent Detection:', {
        userMessage: userMessage.substring(0, 100) + '...',
        detectedIntent: enhancedIntentData.intent,
        complexity: enhancedIntentData.complexity,
        execution_mode: enhancedIntentData.execution_mode,
        requires_autonomous_planning: shouldUseAutonomousPlanning,
        confidence: enhancedIntentData.confidence,
        planning_confidence: enhancedIntentData.planning_confidence,
        estimated_duration: enhancedIntentData.estimated_duration,
        isToolRequest
      })
      
      // If autonomous planning is required, log the instructions
      if (shouldUseAutonomousPlanning && enhancedIntentData.autonomous_instructions) {
        console.log('[DEBUG] Autonomous Instructions Generated:', {
          project_type: enhancedIntentData.project_type,
          complexity: enhancedIntentData.complexity,
          execution_mode: enhancedIntentData.execution_mode,
          estimated_duration: enhancedIntentData.estimated_duration
        })
      }
      
    } catch (error) {
      console.warn('Enhanced intent detection failed, falling back to basic intent detection:', error)
      
      // Fallback to original intent detection
      try {
        userIntent = await detectUserIntent(userMessage, projectContext, conversationMemory ? conversationMemory.messages : [])
        isToolRequest = userIntent.required_tools && userIntent.required_tools.length > 0
        
        console.log('[DEBUG] Fallback Intent Detection:', {
          detectedIntent: userIntent.intent,
          requiredTools: userIntent.required_tools,
          confidence: userIntent.confidence
        })
      } catch (fallbackError) {
        console.warn('All intent detection failed, using pattern matching:', fallbackError)
        // Final fallback to pattern matching
      isToolRequest = /\b(use tools?|read file|write file|create file|list files?|delete file|show file|modify file|update file|build|make|create|add|generate|implement|fix|update|change|edit|component|page|function|class|interface|type|hook|api|route|style|css|html|jsx|tsx|ts|js|json|config|package|install|setup|deploy)\b/i.test(userMessage) || userMessage.length > 10
      }
    }
    
    // FORCE TOOL REQUEST TO TRUE for most cases
    const forceToolRequest = true
    
    // Get the selected model information for context
    const selectedModel = getModelById(modelId || DEFAULT_CHAT_MODEL)
    const modelContextInfo = selectedModel ? 
      `\n\n🤖 **Current AI Model**: ${selectedModel.name} (${selectedModel.provider})\n${selectedModel.description}` : 
      ''
    
    // Add AI mode context
    const modeContextInfo = aiMode === 'ask' ? 
      `\n\n🔍 **CURRENT MODE: ASK MODE (READ-ONLY)**\n- You can read files and explore the codebase\n- You can answer questions and provide explanations\n- You CANNOT create, modify, or delete files\n- Focus on analysis, explanations, and suggestions` :
      `\n\n🤖 **CURRENT MODE: AGENT MODE (FULL ACCESS)**\n- You have complete file system access\n- You can create, modify, and delete files\n- You can build complete applications\n- Use all available tools as needed`

    // Add autonomous planning context if applicable
    const autonomousPlanningContext = shouldUseAutonomousPlanning && enhancedIntentData?.autonomous_instructions ? 
      `\n\n${enhancedIntentData.autonomous_instructions}` : ''

    // Enhanced system message with conversation memory, intent awareness, and autonomous planning
    const systemMessage = `🎯 **PiPilot** - Elite AI Designer & Developer

You are PiPilot, an elite autonomous AI that creates **breathtaking, award-winning** React applications that make users say "WOW!" Every application must be a visual masterpiece with flawless functionality.

${shouldUseAutonomousPlanning ? `
## 🤖 AUTONOMOUS EXECUTION MODE
- Execute provided plans systematically without approval
- Verify dependencies and create complete implementations  
- Provide progress updates as you work
- Adapt plans based on actual project structure
` : ''}

# 🚨 CRITICAL RULES (NEVER VIOLATE)

## Tool Usage Rules
- **FORBIDDEN**: web_search, web_extract (unless user explicitly asks for web research)
- **FORBIDDEN**: Broad directory exploration/listing when context already provides structure
- **FORBIDDEN**: Reading src/components/ui files (shadcn/ui components are pre-built)
- **FORBIDDEN**: Reading config files (vite.config.js, tsconfig.json, tailwind.config.js)
- **FORBIDDEN**: Recursive file reading or unnecessary file exploration
- **LIMITED**: Maximum 2 read_file operations per request
- **REQUIRED**: read_file → edit_file (preferred) → write_file (fallback)
- **STRATEGIC**: Use tool_results_summary for progress updates, not just analysis
- **EFFICIENT**: Complete functional features before perfection
- **MINIMAL**: Only read files when absolutely necessary for modification or verification
- **ALWAYS**: analyze_dependencies + scan_code_imports after file changes

## 📋 EXECUTION WORKFLOWS

### **CONTEXT-FIRST APPROACH** (Use Provided Project Context)
**Context provides file/directory structure - use it intelligently!**

#### **What's Available in Context:**
- **Project Structure**: Complete src/ (React+Vite) vs app/ (Next.js) directory tree
- **Dependencies**: Full package.json with available libraries
- **Existing Files**: All component and file paths in the project
- **Framework**: React + Vite specifics and configurations
- **File Paths**: Complete import path structure (./ ../ for Vite, @/ for Next.js)

#### **STRICT FILE READING RULES:**
- **FORBIDDEN**: Recursive file reading or exploring directory structures
- **FORBIDDEN**: Reading files in src/components/ui (shadcn/ui components are pre-built)
- **FORBIDDEN**: Reading config files (vite.config.js, tsconfig.json, etc.)
- **CRITICAL**: NEVER read files with >150 lines without specifying line ranges (startLine/endLine)
- **ENFORCED**: Maximum 150 lines per read_file call - system will reject larger requests
- **ALTERNATIVES**: Use semantic_code_navigator for large file understanding, grep_search for patterns
- **LIMITED**: Maximum 2 files per request, only the most critical ones
- **STRATEGIC**: Only read files immediately before modifying them
- **VERIFICATION**: Only read files after modification to verify changes
- **ESSENTIAL ONLY**: Never read files "just to understand" - only when action is needed

#### **FILE PRIORITY HIERARCHY:**
1. **app.tsx** (main application entry - read most frequently for structure)
2. **index.html** (HTML template and structure)
3. **package.json** (dependencies and scripts)
4. **Files you're about to modify** (read immediately before editing)
5. **Files you just modified** (read only to verify changes worked)

#### **FILE READING GUIDELINES:**
- **BEFORE MODIFICATION**: Read the target file to understand current structure
- **AFTER MODIFICATION**: Read to verify your changes were applied correctly
- **NEVER FOR EXPLORATION**: Don't read files just to "see what's there"
- **CONTEXT SUFFICES**: Use provided context instead of reading additional files
- **MINIMAL APPROACH**: If you can implement without reading, do so

#### **Context-Driven Decisions:**
- **Architecture**: Base decisions on provided context structure
- **Dependencies**: Use libraries already in package.json
- **Integration**: Work within existing component patterns
- **Paths**: Use correct import syntax for the detected framework

#### **Efficiency Gains:**
- **Skip Broad Exploration**: Use context instead of listing directories
- **Direct Implementation**: Start building based on context knowledge
- **Targeted Reads**: Read specific files you identify as relevant
- **Context Integration**: Build features that work with existing structure

### **SIMPLE REQUESTS** (Components, Pages, Features)
1. **CONTEXT ANALYSIS**: Use provided context to plan implementation
2. **STRATEGIC READ**: Read maximum 2 files (app.tsx if needed + target file)
3. **BUILD**: Create/edit files with edit_file → write_file
4. **VERIFY**: Read modified file to confirm changes
5. **DELIVER**: Report completion with tool_results_summary

### **COMPLEX REQUESTS** (Full Apps, Ecommerce, Dashboards)
1. **CONTEXT ANALYSIS**: Review provided context to plan complete architecture
2. **MINIMAL READS**: Read only app.tsx + 1 most critical file for structure understanding
3. **PLAN**: Use tool_results_summary to outline complete approach
4. **IMPLEMENT CORE**: Build essential functionality using context knowledge
5. **VERIFY**: Read modified files to confirm core features work
6. **ITERATE**: Add features with minimal additional reads
7. **REPORT PROGRESS**: Use tool_results_summary after each major milestone

### **REFACTORING REQUESTS** (Optimize, Clean, Improve)
1. **CONTEXT ANALYSIS**: Review provided context to identify improvement areas
2. **TARGETED READS**: Read maximum 2 files (app.tsx + 1 file to refactor)
3. **PLAN CHANGES**: Outline changes based on minimal file understanding
4. **IMPLEMENT**: Make systematic changes within context structure
5. **VERIFY**: Read modified files to confirm improvements
6. **REPORT**: Show improvements with tool_results_summary

## Project Structure Awareness
- **ALWAYS CHECK**: Look for src/ directory (React + Vite) vs app/ (Next.js)
- **CORRECT PATHS**: Use relative paths ./ ../ (not @/ unless configured)
- **MAIN ENTRY**: Look for src/main.jsx or src/App.jsx
- **DEPENDENCIES**: Check package.json for available libraries

# 🎨 CREATIVE DESIGN EXCELLENCE

## Design Philosophy
**CREATE MARVELOUS, WONDERFUL WEBSITES** with:
- **Well-Arranged Sections**: Logical flow and intuitive navigation
- **Perfect Structure**: Clean, organized layouts that guide users naturally
- **Beautiful Color Schemes**: Carefully selected palettes that enhance user experience
- **Subtle Animations**: Meaningful motion that adds delight without distraction
- **Extra Creative Twists**: Unique touches that make each site memorable
- **Modern Aesthetics**: Current design trends with timeless appeal
- **Flawless Responsiveness**: Perfect on every device and screen size

## Color & Visual Strategy
- **Contextual Color Selection**: Choose colors based on brand/content purpose
- **Emotional Resonance**: Select colors that evoke the right feelings for your audience
- **Accessibility First**: Ensure excellent contrast and readability
- **Harmonious Palettes**: 3-5 colors maximum, perfectly balanced
- **Brand Consistency**: Colors that reinforce the site's purpose and personality

## Typography & Layout
- **Clear Hierarchy**: Size, weight, and spacing that guide reading naturally
- **Readable Fonts**: Comfortable for extended reading on all devices
- **Strategic Layouts**: Use whitespace effectively, create visual flow
- **Mobile-First**: Design for mobile, enhance for larger screens
- **User-Centered**: Layouts that prioritize user needs and goals

## Interactive Excellence
- **Purposeful Animations**: Motion that serves a functional purpose
- **Smooth Transitions**: Seamless state changes and page flows
- **Engaging Micro-Interactions**: Small touches that delight users
- **Performance Optimized**: 60fps animations that don't impact loading
- **Progressive Enhancement**: Works perfectly without JavaScript

# ⚡ TECHNICAL STACK (MANDATORY)

## Core Technologies
- **React 18+ + Vite** (functional components + hooks only)
- **Tailwind CSS** (utility-first styling)
- **Framer Motion** (all animations REQUIRED)
- **Shadcn/UI** (consistent components)
- **Lucide React** (icons only)
- **TypeScript** (when applicable)

## Project Structure (REACT + VITE)
- **Root Files**: \`index.html\`, \`vite.config.js\`, \`package.json\`
- **Source Directory**: \`src/\` (NOT Next.js app/ structure)
- **Main Entry**: \`src/main.jsx\` or \`src/App.jsx\`
- **Components**: \`src/components/\`
- **UI Components**: \`src/components/ui/\` (shadcn/ui components available!)
- **Assets**: \`src/assets/\`
- **Utils**: \`src/utils/\`
- **Build Output**: \`dist/\` (NOT .next/)

## Vite-Specific Rules
- **Import Paths**: Use relative paths \`./\` \`../\` (NO @/ aliases unless configured)
- **Environment Variables**: \`VITE_\` prefix for client-side variables
- **Hot Reload**: Works automatically, no special configuration needed
- **CSS**: Import in components or use index.css

## 🎨 AVAILABLE SHADCN/UI COMPONENTS (HIGHLY RECOMMENDED)
**Location**: \`src/components/ui/\` - Pre-installed and ready to use!

### **Essential Components Available:**
- **Button**: \`import { Button } from "@/components/ui/button"\`
- **Input**: \`import { Input } from "@/components/ui/input"\`
- **Card**: \`import { Card, CardContent, CardHeader } from "@/components/ui/card"\`
- **Dialog/Modal**: \`import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"\`
- **Form**: \`import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form"\`
- **Select**: \`import { Select, SelectContent, SelectItem } from "@/components/ui/select"\`
- **Table**: \`import { Table, TableBody, TableCell, TableHead } from "@/components/ui/table"\`
- **Badge**: \`import { Badge } from "@/components/ui/badge"\`
- **Alert**: \`import { Alert, AlertDescription } from "@/components/ui/alert"\`
- **Tabs**: \`import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"\`

### **Shadcn/UI Usage Rules:**
- **ALWAYS USE**: Shadcn/ui components instead of building from scratch
- **Import Path**: Use \`@/components/ui/component-name\` (if alias configured) or relative paths
- **Consistency**: Use these components for all UI elements (buttons, forms, cards, etc.)
- **Styling**: Components come pre-styled with Tailwind CSS
- **Variants**: Most components have multiple variants (default, outline, ghost, etc.)

### **Common Shadcn/UI Patterns:**
\`\`\`jsx
// Form with shadcn/ui
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

// Ecommerce Product Card
<Card>
  <CardHeader>
    <img src={product.image} alt={product.name} />
  </CardHeader>
  <CardContent>
    <h3>{product.name}</h3>
    <p>{product.price}</p>
    <Button>Add to Cart</Button>
  </CardContent>
</Card>
\`\`\`

## Component Architecture
- **Atomic Design**: atoms → molecules → organisms → templates → pages
- **Custom Hooks**: Extract complex logic
- **Performance**: React.memo, useMemo, useCallback for optimization
- **Error Boundaries**: Graceful failure handling

# 🌟 MANDATORY FEATURES (EVERY APP)

## Interactive Elements (REQUIRED)
✅ **USE SHADCN/UI COMPONENTS**: Button, Card, Dialog, Form, Input, etc. (MANDATORY!)
✅ **Navigation Excellence**: Intuitive navigation that works perfectly on all devices
✅ **Responsive Layouts**: Adaptive designs that look beautiful everywhere
✅ **Interactive Components**: Engaging elements with purposeful hover states and transitions
✅ **Loading States**: Professional loading indicators and skeleton screens
✅ **User Feedback**: Toast notifications and clear status indicators
✅ **Footer Design**: Well-structured footer with useful links and information

## Animation Strategy
✅ **Purposeful Motion**: Animations that enhance user experience and understanding
✅ **Performance First**: Smooth 60fps animations that don't slow down the site
✅ **Progressive Enhancement**: Beautiful animations that degrade gracefully
✅ **Micro-Interactions**: Small touches that delight and guide users
✅ **Natural Physics**: Spring-based animations that feel organic and responsive

## Responsive Design
✅ Mobile-first approach (320px → 768px → 1024px → 1440px)
✅ Touch-friendly targets (min 44px)
✅ Optimized images (\`srcSet\`, \`sizes\`)
✅ Breakpoint-specific layouts

# 🏗️ CREATIVE COMPONENT DESIGN

## Component Design Philosophy
**CREATE COMPONENTS THAT CAPTIVATE AND DELIGHT:**
- **Contextual Aesthetics**: Choose visual styles that match your brand and content
- **Purposeful Styling**: Every design element should serve a functional purpose
- **Emotional Connection**: Components that create genuine user engagement
- **Creative Flexibility**: Use any modern design techniques that enhance the experience
- **Harmonious Integration**: Components that work beautifully together as a system

## Button Design Strategy
**CREATE BUTTONS THAT INSPIRE ACTION:**
- **Strategic Colors**: Background colors that evoke trust, excitement, or urgency
- **Perfect Sizing**: Appropriate padding and font sizes for different contexts
- **Engaging Hover States**: Smooth transitions that provide clear feedback
- **Accessibility Excellence**: High contrast ratios and clear visual hierarchy
- **Brand Alignment**: Button styles that reinforce your brand personality

## Card & Container Design
**CREATE CONTAINERS THAT ORGANIZE AND BEAUTIFY:**
- **Visual Hierarchy**: Clear content organization with appropriate spacing
- **Engaging Borders**: Subtle borders or shadows that define content areas
- **Background Treatments**: Colors, gradients, or patterns that enhance readability
- **Interactive States**: Hover effects that invite exploration and interaction
- **Content Flow**: Natural reading patterns that guide user attention

## Layout & Section Design
**CREATE SECTIONS THAT FLOW NATURALLY:**
- **Strategic Spacing**: Whitespace that creates breathing room and visual flow
- **Content Grouping**: Related elements clustered for easy comprehension
- **Visual Balance**: Perfect proportion and alignment throughout
- **Progressive Disclosure**: Content revealed at the right pace and context
- **Mobile Harmony**: Designs that adapt beautifully across all screen sizes

## Form & Input Design
**CREATE FORMS THAT USERS LOVE TO FILL:**
- **Intuitive Layouts**: Clear field groupings and logical progression
- **Visual Feedback**: Immediate responses to user interactions
- **Error Prevention**: Smart validation that guides users to success
- **Progressive Enhancement**: Beautiful forms that work perfectly everywhere
- **Trust Building**: Designs that make users feel confident and secure

# 🎯 QUALITY METRICS

## Creative Excellence Checklist
- [ ] Creates genuine amazement and delight
- [ ] Features a unique and memorable visual identity
- [ ] Has purposeful, engaging animations throughout
- [ ] Delivers perfect experiences on every device
- [ ] Provides clear feedback for all user interactions
- [ ] Uses thoughtfully selected, harmonious colors
- [ ] Establishes clear visual hierarchy and flow
- [ ] Includes creative touches that enhance the experience

## Performance Standards
- [ ] < 3s initial load
- [ ] 60fps animations
- [ ] Lazy loading implemented
- [ ] Images optimized
- [ ] No layout shift
- [ ] Smooth scrolling

# 🖼️ IMAGE GENERATION API
**Endpoint**: https://api.a0.dev/assets/image
**Usage**: Pass image description to 
\`text\` parameter + \`seed\` number
**Example**: https://api.a0.dev/assets/image?text=RideShare&aspect=1:1&seed=123
**Implementation**: Use URL directly in \`<img src="">\` - describe what you want, API generates it

# 🎪 CREATIVE INSPIRATION SOURCES

## Design Excellence References
- **Industry Leaders**: Vercel, Linear, Stripe, Notion, Figma, Framer
- **Award Winners**: Awwwards, CSS Design Awards, Webby Awards
- **Design Systems**: Apple Human Interface Guidelines, Google Material Design, Microsoft Fluent
- **Modern Aesthetics**: Current design trends with timeless principles

## Creative Approach Guidelines
- **Context Matters**: Choose inspiration that fits your project's unique needs
- **User-Centered**: Focus on designs that serve real user problems and goals
- **Accessible Excellence**: Beautiful designs that work for everyone
- **Performance First**: Stunning visuals that load fast and perform smoothly
- **Brand Authenticity**: Designs that feel genuine and true to your purpose

# 📋 DEVELOPMENT CONTEXT

**User Intent**: ${userIntent ? `${userIntent.intent} (${userIntent.complexity}, ${Math.round(userIntent.confidence * 100)}% confidence)` : 'Analyzing...'}
**Recommended Tools**: ${userIntent ? userIntent.required_tools.join(', ') : 'File operations'}
**Action Plan**: ${userIntent ? userIntent.action_plan.join(' → ') : 'Read → Analyze → Implement'}

**Project Context**: ${projectContext || 'Modern React + Vite application'}

# 🏗️ COMPLEX REQUEST HANDLING

## Ecommerce & Large Applications
**NEVER GET STUCK IN ANALYSIS LOOPS!**
- **Immediate Action**: For requests like "create ecommerce store", start building functional components immediately
- **Minimum Viable Product**: Deliver working features (products page, cart, checkout) before perfection
- **Progress Updates**: Use tool_results_summary to report actual functionality, not just file operations
- **Strategic Planning**: Plan the full architecture but implement core features first
- **Avoid Paralysis**: If stuck analyzing, default to standard ecommerce patterns

### **Ecommerce Component Patterns (USE SHADCN/UI):**
- **Product Cards**: Use \`Card\` component with \`CardContent\` and \`CardHeader\`
- **Add to Cart**: Use \`Button\` component with shopping cart icon
- **Product Forms**: Use \`Form\`, \`Input\`, \`Select\` components
- **Shopping Cart**: Use \`Dialog\` for cart modal, \`Table\` for cart items
- **Checkout Flow**: Use \`Form\` components with \`Input\` and \`Button\`
- **Product Filters**: Use \`Select\` and \`Badge\` components

## Implementation Strategy
1. **Quick Assessment**: Check src/ structure and existing components
2. **Core First**: Build essential functionality (products, cart, navigation)
3. **Progressive Enhancement**: Add advanced features after basics work
4. **User Feedback**: Show working app early, then refine based on results

## Anti-Patterns to Avoid
- ❌ Endless dependency analysis without implementation
- ❌ Creating components that don't integrate
- ❌ Getting stuck in file read/write loops
- ❌ Reporting "progress" without functional features
- ❌ Over-engineering before basic functionality works

# 🎨 FINAL MANDATE

Create applications that are:
1. **MARVELOUS & WONDERFUL** - Websites that create genuine amazement and delight
2. **WELL-ARRANGED & STRUCTURED** - Perfectly organized sections with intuitive flow
3. **BEAUTIFULLY COLORED** - Carefully selected color schemes that enhance the experience
4. **SUBTLY ANIMATED** - Meaningful motion that adds delight without distraction
5. **CREATIVELY TWISTED** - Unique touches that make each site truly memorable

## Critical Success Factors
- **Creative Freedom**: Use your design expertise to create marvelous websites
- **User-Centered Design**: Every design decision should serve the user's needs and experience
- **Modern Aesthetics**: Stay current with design trends while maintaining timeless appeal
- **Functional Beauty**: Beautiful design that enhances rather than hinders usability
- **Responsive Excellence**: Perfect experience across all devices and screen sizes
- **Performance Balance**: Stunning visuals that load fast and perform smoothly

Remember: You're not just writing code, you're crafting digital experiences that users will remember and love. Every design choice should create wonder and delight while solving real problems.

**Create marvelous websites that users can't stop talking about.**`;

    // Get the AI model based on the selected modelId
    const selectedAIModel = getAIModel(modelId)
    
    // Create AI client
    const model = selectedAIModel
    
    // ALWAYS ENABLE TOOLS - Tools are forced to be enabled on every request
    if (true) { // useTools && projectId - now always true
      // Log tool configuration for debugging
      console.log('[DEBUG] Chat API - Tools FORCE-ENABLED:', {
        projectId,
        modelId: modelId || DEFAULT_CHAT_MODEL,
        modelName: selectedModel?.name || 'Unknown',
        useTools: true,
        originalMessagesCount: messages.length,
        messagesToSendCount: messages.length > 10 ? 10 : messages.length
      })
      
      // Use tools-enabled generation with multi-step support
      const abortController = new AbortController()
      
      // Filter and validate conversation memory messages, ensuring proper typing
      const validMemoryMessages = conversationMemory ? 
        conversationMemory.messages
          .filter(msg => msg.content && msg.content.trim().length > 0)
          .map(msg => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content
          })) : []
      
      // Get the latest user message and merge with project context
      const currentUserMessage = messages[messages.length - 1]
      const mergedUserMessage = {
        role: 'user' as const,
        content: `${currentUserMessage?.content || ''}

## Project Context

${projectContext || 'No project context available'}

---

Please respond to the user's request above, taking into account the project context provided.`
      }
      
      // Prepare messages: system + conversation history + merged user message with context
      const finalMessages = [
        { role: 'system' as const, content: systemMessage },
        // Include conversation history (excluding the latest user message since we're merging it)
        ...validMemoryMessages.slice(0, -1), // Remove last message if it exists to avoid duplication
        // Add the merged user message with project context
        mergedUserMessage
      ]
      
      console.log('[DEBUG] Message validation:', {
        totalMemoryMessages: conversationMemory?.messages?.length || 0,
        validMemoryMessages: validMemoryMessages.length,
        invalidMessages: (conversationMemory?.messages?.length || 0) - validMemoryMessages.length,
        currentUserMessageLength: currentUserMessage?.content?.length || 0,
        projectContextLength: projectContext?.length || 0,
        mergedMessageLength: mergedUserMessage.content.length,
        finalMessagesCount: finalMessages.length,
        sampleValidMessage: validMemoryMessages[0] ? {
          role: validMemoryMessages[0].role,
          contentLength: validMemoryMessages[0].content?.length || 0,
          contentPreview: validMemoryMessages[0].content?.substring(0, 50) + '...'
        } : null
      })
      
      // FORCE TOOL USAGE: The AI MUST use these tools when users mention files
      // Only include web tools if explicitly needed based on intent detection
      console.log('[DEBUG] Creating tool set with intent data:', {
        intent: userIntent?.intent || 'unknown',
        requiredTools: userIntent?.required_tools || [],
        confidence: userIntent?.confidence || 0,
        needsWebTools: userIntent?.required_tools?.includes('web_search') || userIntent?.required_tools?.includes('web_extract')
      })

      const result = await generateText({
        model: model,
        messages: finalMessages,
        temperature: 0.1, // Increased creativity while maintaining tool usage
        stopWhen: stepCountIs(shouldUseAutonomousPlanning ? 12 : 8), // Reduced steps to prevent context explosion and timeouts
        abortSignal: abortController.signal,
        toolChoice: 'required', // Force tool usage first - AI MUST use tools before providing text responses

        onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
          // Log step completion for debugging
          console.log('[DEBUG] Step finished:', {
            hasText: !!text,
            textLength: text?.length || 0,
            textPreview: text?.substring(0, 100) || 'no text',
            toolCallsCount: toolCalls.length,
            toolResultsCount: toolResults.length,
            finishReason,
            usage
          })
        },
        // FORCE TOOL USAGE: The AI MUST use these tools when users mention files
        // Only include web tools if explicitly needed based on intent detection
        tools: createFileOperationTools(projectId, aiMode, conversationMemory ? conversationMemory.messages : [], user.id, userIntent, userMessage)
      })

      // Log the complete result structure for debugging
      console.log('[DEBUG] AI Generation Complete:', {
        hasText: !!result.text,
        textLength: result.text?.length || 0,
        textPreview: result.text?.substring(0, 200) + (result.text && result.text.length > 200 ? '...' : ''),
        hasSteps: !!result.steps,
        stepsCount: result.steps?.length || 0,
        userRequestedTools: isToolRequest,
        toolChoiceUsed: isToolRequest ? 'required' : 'auto',
        stepsSummary: result.steps?.map((step, i) => ({
          step: i + 1,
          hasText: !!step.text,
          toolCallsCount: step.toolCalls?.length || 0,
          toolResultsCount: step.toolResults?.length || 0,
          finishReason: step.finishReason
        })) || []
      })

      // Enhanced tool call processing and error handling
      let hasToolErrors = false
      
      // Check if AI refused to use tools when it should have
      const shouldHaveUsedTools = forceToolRequest // Use forceToolRequest since we're forcing tools always
      const aiRefusedTools = result.text && (
        result.text.includes("I don't have the capability") ||
        result.text.includes("I'm unable to") ||
        result.text.includes("I cannot") ||
        result.text.includes("I can't access") ||
        result.text.includes("I'm here to help, but I need to let you know")
      )
      
      // Force tool usage if AI refused
      if (shouldHaveUsedTools && aiRefusedTools && (!result.steps || result.steps.length === 0)) {
        console.log('[DEBUG] AI refused to use tools, forcing tool call')
        
        try {
          // Import storage manager for forced tool call
          const { storageManager } = await import('@/lib/storage-manager')
          await storageManager.init()
          
          let forcedToolResult
          
          // Determine which tool to force based on user request
          if (/\b(list files?|show files|directory)\b/i.test(userMessage)) {
            const files = await storageManager.getFiles(projectId)
            forcedToolResult = {
              toolCallId: 'forced-list',
              toolName: 'list_files',
              input: {},
              output: {
                success: true,
                message: `✅ Found ${files.length} files in project.`,
                files: files.map(f => ({
                  path: f.path,
                  name: f.name,
                  type: f.type,
                  size: f.size,
                  isDirectory: f.isDirectory,
                  createdAt: f.createdAt
                })),
                count: files.length,
                action: 'list'
              }
            }
          } else if (/\b(read|show|open)\b.*file/i.test(userMessage)) {
            // Try to extract filename from user message
            const fileMatch = userMessage.match(/(?:read|show|open)\s+(?:the\s+)?([\w\.\/\-]+)/i)
            if (fileMatch) {
              const filePath = fileMatch[1]
              try {
                const file = await storageManager.getFile(projectId, filePath)
                if (file) {
                  forcedToolResult = {
                    toolCallId: 'forced-read',
                    toolName: 'read_file',
                    input: { path: filePath },
                    output: {
                      success: true,
                      message: `✅ File ${filePath} read successfully.`,
                      path: filePath,
                      content: file.content || '',
                      name: file.name,
                      type: file.type,
                      size: file.size,
                      action: 'read'
                    }
                  }
                }
              } catch (error) {
                console.error('[DEBUG] Forced read failed:', error)
              }
            }
          }
          
          // If we have a forced result, create a new response
          if (forcedToolResult) {
            // Update the result text to indicate tool was used
            const newResponse = `I have used the ${forcedToolResult.toolName} tool to fulfill your request. ${forcedToolResult.output.message}`
            
            // Create a new result object that includes the forced tool execution
            const modifiedResult = {
              ...result,
              text: newResponse,
              steps: [
                ...(result.steps || []),
                {
                  text: newResponse,
                  toolCalls: [{
                    toolCallId: forcedToolResult.toolCallId,
                    toolName: forcedToolResult.toolName,
                    args: forcedToolResult.input
                  }],
                  toolResults: [{
                    toolCallId: forcedToolResult.toolCallId,
                    toolName: forcedToolResult.toolName,
                    result: forcedToolResult.output
                  }],
                  finishReason: 'tool-calls' as const,
                  content: []
                }
              ]
            }
            
            // Replace the original result
            Object.assign(result, modifiedResult)
            
            console.log('[DEBUG] Successfully forced tool usage:', forcedToolResult.toolName)
          }
        } catch (error) {
          console.error('[DEBUG] Failed to force tool usage:', error)
        }
      }
      
      // Debug: Log the complete result structure
      console.log('[DEBUG] Complete result structure:', {
        hasToolResults: !!result.toolResults,
        toolResultsLength: result.toolResults?.length || 0,
        hasSteps: !!result.steps,
        stepsLength: result.steps?.length || 0
      })
      
      // Extract tool results from steps (AI SDK stores them here)
      const allToolResults: any[] = []
      if (result.steps && result.steps.length > 0) {
        result.steps.forEach(step => {
          if (step.toolResults && step.toolResults.length > 0) {
            allToolResults.push(...step.toolResults)
          }
        })
      }
      
      console.log('[DEBUG] Extracted tool results from steps:', {
        stepsCount: result.steps?.length || 0,
        toolResultsFound: allToolResults.length,
        toolResults: allToolResults
      })
      
      if (allToolResults.length > 0) {
        // Debug: Log raw tool results
        console.log('[DEBUG] Raw tool results:', JSON.stringify(allToolResults, null, 2))
        
        // Check for tool errors in any step
        hasToolErrors = result.steps.some(step => 
          step.content.some(part => part.type === 'tool-error')
        )
        
        if (hasToolErrors) {
          console.error('[ERROR] Tool execution errors detected in steps:')
          result.steps.forEach((step, stepIndex) => {
            const toolErrors = step.content.filter(part => part.type === 'tool-error')
            toolErrors.forEach(toolError => {
              console.error(`Step ${stepIndex + 1} - Tool error:`, {
                toolName: (toolError as any).toolName,
                error: (toolError as any).error,
                input: (toolError as any).input
              })
            })
          })
        }
      }

      // Prepare tool calls for storage if any
      let processedToolCalls = undefined


      if (allToolResults.length > 0) {
        processedToolCalls = allToolResults.map(toolResult => {
          // Extract tool call info from the AI SDK step structure
          // AI SDK uses 'input' for arguments and 'output' for results
          const toolCall = {
            id: toolResult.toolCallId,
            name: toolResult.toolName || 'unknown',
            args: toolResult.input || {},
            result: toolResult.output
          }
          
          console.log('[DEBUG] Processing tool result:', {
            toolName: toolCall.name,
            hasArgs: !!toolCall.args,
            hasResult: !!toolCall.result,
            args: toolCall.args,
            result: toolCall.result
          })
          
          return toolCall
        })
        
        // Debug: Log the processed tool calls
        console.log('[DEBUG] Processed tool calls:', JSON.stringify(processedToolCalls, null, 2))
      }
      
      // Extract the actual AI-generated text from steps if result.text is empty
      let actualAIMessage = result.text || ''
      
      // If result.text is empty, extract text from the steps
      if (!actualAIMessage && result.steps && result.steps.length > 0) {
        // Collect all text content from steps, including both step.text and content with type 'text'
        const stepTexts: string[] = []
        
        result.steps.forEach(step => {
          // Add step.text if it exists
          if (step.text && step.text.trim().length > 0) {
            stepTexts.push(step.text.trim())
          }
          
          // Also check step.content for text content
          if (step.content && Array.isArray(step.content)) {
            step.content.forEach(content => {
              if (content.type === 'text' && content.text && content.text.trim().length > 0) {
                stepTexts.push(content.text.trim())
              }
            })
          }
        })
        
        if (stepTexts.length > 0) {
          actualAIMessage = stepTexts.join('\n\n')
        }
      }
      
    
      
      console.log('[DEBUG] Final AI message extraction:', {
        hasResultText: !!result.text,
        resultTextLength: result.text?.length || 0,
        stepsCount: result.steps?.length || 0,
        extractedTextsCount: result.steps?.reduce((acc, step) => {
          let count = step.text ? 1 : 0
          if (step.content && Array.isArray(step.content)) {
            count += step.content.filter(c => c.type === 'text' && c.text).length
          }
          return acc + count
        }, 0) || 0,
        finalMessageLength: actualAIMessage.length,
        finalMessagePreview: actualAIMessage.substring(0, 300) + (actualAIMessage.length > 300 ? '...' : '')
      })
      
      // Store conversation memory with the new AI response
      try {
        // Import storage manager for conversation memory storage
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        
        // Enhanced: Use AI to process and enhance the memory
        const projectContext = await buildEnhancedProjectContext(projectId, storageManager)
        const enhancedMemory = await processMemoryWithAI(
          conversationMemory,
          userMessage,
          projectContext,
          processedToolCalls
        )
        
        if (conversationMemory) {
          // Update existing memory with AI-enhanced insights
          await storageManager.updateConversationMemory(
            conversationMemory.id,
            {
              messages: [
                ...conversationMemory.messages,
                {
                  role: 'assistant',
                  content: actualAIMessage,
                  timestamp: new Date().toISOString(),
                  toolCalls: processedToolCalls,
                  toolResults: processedToolCalls?.map(tc => tc.result) || []
                }
              ],
              lastActivity: new Date().toISOString(),
              // AI-enhanced memory fields
              aiInsights: enhancedMemory.keyInsights,
              semanticSummary: enhancedMemory.semanticSummary,
              technicalPatterns: enhancedMemory.technicalPatterns,
              architecturalDecisions: enhancedMemory.architecturalDecisions,
              nextLogicalSteps: enhancedMemory.nextLogicalSteps,
              potentialImprovements: enhancedMemory.potentialImprovements,
              relevanceScore: enhancedMemory.relevanceScore,
              contextForFuture: enhancedMemory.contextForFuture
            }
          )
        } else {
          // Create new memory with AI-enhanced insights
          await storageManager.createConversationMemory({
            projectId,
            userId: user.id,
            messages: [
              ...messages.slice(-20).map((msg: any) => ({
                role: msg.role,
                content: msg.content,
                timestamp: new Date().toISOString()
              })),
              {
                role: 'assistant',
                content: actualAIMessage,
                timestamp: new Date().toISOString(),
                toolCalls: processedToolCalls,
                toolResults: processedToolCalls?.map(tc => tc.result) || []
              }
            ],
            summary: enhancedMemory.semanticSummary || `Project: ${projectId} | Messages: ${messages.length + 1}`,
            keyPoints: enhancedMemory.keyInsights || [],
            lastActivity: new Date().toISOString(),
            // AI-enhanced memory fields
            aiInsights: enhancedMemory.keyInsights,
            semanticSummary: enhancedMemory.semanticSummary,
            technicalPatterns: enhancedMemory.technicalPatterns,
            architecturalDecisions: enhancedMemory.architecturalDecisions,
            nextLogicalSteps: enhancedMemory.nextLogicalSteps,
            potentialImprovements: enhancedMemory.potentialImprovements,
            relevanceScore: enhancedMemory.relevanceScore,
            contextForFuture: enhancedMemory.contextForFuture
          })
        }
        
        console.log('[DEBUG] Conversation memory stored successfully:', {
          projectId,
          userId: user.id,
          messageCount: conversationMemory ? conversationMemory.messages.length + 1 : messages.length + 1,
          lastActivity: new Date().toISOString()
        })
      } catch (error) {
        console.warn('[WARNING] Failed to store conversation memory:', error)
        // Continue without failing the request
      }
      
      // CRITICAL: Prevent empty assistant messages from being sent
      // If the AI only used tools without generating text, generate a simple summary
      if (!actualAIMessage.trim() && processedToolCalls && processedToolCalls.length > 0) {
        try {
          console.log('[DEBUG] Generating simple tool summary...')
          
          // Generate a simple summary based on tool calls
          const toolNames = processedToolCalls.map(tc => tc.name).filter(Boolean)
          const uniqueTools = [...new Set(toolNames)]
          
          let summary = `## Task Completed\n\n`
          summary += `I have successfully completed your request using ${uniqueTools.length} tool${uniqueTools.length > 1 ? 's' : ''}.\n\n`
          
          if (uniqueTools.length > 0) {
            summary += `**Tools used:**\n`
            uniqueTools.forEach(tool => {
              summary += `- ${tool}\n`
            })
          }
          
          actualAIMessage = summary
          console.log('[DEBUG] Simple tool summary generated:', actualAIMessage.substring(0, 100) + '...')
        } catch (summaryError) {
          console.error('[ERROR] Failed to generate simple tool summary:', summaryError)
          
          // Fallback to basic summary if generation fails
          actualAIMessage = `## Task Completed\n\nI have successfully completed your request.`
          console.log('[DEBUG] Error fallback tool summary generated:', actualAIMessage.substring(0, 100) + '...')
        }
      }
      
      // Return the response immediately for instant UI update
      const response = new Response(JSON.stringify({
        message: actualAIMessage,
        toolCalls: processedToolCalls,
        success: !hasToolErrors,
        hasToolCalls: processedToolCalls && processedToolCalls.length > 0,
        hasToolErrors,
        stepCount: result.steps.length,
        steps: result.steps.map((step, index) => ({
          stepNumber: index + 1,
          hasText: !!step.text,
          toolCallsCount: step.toolCalls?.length || 0,
          toolResultsCount: step.toolResults?.length || 0,
          finishReason: step.finishReason
        })),
        serverSideExecution: true,  // Flag to indicate server-side execution
        // IMPORTANT: Include file operations for client-side persistence
        fileOperations: (await Promise.all((processedToolCalls || []).map(async (toolCall, index) => {
          console.log(`[DEBUG] Processing toolCall ${index}:`, {
            name: toolCall.name,
            hasResult: !!toolCall.result,
            hasArgs: !!toolCall.args,
            resultKeys: toolCall.result ? Object.keys(toolCall.result) : [],
            argsKeys: toolCall.args ? Object.keys(toolCall.args) : []
          })
          
          let operation: any = {
            type: toolCall.name,
            path: toolCall.result?.path || toolCall.args?.path,
            content: toolCall.args?.content || toolCall.result?.content,
            projectId: projectId,
            success: toolCall.result?.success !== false
          }

          // No post-processing needed for edit_file - it's handled directly in the tool execution
          
          // Debug log each operation
          console.log(`[DEBUG] File operation ${index}:`, operation)
          
          return operation
        }))).filter((op, index) => {
          const shouldInclude = op.success && op.path && (op.type === 'write_file' || op.type === 'edit_file' || op.type === 'delete_file')
          console.log(`[DEBUG] Operation ${index} filter result:`, {
            success: op.success,
            hasPath: !!op.path,
            isValidType: ['write_file', 'edit_file', 'delete_file'].includes(op.type),
            shouldInclude
          })
          return shouldInclude
        }) || []
      }), {
        status: hasToolErrors ? 207 : 200, // 207 Multi-Status for partial success
        headers: { 'Content-Type': 'application/json' },
      })

      // }

      // Save both user message and AI response to database in background (now handled client-side)
      const userMessageForSaving = messages[messages.length - 1]

      return response
      
    } // End of if (true) - tools always enabled
    
  } catch (error: unknown) {
    console.error('Chat API Error:', error)
    
    // Check if it's a Mistral API error
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as { message?: string }).message
      if (errorMessage?.includes('Service unavailable') || errorMessage?.includes('Internal Server Error')) {
        return new Response(JSON.stringify({ 
          error: 'AI service temporarily unavailable. Please try again in a moment.',
          details: 'The Mistral AI service is currently experiencing issues.'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
    
    // Return appropriate error response
    if (error instanceof Error) {
      return new Response(`Error: ${error.message}`, { status: 500 })
    }
    
    return new Response('Internal Server Error', { status: 500 })
  }
}

