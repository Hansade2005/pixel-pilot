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

// Get Together AI model for NLP and intent detection
const getTogetherAIModel = () => {
  try {
    return getModel('meta-llama/Llama-3.3-70B-Instruct-Turbo')
  } catch (error) {
    console.warn('Together AI model not available, falling back to default')
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

// Enhanced project context builder with file contents
async function buildEnhancedProjectContext(projectId: string, storageManager: any) {
  try {
    const files = await storageManager.getFiles(projectId)
    
    let context = ''
    let packageJsonContent = ''
    let srcFilesContent = ''
    let otherFilesPaths = []
    let uiComponentsPaths = []
    
    for (const file of files) {
      const path = file.path
      
      // Always include package.json content
      if (path === 'package.json') {
        packageJsonContent = `\n📦 **package.json** (${path}):\n\`\`\`json\n${file.content}\n\`\`\``
      }
      // Include src folder contents (excluding components/ui)
      else if (path.startsWith('src/') && !path.startsWith('src/components/ui/')) {
        const fileExtension = path.split('.').pop() || 'text'
        srcFilesContent += `\n📁 **${path}** (${fileExtension}):\n\`\`\`${fileExtension}\n${file.content}\n\`\`\``
      }
      // Track components/ui paths (no content)
      else if (path.startsWith('src/components/ui/')) {
        uiComponentsPaths.push(path)
      }
      // Track other files as paths only
      else {
        otherFilesPaths.push(path)
      }
    }
    
    // Build the complete context
    context += packageJsonContent
    context += srcFilesContent
    
    if (uiComponentsPaths.length > 0) {
      context += `\n\n🎨 **UI Components Available** (${uiComponentsPaths.length} components):\n`
      uiComponentsPaths.forEach(path => {
        context += `- ${path}\n`
      })
    }
    
    if (otherFilesPaths.length > 0) {
      context += `\n\n📄 **Other Project Files** (${otherFilesPaths.length} files):\n`
      otherFilesPaths.forEach(path => {
        context += `- ${path}\n`
      })
    }
    
    return context
  } catch (error) {
    console.error('Error building enhanced project context:', error)
    return 'Error building project context'
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
    const togetherAI = getTogetherAIModel()
    
    const enhancedMemory = await generateText({
      model: togetherAI,
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
    const togetherAI = getTogetherAIModel()
    
    const relevantMemories = await generateText({
      model: togetherAI,
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
    const togetherAI = getTogetherAIModel()
    
    const learningInsights = await generateText({
      model: togetherAI,
      messages: [
        { role: 'system', content: 'You are an AI assistant analyzing development patterns and learning from a developer\'s work.' },
        { role: 'user', content: `Analyze this developer's patterns and preferences to learn their development style:

Project ID: ${projectId}
User ID: ${userId}
Conversation History: ${JSON.stringify(conversationMemory?.messages?.slice(-50) || [])}
Project Files: ${JSON.stringify(projectFiles.slice(0, 20))}

Provide a JSON response with learned insights:
{
  "codingStyle": "Description of preferred coding style",
  "componentPatterns": ["pattern1", "pattern2"],
  "stylingPreferences": ["preference1", "preference2"],
  "technicalDecisions": ["decision1", "decision2"],
  "commonApproaches": ["approach1", "approach2"],
  "optimizationAreas": ["area1", "area2"],
  "learningScore": 0.0-1.0,
  "recommendations": ["recommendation1", "recommendation2"]
}

Focus on identifying consistent patterns, preferences, and areas for improvement.` }
      ],
      temperature: 0.3
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
        codingStyle: parsed.codingStyle || 'Standard React/TypeScript patterns',
        componentPatterns: parsed.componentPatterns || ['Functional components'],
        stylingPreferences: parsed.stylingPreferences || ['Tailwind CSS'],
        technicalDecisions: parsed.technicalDecisions || ['Component-based architecture'],
        commonApproaches: parsed.commonApproaches || ['Modular development'],
        optimizationAreas: parsed.optimizationAreas || ['Code organization'],
        learningScore: parsed.learningScore || 0.7,
        recommendations: parsed.recommendations || ['Continue current patterns']
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

// Helper function to create file operation tools based on AI mode
function createFileOperationTools(projectId: string, aiMode: 'ask' | 'agent' = 'agent', conversationMemory: any[] = [], userId?: string, intentData?: any) {
  const tools: any = {}

  // Check if web tools are explicitly needed based on intent detection
  const needsWebTools = intentData?.required_tools?.includes('web_search') || intentData?.required_tools?.includes('web_extract')

  // Debug logging to verify web tools are conditionally included
  console.log('[DEBUG] Web Tools Conditional Logic:', {
    needsWebTools,
    requiredTools: intentData?.required_tools || [],
    intent: intentData?.intent || 'unknown',
    confidence: intentData?.confidence || 0
  })
  
  // Enhanced project analysis tool with smart context
  tools.analyze_project = tool({
    description: 'Analyze the current project structure, dependencies, and provide intelligent insights',
    inputSchema: z.object({
      includeDependencies: z.boolean().optional().describe('Include package.json dependency analysis (default: true)'),
      includeSrcAnalysis: z.boolean().optional().describe('Include src folder structure analysis (default: true)'),
      includeRecommendations: z.boolean().optional().describe('Include improvement recommendations (default: true)')
    }),
    execute: async ({ includeDependencies = true, includeSrcAnalysis = true, includeRecommendations = true }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        // Import storage manager
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        
        const files = await storageManager.getFiles(projectId)
        
        // Enhanced project analysis
        const analysis = {
          projectId,
          totalFiles: files.length,
          structure: {} as any,
          dependencies: {} as any,
          srcAnalysis: {} as any,
          recommendations: [] as string[]
        }
        
        // Analyze file structure
        const fileTypes: Record<string, number> = {}
        const directories: Record<string, number> = {}
        const srcFiles: any[] = []
        let packageJson: any = null
        
        files.forEach(file => {
          try {
            const path = file.path
            const ext = path?.split('.').pop() || 'no-extension'
            
            // Count file types
            fileTypes[ext] = (fileTypes[ext] || 0) + 1
            
            // Count directories
            const dir = path?.includes('/') ? path.split('/').slice(0, -1).join('/') : 'root'
            directories[dir] = (directories[dir] || 0) + 1
            
            // Collect src files (excluding components/ui)
            if (path.startsWith('src/') && !path.startsWith('src/components/ui/')) {
              srcFiles.push({
                path: path,
                type: ext,
                size: file.size,
                name: file.name
              })
            }
            
            // Get package.json
            if (path === 'package.json') {
              try {
                packageJson = JSON.parse(file.content)
              } catch (e) {
                console.warn('Failed to parse package.json:', e)
              }
            }
          } catch (error) {
            console.warn('Skipping file during analysis due to parsing error:', file.path, error)
          }
        })
        
        analysis.structure = { fileTypes, directories }
        
        // Analyze dependencies if requested
        if (includeDependencies && packageJson) {
          analysis.dependencies = {
            name: packageJson.name || 'Unknown',
            version: packageJson.version || 'Unknown',
            scripts: packageJson.scripts || {},
            dependencies: packageJson.dependencies || {},
            devDependencies: packageJson.devDependencies || {},
            hasReact: !!(packageJson.dependencies?.react || packageJson.devDependencies?.react),
            hasTypeScript: !!(packageJson.devDependencies?.typescript),
            hasTailwind: !!(packageJson.devDependencies?.tailwindcss),
            hasVite: !!(packageJson.devDependencies?.vite)
          }
        }
        
        // Analyze src folder if requested
        if (includeSrcAnalysis) {
          const srcStructure = {
            totalSrcFiles: srcFiles.length,
            components: srcFiles.filter(f => f.path.includes('/components/') && !f.path.includes('/components/ui/')),
            pages: srcFiles.filter(f => f.path.includes('/pages/')),
            hooks: srcFiles.filter(f => f.path.includes('/hooks/')),
            utils: srcFiles.filter(f => f.path.includes('/utils/') || f.path.includes('/lib/')),
            styles: srcFiles.filter(f => f.path.includes('.css') || f.path.includes('.scss')),
            types: srcFiles.filter(f => f.path.includes('.ts') && !f.path.includes('.tsx'))
          }
          analysis.srcAnalysis = srcStructure
        }
        
        // Generate recommendations if requested
        if (includeRecommendations) {
          if (!analysis.dependencies.hasReact) {
            analysis.recommendations.push('Add React as a dependency')
          }
          if (!analysis.dependencies.hasTypeScript) {
            analysis.recommendations.push('Add TypeScript for better type safety')
          }
          if (!analysis.dependencies.hasTailwind) {
            analysis.recommendations.push('Add Tailwind CSS for styling')
          }
          if (srcFiles.length === 0) {
            analysis.recommendations.push('Create src folder structure for better organization')
          }
          if (analysis.srcAnalysis?.components?.length === 0) {
            analysis.recommendations.push('Create reusable components in src/components/')
          }
        }
        
        return {
          success: true,
          message: `Project analysis completed successfully`,
          analysis,
          toolCallId
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] analyze_project failed:', error)
        
        return { 
          success: false, 
          error: `Project analysis failed: ${errorMessage}`,
          toolCallId
        }
      }
    }
  })
  
  // Legacy project summary tool for backward compatibility
  tools.get_project_summary = tool({
    description: 'Get a summary of the current project including file count and structure (legacy)',
    inputSchema: z.object({}),
    execute: async ({}, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        // Import storage manager
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        
        const files = await storageManager.getFiles(projectId)
        
        // Group files by type/directory for summary
        const fileTypes: Record<string, number> = {}
        const directories: Record<string, number> = {}
        
        files.forEach(file => {
          try {
            // Count file types
            const ext = file.path?.split('.').pop() || 'no-extension'
            fileTypes[ext] = (fileTypes[ext] || 0) + 1
            
            // Count directories
            const dir = file.path?.includes('/') ? file.path.split('/').slice(0, -1).join('/') : 'root'
            directories[dir] = (directories[dir] || 0) + 1
          } catch (error) {
            // Skip files with parsing issues
            console.warn('Skipping file during summary due to parsing error:', file.path, error)
          }
        })
        
        return {
          success: true,
          message: `Project summary generated successfully`,
          projectId,
          totalFiles: files.length,
          fileTypes,
          directories,
          toolCallId
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] get_project_summary failed:', error)
        
        // Provide fallback response instead of failing
        return { 
          success: true, 
          message: `Project summary generated with some issues: ${errorMessage}`,
          projectId,
          totalFiles: 0,
          fileTypes: {},
          directories: {},
          toolCallId
        }
      }
    }
  })
  
  // Enhanced conversation memory tool with AI-powered context retrieval
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
  
  // Add knowledge base tool
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
  
  // Tool Results Summary - available in both modes for comprehensive reporting
  tools.tool_results_summary = tool({
    description: 'Generate comprehensive summaries for introductions (what will be done) or completions (what was accomplished)',
    inputSchema: z.object({
      phase: z.enum(['introduction', 'completion']).describe('Whether this is an introduction (before work) or completion (after work) summary'),
      session_title: z.string().describe('Brief title describing this development session'),
      changes: z.array(z.object({
        type: z.enum(['created', 'modified', 'deleted', 'analyzed', 'planned']),
        file: z.string().describe('File path that was/will be affected'),
        description: z.string().describe('What was/will be changed or analyzed'),
        impact: z.enum(['high', 'medium', 'low']).describe('Impact level of the change')
      })).describe('List of all changes made/planned during this session'),
      features_implemented: z.array(z.string()).describe('List of features that were implemented or will be implemented'),
      suggestions: z.array(z.object({
        category: z.enum(['performance', 'security', 'ui_ux', 'functionality', 'maintenance', 'accessibility', 'question', 'clarification']),
        title: z.string().describe('Brief title of the suggestion or question'),
        description: z.string().describe('Detailed description of the suggestion, question, or discussion point'),
        priority: z.enum(['high', 'medium', 'low']).describe('Priority level')
      })).describe('Enhancement suggestions, questions, or discussion points'),
      next_steps: z.array(z.string()).describe('Recommended next steps or planned actions'),
      project_status: z.object({
        health: z.enum(['excellent', 'good', 'needs_attention', 'critical']),
        completeness: z.number().min(0).max(100).describe('Project completeness percentage'),
        notes: z.string().describe('Additional notes about project status')
      }).describe('Current project status assessment')
    }),
    execute: async ({ phase, session_title, changes, features_implemented, suggestions, next_steps, project_status }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        // Generate timestamp for the summary
        const timestamp = new Date().toISOString()
        const isIntroduction = phase === 'introduction'
        
        // Create comprehensive markdown summary based on phase
        let summary = `# ${isIntroduction ? 'Development Session Plan' : 'Development Session Summary'}\n\n`
        summary += `**${session_title}**  \n`
        summary += `*${isIntroduction ? 'Planning Phase' : 'Completion Report'} - ${new Date().toLocaleString()}*\n\n`
        
        if (isIntroduction) {
          summary += `## What I Will Do\n\n`
          if (changes && changes.length > 0) {
            changes.forEach(change => {
              const actionName = change.type === 'planned' ? 'Will Plan' : change.type.charAt(0).toUpperCase() + change.type.slice(1)
              summary += `### ${actionName}: \`${change.file}\`\n`
              summary += `- **Impact:** ${change.impact?.toUpperCase() || 'MEDIUM'}\n`
              summary += `- **Description:** ${change.description || 'No description provided'}\n\n`
            })
          } else {
            summary += `- I will assess the current project state and determine the best approach\n\n`
          }
          
          summary += `## Planned Features\n\n`
          if (features_implemented && features_implemented.length > 0) {
            features_implemented.forEach(feature => {
              summary += `- ${feature}\n`
            })
          } else {
            summary += `- No specific features planned yet - will determine based on analysis\n`
          }
        } else {
          summary += `## Changes Completed (${(changes || []).length} total)\n\n`
          if (changes && changes.length > 0) {
            changes.forEach(change => {
              summary += `### ${change.type?.charAt(0).toUpperCase() + (change.type?.slice(1) || '')}: \`${change.file || 'Unknown file'}\`\n`
              summary += `- **Impact:** ${change.impact?.toUpperCase() || 'MEDIUM'}\n`
              summary += `- **Description:** ${change.description || 'No description provided'}\n\n`
            })
          } else {
            summary += `- No specific changes were recorded\n\n`
          }
          
          summary += `## Features Implemented\n\n`
          if (features_implemented && features_implemented.length > 0) {
            features_implemented.forEach(feature => {
              summary += `- ${feature}\n`
            })
          } else {
            summary += `- No new features implemented in this session\n`
          }
        }
        
        summary += `\n## ${isIntroduction ? 'Questions & Clarifications' : 'Follow-up Discussions & Suggestions'}\n\n`
        if (suggestions && suggestions.length > 0) {
          suggestions.forEach(suggestion => {
            const questionType = ['question', 'clarification'].includes(suggestion.category) ? 'Question' : 'Description'
            summary += `### ${suggestion.title || 'Untitled Suggestion'}\n`
            summary += `**Category:** ${(suggestion.category || 'general').replace('_', ' ').toUpperCase()}  \n`
            summary += `**Priority:** ${(suggestion.priority || 'medium').toUpperCase()}  \n`
            summary += `**${questionType}:** ${suggestion.description || 'No description provided'}\n\n`
          })
        } else {
          summary += isIntroduction ? '- No specific questions at this time\n' : '- No specific suggestions at this time - project looks good!\n'
        }
        
        summary += `\n## ${isIntroduction ? 'Planned Next Steps' : 'Recommended Next Steps'}\n\n`
        if (next_steps && next_steps.length > 0) {
          next_steps.forEach((step, index) => {
            summary += `${index + 1}. ${step}\n`
          })
        } else {
          summary += isIntroduction ? '1. Begin analysis and implementation\n' : '1. Continue development as planned\n'
        }
        
        const healthStatus = {
          excellent: 'Excellent',
          good: 'Good',
          needs_attention: 'Needs Attention',
          critical: 'Critical'
        }
        
        const completeness = project_status?.completeness || 0
        const progressBar = '█'.repeat(Math.floor(completeness / 10)) + '░'.repeat(10 - Math.floor(completeness / 10))
        
        summary += `\n## Project Status\n\n`
        summary += `**Overall Health:** ${healthStatus[project_status?.health || 'good']}\n\n`
        summary += `**Completeness:** ${completeness}% ${progressBar}\n\n`
        summary += `**Notes:** ${project_status?.notes || 'No status notes provided'}\n\n`
        summary += `---\n\n`
        summary += `**${isIntroduction ? 'Review plan!' : 'Session complete! Check the summary above for what was accomplished.**'}`
        
        return {
          success: true,
          message: `📊 ${isIntroduction ? 'Development plan' : 'Development session summary'} generated successfully`,
          summary,
          phase,
          timestamp,
          session_title,
          changes_count: (changes || []).length,
          suggestions_count: (suggestions || []).length,
          project_health: project_status?.health || 'good',
          completeness: completeness,
          action: isIntroduction ? 'plan_generated' : 'summary_generated',
          toolCallId
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] tool_results_summary failed:', error)
        
        // Provide fallback response instead of failing
        return {
          success: true,
          message: `📊 Development session summary generated with some issues: ${errorMessage}`,
          summary: `# Development Session Summary\n\n**${session_title || 'Untitled Session'}**\n\n*Summary generated with some issues*\n\n---\n\nSession completed with errors. Please review the work done.`,
          phase: phase || 'completion',
          timestamp: new Date().toISOString(),
          session_title: session_title || 'Untitled Session',
          changes_count: 0,
          suggestions_count: 0,
          project_health: 'needs_attention',
          completeness: 0,
          action: 'summary_generated_with_errors',
          toolCallId
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
  
  // Write and delete tools - only available in Agent mode
  if (aiMode === 'agent') {
    tools.write_file = tool({
      description: 'Create a new file with specified content',
      inputSchema: z.object({
        path: z.string().describe('File path relative to project root'),
        content: z.string().describe('File content to write')
      }),
      execute: async ({ path, content }, { abortSignal, toolCallId }) => {
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
      description: 'Edit an existing file using precise search/replace operations. The AI should output search/replace blocks in the surrounding text using the format: <<<<<<< SEARCH\\n[code to find]\\n=======\\n[replacement code]\\n>>>>>>> REPLACE',
      inputSchema: z.object({
        path: z.string().describe('File path relative to project root to edit')
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

          // Return success with file info - the actual editing will be done in post-processing
          // when we have access to the AI's full response text with search/replace blocks
          return {
            success: true,
            message: `✅ File ${path} ready for editing. Search/replace blocks will be processed from AI response.`,
            path,
            content: existingFile.content,
            action: 'edit_pending',
            toolCallId,
            // Mark this as needing post-processing
            needsPostProcessing: true
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

  // AI-Powered Learning and Pattern Recognition Tool
  tools.learn_patterns = tool({
    description: 'Analyze development patterns and learn from conversation history to provide intelligent insights',
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





// NLP Intent Detection using Together AI
async function detectUserIntent(userMessage: string, projectContext: string, conversationHistory: any[]) {
  try {
    const togetherModel = getTogetherAIModel()
    
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
      model: togetherModel,
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
    
    // Enhanced tool request detection with NLP intent analysis
    let isToolRequest = true // Default to true for better AI performance
    let userIntent = null
    
    try {
      // Use NLP to detect user intent and determine required tools
      userIntent = await detectUserIntent(userMessage, projectContext, conversationMemory ? conversationMemory.messages : [])
      
      // Determine if tools are needed based on intent analysis
      isToolRequest = userIntent.required_tools && userIntent.required_tools.length > 0
      
      console.log('[DEBUG] NLP Intent Detection:', {
        userMessage: userMessage.substring(0, 100) + '...',
        detectedIntent: userIntent.intent,
        requiredTools: userIntent.required_tools,
        complexity: userIntent.complexity,
        confidence: userIntent.confidence,
        isToolRequest
      })
    } catch (error) {
      console.warn('NLP intent detection failed, falling back to pattern matching:', error)
      // Fallback to pattern matching
      isToolRequest = /\b(use tools?|read file|write file|create file|list files?|delete file|show file|modify file|update file|build|make|create|add|generate|implement|fix|update|change|edit|component|page|function|class|interface|type|hook|api|route|style|css|html|jsx|tsx|ts|js|json|config|package|install|setup|deploy)\b/i.test(userMessage) || userMessage.length > 10
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

    // Enhanced system message with conversation memory and intent awareness
    const systemMessage = `🚨 CRITICAL INSTRUCTION: You are Pixel Pilot, an Autonomous AI Agent that plans, creates and modifies React Vite web applications in real-time with a live preview.

# React Website Builder AI - Master System Prompt

## Core Mission
You are a React website builder AI specialized in creating **modern, professional, and visually stunning** React applications that will **WOW users**. Every application you generate must be a masterpiece of modern web design that showcases cutting-edge aesthetics and exceptional user experience.

⚠️ **FIRST RULE - READ THIS BEFORE ANYTHING ELSE:**
- NEVER use web_search or web_extract unless the user EXPLICITLY asks for web research
- For file modifications, product additions, or code changes, use ONLY read_file and write_file
- If user wants to add products to a file, READ the file and WRITE the changes directly
- Web tools are FORBIDDEN for basic development tasks

# Design Philosophy & Visual Standards

### 🎨 **Aesthetic Priorities**
- **Dark Theme First**: Always default to dark themes with sophisticated color palettes
- **Glass Morphism**: Implement stunning glass morphism effects throughout the UI
- **Modern Minimalism**: Clean, spacious layouts with purposeful white space
- **Premium Feel**: Every element should feel polished and professional
- **Visual Hierarchy**: Clear information architecture with proper typography scaling

### 🌟 **Visual Effects Arsenal**
- **Glowing Elements**: Subtle glows, shadows, and luminescent borders
- **Glass Morphism**: \`backdrop-blur-xl\`, semi-transparent backgrounds with borders
- **Gradient Magic**: Modern gradient overlays and backgrounds
- **Smooth Animations**: Framer Motion for all interactions and transitions
- **Interactive States**: Rich hover effects and micro-interactions

# Technical Stack Requirements

### 📚 **Required Technologies**
1. **React 18+** with functional components and hooks
2. **Tailwind CSS** - Leverage the full power of utility classes
3. **Shadcn/UI** - Use for consistent, accessible components
4. **Framer Motion** - Mandatory for all animations and transitions
5. **Lucide React** - Primary icon library
6. **Vite** - Build tool optimization

### 🎯 **Component Architecture**
- **Modular Design**: Break down into reusable, well-structured components
- **Custom Hooks**: Create utility hooks for common functionality
- **State Management**: Use React hooks efficiently (useState, useEffect, useContext)
- **Performance**: Optimize with React.memo, useMemo, useCallback when needed

# Layout & Structure Standards

### 🏗️ **Page Organization**
1. **Sticky Glass Header**
   - Glass morphism backdrop blur effect
   - Mobile-responsive navigation with hamburger menu
   - Smooth scroll-based transparency changes
   - Logo + navigation links + CTA buttons

2. **Hero Sections**
   - Compelling headlines with gradient text effects
   - Animated elements and floating components
   - Background gradients or subtle patterns
   - Call-to-action buttons with glow effects

3. **Content Sections**
   - Well-organized with proper spacing and alignment
   - Mix of text, media, and interactive elements
   - Cards with glass morphism effects
   - Proper content hierarchy

4. **Multi-Column Footers**
   - Comprehensive link organization
   - Social media icons with hover effects
   - Newsletter signup forms
   - Company information and legal links

### 📱 **Responsive Design**
- **Mobile-First Approach**: Design for mobile, enhance for desktop
- **Breakpoint Strategy**: sm, md, lg, xl, 2xl breakpoints
- **Touch-Friendly**: Proper touch targets and gestures
- **Performance**: Optimize images and animations for mobile

# Interactive Components Mandate

### 🔧 **Required Interactive Elements** (Every App Must Include)

1. **Navigation Components**
   - Sticky headers with glass morphism
   - Mobile hamburger menus with smooth animations
   - Breadcrumb navigation for complex sites

2. **Data Display**
   - **Grids**: Responsive card grids with hover effects
   - **Sliders**: Image/content sliders with smooth transitions
   - **Accordions**: Expandable content sections
   - **Carousels**: Touch-friendly, animated carousels

3. **Form Elements**
   - Floating label inputs with validation
   - Custom styled buttons with hover states
   - Toggle switches and checkboxes
   - Progress indicators

4. **Feedback & Interaction**
   - Loading states and skeletons
   - Toast notifications
   - Modal dialogs with backdrop blur
   - Tooltips and popovers

### 🎪 **Animation Requirements**
- **Page Transitions**: Smooth enter/exit animations
- **Scroll Animations**: Elements animate on scroll into view
- **Hover Effects**: Rich micro-interactions on all interactive elements
- **Loading States**: Engaging skeleton screens and spinners
- **Gesture Support**: Swipe, drag, and touch interactions

# UI Component Standards

### 💎 **Button Specifications**
\`\`\`jsx
// Example button styles to follow
<Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 backdrop-blur-sm border border-white/10">
  Get Started
</Button>
\`\`\`

### 🃏 **Card Specifications**
\`\`\`jsx
// Glass morphism card template
<Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl hover:bg-white/10 transition-all duration-300 hover:scale-105">
  {/* Card content */}
</Card>
\`\`\`

### 🎨 **Color Palette Guidelines**
- **Dark Base**: \`bg-gray-900\`, \`bg-slate-900\`, \`bg-zinc-900\`
- **Glass Effects**: \`bg-white/5\`, \`bg-white/10\`, \`backdrop-blur-xl\`
- **Accents**: Modern blues, purples, teals, and gradients
- **Text**: \`text-white\`, \`text-gray-100\`, \`text-gray-300\`
- **Borders**: \`border-white/10\`, \`border-white/20\`

# Content & Typography Standards

### ✍️ **Typography Hierarchy**
- **Headlines**: Large, bold, often with gradient effects
- **Subheadings**: Clear hierarchy with proper spacing
- **Body Text**: Readable contrast and line height
- **Captions**: Subtle, smaller text with reduced opacity

### 📸 **Media Integration**
- **High-Quality Placeholders**: Use premium placeholder images
- **Lazy Loading**: Implement proper image loading strategies
- **Responsive Images**: Proper srcSet and sizes attributes
- **Alt Text**: Meaningful descriptions for accessibility

# Performance & Accessibility

### ⚡ **Performance Requirements**
- **Lazy Loading**: Components and images
- **Code Splitting**: Route-based splitting
- **Bundle Optimization**: Tree shaking and minimization
- **Animation Performance**: Use transform and opacity for animations

### ♿ **Accessibility Standards**
- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: WCAG AA compliance
- **Focus States**: Visible focus indicators

# Code Quality Standards

### 🧹 **Code Organization**
- **Component Structure**: Logical file organization
- **Naming Conventions**: Descriptive, consistent naming
- **Comments**: Document complex logic
- **Error Handling**: Proper error boundaries and fallbacks

### 🔧 **Development Practices**
- **TypeScript Ready**: Write code that's easily convertible to TypeScript
- **ESLint Compatible**: Follow modern JavaScript standards
- **Reusable Components**: Build for modularity and reuse
- **Performance Monitoring**: Include performance considerations

# Implementation Checklist

### ✅ **Every Generated App Must Include:**
- [ ] Dark theme as default
- [ ] Glass morphism effects on key components
- [ ] Sticky header with backdrop blur
- [ ] Mobile-responsive navigation
- [ ] At least 3 interactive components (grids, sliders, accordions, carousels)
- [ ] Framer Motion animations throughout
- [ ] Lucide React icons
- [ ] Shadcn/UI components
- [ ] Multi-column footer
- [ ] Proper responsive design
- [ ] Loading states and transitions
- [ ] Hover effects on all interactive elements

### 🎯 **Quality Metrics**
- **Visual Impact**: Does it make users say "wow"?
- **Interactivity**: Are there enough engaging elements?
- **Performance**: Does it load and animate smoothly?
- **Responsiveness**: Does it work perfectly on all screen sizes?
- **Professional Feel**: Does it look like a premium application?

# Output Requirements

When generating React applications:

1. **Always use React functional components with hooks**
2. **Include comprehensive Tailwind classes for styling**
3. **Implement Framer Motion for all animations**
4. **Use Shadcn/UI components where appropriate**
5. **Include Lucide React icons**
6. **Ensure mobile responsiveness**
7. **Add glass morphism effects**
8. **Create interactive components**
9. **Include proper loading states**
10. **Add hover effects and micro-interactions**

# Inspiration Sources
Draw inspiration from:
- Premium SaaS landing pages
- Modern design systems (Vercel, Linear, Stripe)
- Award-winning websites (Awwwards, CSS Design Awards)
- Mobile-first design principles
- Glass morphism and neumorphism trends

Remember: Every application you generate should be **production-ready**, **visually stunning**, and **user-friendly**. Aim to create experiences that users will remember and want to interact with.

# Core Guidelines

🚨 **CRITICAL RULE - READ FIRST:**
- NEVER use web_search or web_extract unless user EXPLICITLY asks for web research
- For file modifications, use ONLY read_file and write_file
- If user wants to add products, READ the file and WRITE changes directly
- Web tools are FORBIDDEN for basic development tasks

- Make efficient changes following best practices
- Keep things modern and elegant
- Reply in the same language as the user
- Should proactively create or edit files related to the user's request to accomplish the task given to you by the user
- Maintain context awareness and avoid repeating previous actions
- Use conversation memory to understand what has been done before

# Conversation Memory

You have access to the last 10 conversation pairs (20 messages) to maintain context and avoid repetition. Use this memory to:
- Remember what files you've already created or modified
- Understand the user's development progress
- Avoid suggesting solutions that have already been implemented
- Build upon previous work rather than starting over

# User Intent Analysis

Based on NLP analysis, the user's intent is: ${userIntent ? `${userIntent.intent} (${userIntent.complexity} complexity, ${Math.round(userIntent.confidence * 100)}% confidence)` : 'Analyzing...'}

Recommended tools for this request: ${userIntent ? userIntent.required_tools.join(', ') : 'Standard development tools'}
Action plan: ${userIntent ? userIntent.action_plan.join(' → ') : 'Analyze and implement'}

🚨 **INTENT DETECTION ENFORCEMENT RULES:**
${userIntent?.tool_usage_rules ? `**Tool Usage Rules:** ${userIntent.tool_usage_rules}` : 'Tool usage rules: Use file operations for development tasks'}
${userIntent?.enforcement_notes ? `**Enforcement Notes:** ${userIntent.enforcement_notes}` : 'Enforcement: Web tools forbidden for basic development tasks'}

⚠️ **REMINDER:** These rules from intent detection are MANDATORY and must be followed!

# Available Tools

## Core Development Tools (Use these first)
1. **list_files** - List all files in the project
2. **read_file** - Read the contents of a file
3. **write_file** - Create or update a file (Agent mode only)
4. **edit_file** - Edit existing files using AI-powered search/replace operations (Agent mode only)
5. **delete_file** - Delete a file (Agent mode only)

## Context & Knowledge Tools (Use when needed)
6. **search_knowledge** - Get the content of a specific knowledge item by ID
7. **get_project_summary** - Get project structure information
8. **recall_context** - Recall previous conversation context with AI enhancement
9. **learn_patterns** - Analyze development patterns and learn from history

## Web Tools (ONLY use when user explicitly requests web research)
10. **web_search** - Search the web for current information and context (ONLY when user asks for external research)
11. **web_extract** - Extract content from web pages (ONLY when user asks for external content)

# File Editing with Search/Replace Blocks

When using the **edit_file** tool, you must provide search/replace blocks in this exact format:

\`\`\`
<<<<<<< SEARCH
[exact code to find - must match perfectly including whitespace]
=======
[replacement code]
>>>>>>> REPLACE
\`\`\`

## Critical Rules for Search/Replace:
1. **Exact Match Required**: Search blocks must match existing code EXACTLY (including whitespace and indentation)
2. **Multiple Changes**: Use separate search/replace blocks for each change
3. **Preserve Structure**: Maintain proper imports, component structure, and TypeScript types
4. **Context Awareness**: Include enough surrounding code for unique identification

## Examples:

**Change text content:**
\`\`\`
<<<<<<< SEARCH
    <h1>Old Title</h1>
=======
    <h1>New Title</h1>
>>>>>>> REPLACE
\`\`\`

**Add code after existing line:**
\`\`\`
<<<<<<< SEARCH
  </div>
=======
    <button onClick={handleClick}>New Button</button>
  </div>
>>>>>>> REPLACE
\`\`\`

**Delete code:**
\`\`\`
<<<<<<< SEARCH
  <p>This paragraph will be removed.</p>
=======
>>>>>>> REPLACE
\`\`\`

**Modify imports:**
\`\`\`
<<<<<<< SEARCH
import { useState } from 'react'
=======
import { useState, useEffect } from 'react'
>>>>>>> REPLACE
\`\`\`

# Workflow

🚨 **CRITICAL FIRST STEP - READ THIS:**
- NEVER call web_search or web_extract unless user EXPLICITLY says "search web" or "research online"
- For adding products, editing files, or code changes, use ONLY read_file, write_file, and edit_file
- Web tools are FORBIDDEN for basic development tasks

1. **ALWAYS start with file operations** - Use read_file to understand current state
2. **Check conversation memory** to avoid repeating previous work
3. **Use web tools ONLY when explicitly requested** - Don't search the web unless the user asks for external research
4. **Focus on direct file modification** - Use write_file for new files, edit_file for precise modifications to existing files
5. **Follow the project's tech stack** (Vite + React + TypeScript + Tailwind CSS)
6. **Use shadcn/ui components** when appropriate
7. **Implement user requests efficiently** - Don't over-engineer or add unnecessary complexity

## 🎯 **File Modification Strategy - CRITICAL**

**FOR EXISTING FILES - ALWAYS FOLLOW THIS ORDER:**

1. **FIRST CHOICE: Use edit_file tool** for modifying existing files
   - Preferred method for precise changes to existing content
   - Use search/replace blocks to make targeted modifications
   - More efficient than rewriting entire files

2. **FALLBACK: Use write_file tool** if edit_file fails
   - If search/replace blocks cannot find the exact text to modify
   - If the file structure has changed significantly
   - If edit_file returns an error or fails to apply changes
   - Rewrite the entire file with all changes included

**EXAMPLE WORKFLOW:**
User: "Change the title in App.tsx"
1. Try: edit_file tool with search/replace blocks
2. If that fails: read_file tool then write_file tool with complete updated content

**WHEN TO USE EACH TOOL:**
- edit_file tool: Small changes, bug fixes, adding/removing specific code sections
- write_file tool: New files, major refactoring, or when edit_file fails
- read_file tool: Always read first to understand current state

⚠️ **IMPORTANT**: If edit_file fails for any reason (search text not found, parsing errors, etc.), immediately try write_file as a backup approach.

# Knowledge Base IDs

Here are the available knowledge base IDs you can use with the search_knowledge tool:
- design-system - Design System Guidelines
- hero-section - Hero Section Requirements
- header-navigation - Header/Navigation Requirements
- technical-execution - Technical Execution Standards
- tools-usage - Tool Usage Guidelines
- quality-standards - Quality Standards
- caching-mechanisms - Caching Mechanisms for Performance Optimization
- web-search - Web Search and Content Extraction Tools
- image-generation - Image Generation API Guidelines

# Image Generation API

🖼️ **IMAGE GENERATION ENDPOINT:** https://api.a0.dev/assets/image

**USAGE:**
- **text parameter**: Describe the image you want to generate (image prompt)
- **seed parameter**: A number for consistent image generation (optional, defaults to random)
- **aspect parameter**: Image aspect ratio (optional, e.g., "1:1", "16:9", "4:3")

**EXAMPLE URLS:**
- Basic: https://api.a0.dev/assets/image?text=RideShare&aspect=1:1&seed=123
- Product: https://api.a0.dev/assets/image?text=Modern%20laptop%20computer&aspect=16:9&seed=456
- Hero: https://api.a0.dev/assets/image?text=Business%20team%20collaboration&aspect=16:9&seed=789

**IMPLEMENTATION:**
1. Use the URL directly in img src attributes
2. Encode spaces as %20 in the text parameter
3. Use descriptive prompts for better image quality
4. Keep seed consistent for similar images
5. Choose appropriate aspect ratios for different use cases

**BEST PRACTICES:**
✅ Use descriptive, specific prompts for better results
✅ Encode special characters properly in URLs
✅ Use consistent seeds for related images
✅ Choose aspect ratios that match your design needs
✅ Test different prompts to find the best results
✅ Use this API for all image needs in the application

# Important Notes

- Do not modify vite.config.js or vite.config.ts files
- Always use TypeScript with proper typing
- Use functional components with React hooks
- Apply Tailwind CSS for styling
- Create multi-page apps with React Router
- Maintain conversation context and avoid repetition
- Be creative but follow user instructions strictly
- Use the image generation API for all image needs in the application

# CRITICAL: Tool Usage Rules - VIOLATION WILL RESULT IN FAILURE

🚫 **ABSOLUTELY FORBIDDEN:**
- DO NOT call web_search unless user explicitly says "search the web" or "research online"
- DO NOT call web_extract unless user explicitly says "extract from website" or "scrape content"
- DO NOT use web tools for basic file operations like adding products, editing code, or modifying files

✅ **MANDATORY APPROACH:**
- ALWAYS use read_file first to understand current file state
- ALWAYS use edit_file FIRST for modifying existing files (preferred method)
- ALWAYS use write_file as FALLBACK if edit_file fails or for new files
- ALWAYS prioritize local file operations over external web research
- If edit_file fails (search text not found, errors), immediately use write_file to rewrite the entire file
- If user wants to add products, edit the file directly - NO web search needed!

🔒 **ENFORCEMENT:**
- These rules are NON-NEGOTIABLE
- Violating these rules means you're not following user instructions
- Stick to file operations only unless explicitly told to research online

📝 **EXAMPLE SCENARIOS:**
User: "add more products to our store up to 15 products"
CORRECT: read_file → edit_file (try first) → write_file (if edit_file fails)
WRONG: web_search → web_extract → web_extract (unnecessary web research)

User: "change the title of the homepage"
CORRECT: read_file → edit_file (try first) → write_file (fallback if needed)
WRONG: read_file → write_file (without trying edit_file first)

User: "fix the button styling in Header.tsx"
WORKFLOW: 
1. read_file to see current content
2. edit_file with search/replace blocks (preferred)
3. If edit_file fails: write_file with complete updated file

Project context: ${projectContext || 'Vite + React + TypeScript project - Multi-page with React Router'}`;

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
      
      // Limit messages to first 10 when there are more than 10 messages
      const messagesToSend = messages.length > 10 ? messages.slice(0, 10) : messages;
      
      // Filter and validate conversation memory messages
      const validMemoryMessages = conversationMemory ? 
        conversationMemory.messages.filter(msg => msg.content && msg.content.trim().length > 0) : []
      
      console.log('[DEBUG] Message validation:', {
        totalMemoryMessages: conversationMemory?.messages?.length || 0,
        validMemoryMessages: validMemoryMessages.length,
        invalidMessages: (conversationMemory?.messages?.length || 0) - validMemoryMessages.length,
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
        messages: [
          { role: 'system', content: systemMessage },
          // Use filtered valid messages to prevent AI model errors
          ...validMemoryMessages
        ],
        temperature: 0.1, // Increased creativity while maintaining tool usage
        stopWhen: stepCountIs(5), // Allow up to 5 steps for complex multi-tool operations
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
        tools: createFileOperationTools(projectId, aiMode, conversationMemory ? conversationMemory.messages : [], user.id, userIntent)
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
      // If the AI only used tools without generating text, use Together AI to generate a meaningful summary
      if (!actualAIMessage.trim() && processedToolCalls && processedToolCalls.length > 0) {
        try {
          console.log('[DEBUG] Generating AI-powered tool summary using Together AI...')
          
          const togetherModel = getTogetherAIModel()
          const toolSummaryPrompt = `You are an AI assistant that creates beautifully formatted, professional summaries of development tool actions.

Based on the user's request, generate a simple, clean summary:

User's original request: "${userMessage}"

Create a beautifully formatted summary using Markdown with the following structure:

1. **Main Heading**: Use ## for a descriptive title about what was accomplished
2. **Summary Paragraph**: Write a concise overview (2-3 sentences) using personal pronouns like "I" to make it conversational
3. **Key Highlights**: Use bullet points for important results and outcomes

Formatting Requirements:
- Use ## for main headings
- Use **bold** for emphasis on key terms
- Use *italic* for subtle emphasis
- Use personal pronouns like "I", "I've", "I have" to make the summary more conversational and personal
- Avoid using tables - keep summaries clean and simple
- Use bullet points (• or -) for lists
- Use emojis for visual appeal and status indication
- Keep text size small and readable (similar to user messages)
- Use consistent spacing and alignment
- Make it visually appealing and professional

Emoji Guide:
- ✅ Success/Completed
- 📁 Files/Folders
- 📖 Reading/Content
- ✏️ Writing/Editing
- 🗑️ Deletion
- 🔍 Search/Investigation
- 🧠 Memory/Context
- 📊 Analysis/Patterns
- 🔧 Tools/Operations
- ⚡ Fast/Quick
- 🎯 Target/Goal

Example structure:
## Task Completed

I have successfully completed your request.

Make it look professional, organized, and easy to read using clean markdown formatting.`

          const summaryResult = await generateText({
            model: togetherModel,
            messages: [
              { role: 'system', content: 'You are a helpful AI assistant that summarizes development tool actions in natural language.' },
              { role: 'user', content: toolSummaryPrompt }
            ],
            temperature: 0.7
          })

          if (summaryResult.text && summaryResult.text.trim()) {
            actualAIMessage = summaryResult.text.trim()
            console.log('[DEBUG] AI-generated tool summary:', actualAIMessage.substring(0, 100) + '...')
          } else {
            // Fallback to basic summary if AI generation fails
            actualAIMessage = `## Task Completed

I have successfully completed your request.`
            console.log('[DEBUG] Fallback tool summary generated:', actualAIMessage.substring(0, 100) + '...')
          }
        } catch (summaryError) {
          console.error('[ERROR] Failed to generate AI tool summary:', summaryError)
          
          // Fallback to basic summary if AI generation fails
          actualAIMessage = `## Task Completed

I have successfully completed your request.`
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

          // Post-process edit_file operations
          if (toolCall.name === 'edit_file' && toolCall.result?.needsPostProcessing) {
            try {
              console.log('[DEBUG] Post-processing edit_file operation...')
              
              // Find the AI response text that contains search/replace blocks
              // We need to look through the result steps to find the text with search/replace blocks
              let aiResponseText = '';
              
              // Look through all steps to find text containing search/replace blocks
              for (const step of result.steps || []) {
                if (step.text && step.text.includes('<<<<<<< SEARCH')) {
                  aiResponseText = step.text;
                  break;
                }
              }
              
              if (!aiResponseText) {
                console.log('[DEBUG] No search/replace blocks found in AI response')
                operation.success = false;
                operation.error = 'No search/replace blocks found in AI response';
              } else {
                // Parse search/replace blocks from AI response
                const editBlocks = parseSearchReplaceBlocks(aiResponseText);
                console.log(`[DEBUG] Found ${editBlocks.length} search/replace blocks`);
                
                if (editBlocks.length === 0) {
                  operation.success = false;
                  operation.error = 'No valid search/replace blocks found';
                } else {
                  // Apply edits to the file content
                  const originalContent = toolCall.result.content;
                  const { modifiedContent, appliedEdits, failedEdits } = applySearchReplaceEdits(originalContent, editBlocks);
                  
                  console.log(`[DEBUG] Edit results: ${appliedEdits.length} applied, ${failedEdits.length} failed`);
                  
                  if (appliedEdits.length > 0) {
                    // Update the file in storage
                    const { storageManager } = await import('@/lib/storage-manager');
                    await storageManager.init();
                    await storageManager.updateFile(projectId, operation.path, { 
                      content: modifiedContent,
                      updatedAt: new Date().toISOString()
                    });
                    
                    // Update operation with final content
                    operation.content = modifiedContent;
                    operation.success = true;
                    operation.appliedEdits = appliedEdits;
                    operation.failedEdits = failedEdits;
                    console.log(`[DEBUG] Successfully applied ${appliedEdits.length} edits to ${operation.path}`);
                  } else {
                    operation.success = false;
                    operation.error = `No changes could be applied. ${failedEdits.length} edits failed.`;
                    operation.failedEdits = failedEdits;
                  }
                }
              }
            } catch (error) {
              console.error('[ERROR] Post-processing edit_file failed:', error);
              operation.success = false;
              operation.error = `Post-processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
          }
          
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

      // Save both user message and AI response to database in background (now handled client-side)
      const latestUserMessage = messages[messages.length - 1]

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
