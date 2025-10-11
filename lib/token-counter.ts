// Token counting utility for accurate context window monitoring
// Supports multiple AI providers with different tokenization schemes

// import { Tiktoken, get_encoding } from 'tiktoken'

// Initialize tiktoken asynchronously
// let tiktokenReady = false
// let getEncoding: (name: string) => Tiktoken

// Initialize tiktoken
// const initializeTiktoken = async () => {
//   if (!tiktokenReady) {
//     try {
//       // Dynamic import to ensure proper loading
//       const tiktokenModule = await import('tiktoken')
//       getEncoding = tiktokenModule.get_encoding as (name: string) => Tiktoken
//       tiktokenReady = true
//       console.log('[TOKEN_COUNTER] Tiktoken initialized successfully')
//     } catch (error) {
//       console.error('[TOKEN_COUNTER] Failed to initialize tiktoken:', error)
//       throw error
//     }
//   }
// }

// Cache for token counts to improve performance
const tokenCache = new Map<string, number>()
const MAX_CACHE_SIZE = 1000

// Tokenization schemes for different AI providers
export const TOKENIZATION_SCHEMES = {
  // OpenAI models
  'gpt-4': 'cl100k_base',
  'gpt-4-turbo': 'cl100k_base',
  'gpt-4o': 'o200k_base',
  'gpt-4o-mini': 'o200k_base',
  'gpt-3.5-turbo': 'cl100k_base',
  // New OpenAI models (30k context as specified)
  'gpt-5-mini': 'o200k_base',
  'gpt-4.1-nano': 'o200k_base',
  'gpt-5-nano': 'o200k_base',
  'gpt-4.1-mini': 'o200k_base',
  'gpt-4o-2024-08-06': 'o200k_base',
  'gpt-4o-2024-11-20': 'o200k_base',
  'chatgpt-4o-latest': 'o200k_base',

  // Anthropic models
  'claude-3-opus': 'cl100k_base',
  'claude-3-sonnet': 'cl100k_base',
  'claude-3-haiku': 'cl100k_base',
  'claude-3-5-sonnet': 'cl100k_base',

  // Google models
  'gemini-pro': 'cl100k_base', // Approximation
  'gemini-pro-vision': 'cl100k_base',

  // Mistral models
  'mistral-large': 'cl100k_base',
  'mistral-medium': 'cl100k_base',
  'mistral-small': 'cl100k_base',
  'mistral-small-2503': 'cl100k_base',
  'mistral-small-2506': 'cl100k_base',
  'open-mistral-nemo': 'cl100k_base',
  'pixtral-12b': 'cl100k_base',
  'pixtral-12b-2409': 'cl100k_base',
  // Codestral models (256k context as specified)
  'codestral-22b': 'cl100k_base',
  'codestral-mamba': 'cl100k_base',
  'codestral-latest': 'cl100k_base',
  'open-codestral-mamba': 'cl100k_base',

  // a0.dev models
  'a0-dev-llm': 'cl100k_base',

  // Groq models
  'llama2-70b': 'cl100k_base',
  'mixtral-8x7b': 'cl100k_base',
  // xAI Grok models (256k context as specified)
  'grok-beta': 'cl100k_base',
  'grok-vision-beta': 'cl100k_base',
  'grok-2-1212': 'cl100k_base',
  'grok-2-vision-1212': 'cl100k_base',
  'grok-code-fast-1': 'cl100k_base',
  'grok-3': 'cl100k_base',
  'grok-3-mini': 'cl100k_base',
  'grok-3-mini-fast': 'cl100k_base',
  'grok-3-latest': 'cl100k_base',
  'grok-4-fast-non-reasoning': 'cl100k_base',

  // Cohere models (256k context as specified)
  'command': 'cl100k_base',
  'command-light': 'cl100k_base',
  'command-nightly': 'cl100k_base',
  'command-r': 'cl100k_base',
  'command-r-plus': 'cl100k_base',
  'command-a-reasoning-08-2025': 'cl100k_base',

  // Together AI models
  'togetherai-llama-2-70b': 'cl100k_base',
  'togetherai-mixtral-8x7b': 'cl100k_base',
  'togetherai-codellama-34b': 'cl100k_base',

  // Default fallback
  'default': 'cl100k_base',
  'auto': 'cl100k_base'
} as const

// Context window limits for different models (approximate)
export const CONTEXT_WINDOW_LIMITS = {
  // OpenAI models
  'gpt-4': 8192,
  'gpt-4-turbo': 128000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-3.5-turbo': 16385,
  // New OpenAI models (30k context as specified)
  'gpt-5-mini': 30000,
  'gpt-4.1-nano': 30000,
  'gpt-5-nano': 30000,
  'gpt-4.1-mini': 30000,
  'gpt-4o-2024-08-06': 30000,
  'gpt-4o-2024-11-20': 30000,
  'chatgpt-4o-latest': 30000,

  // Anthropic models
  'claude-3-opus': 200000,
  'claude-3-sonnet': 200000,
  'claude-3-haiku': 200000,
  'claude-3-5-sonnet': 200000,

  // Google models
  'gemini-pro': 32768,
  'gemini-pro-vision': 16384,

  // Mistral models
  'mistral-large': 32768,
  'mistral-medium': 32768,
  'mistral-small': 32768,
  'mistral-small-2503': 32768,
  'mistral-small-2506': 32768,
  'open-mistral-nemo': 131072,
  'pixtral-12b': 4096,
  'pixtral-12b-2409': 131072,
  // Codestral models (256k context as specified)
  'codestral-22b': 256000,
  'codestral-mamba': 256000,
  'codestral-latest': 256000,
  'open-codestral-mamba': 256000,

  // a0.dev models
  'a0-dev-llm': 32768,

  // Groq models
  'llama2-70b': 4096,
  'mixtral-8x7b': 32768,
  // xAI Grok models (256k context as specified)
  'grok-beta': 256000,
  'grok-vision-beta': 256000,
  'grok-2-1212': 256000,
  'grok-2-vision-1212': 256000,
  'grok-code-fast-1': 256000,
  'grok-3': 256000,
  'grok-3-mini': 256000,
  'grok-3-mini-fast': 256000,
  'grok-3-latest': 256000,
  'grok-4-fast-non-reasoning': 256000,

  // Cohere models (256k context as specified)
  'command': 256000,
  'command-light': 256000,
  'command-nightly': 256000,
  'command-r': 256000,
  'command-r-plus': 256000,
  'command-a-reasoning-08-2025': 256000,

  // Together AI models
  'togetherai-llama-2-70b': 4096,
  'togetherai-mixtral-8x7b': 32768,
  'togetherai-codellama-34b': 16384,

  // Default fallback
  'default': 4096,
  'auto': 128000
} as const

// Encoder cache to avoid recreating encoders
// const encoderCache = new Map<string, Tiktoken>()

/**
 * Get the appropriate tokenizer for a model
 */
// async function getTokenizer(modelId: string): Promise<Tiktoken> {
//   // Ensure tiktoken is initialized
//   await initializeTiktoken()

//   const scheme = TOKENIZATION_SCHEMES[modelId as keyof typeof TOKENIZATION_SCHEMES] || TOKENIZATION_SCHEMES.default

//   if (!encoderCache.has(scheme)) {
//     try {
//       encoderCache.set(scheme, getEncoding(scheme))
//     } catch (error) {
//       console.warn(`Failed to load tokenizer for scheme ${scheme}, falling back to cl100k_base:`, error)
//       encoderCache.set(scheme, getEncoding('cl100k_base'))
//     }
//   }

//   return encoderCache.get(scheme)!
// }

/**
 * Count tokens in a text string for a specific model
 */
export async function countTokens(text: string, modelId: string = 'default'): Promise<number> {
  if (!text || typeof text !== 'string') {
    return 0
  }

  // Check cache first
  const cacheKey = `${modelId}:${text.length}:${text.slice(0, 50)}`
  if (tokenCache.has(cacheKey)) {
    return tokenCache.get(cacheKey)!
  }

  try {
    // Temporarily disabled tiktoken - using fallback estimation
    // const tokenizer = await getTokenizer(modelId)
    // const tokens = tokenizer.encode(text)
    // const count = tokens.length

    // Use fallback estimation for now
    const count = Math.ceil(text.length / 4)

    // Cache the result (with size limit)
    if (tokenCache.size < MAX_CACHE_SIZE) {
      tokenCache.set(cacheKey, count)
    }

    return count
  } catch (error) {
    console.error(`Error counting tokens for model ${modelId}:`, error)
    // Fallback to rough character-based estimation
    return Math.ceil(text.length / 4)
  }
}

/**
 * Count tokens in a conversation message array
 */
export async function countConversationTokens(
  messages: Array<{ role: string; content: string }>,
  modelId: string = 'default'
): Promise<number> {
  let totalTokens = 0

  for (const message of messages) {
    // Add tokens for role and content
    const roleTokens = await countTokens(`role: ${message.role}`, modelId)
    const contentTokens = await countTokens(message.content, modelId)
    totalTokens += roleTokens + contentTokens

    // Add formatting tokens (approximate)
    totalTokens += 4 // Rough estimate for message formatting
  }

  // Add conversation-level formatting tokens
  totalTokens += 2 // System message formatting

  return totalTokens
}

/**
 * Get context window limit for a model
 */
export function getContextWindowLimit(modelId: string): number {
  return CONTEXT_WINDOW_LIMITS[modelId as keyof typeof CONTEXT_WINDOW_LIMITS] || CONTEXT_WINDOW_LIMITS.default
}

/**
 * Check if conversation is approaching context window limit
 */
export function getContextWindowStatus(
  currentTokens: number,
  modelId: string
): {
  usagePercent: number
  isNearLimit: boolean
  isAtLimit: boolean
  remainingTokens: number
  recommendedAction: 'none' | 'warn' | 'summarize' | 'truncate'
} {
  const limit = getContextWindowLimit(modelId)
  const usagePercent = (currentTokens / limit) * 100
  const remainingTokens = Math.max(0, limit - currentTokens)

  let recommendedAction: 'none' | 'warn' | 'summarize' | 'truncate' = 'none'

  if (usagePercent >= 95) {
    recommendedAction = 'truncate'
  } else if (usagePercent >= 80) {
    recommendedAction = 'summarize'
  } else if (usagePercent >= 70) {
    recommendedAction = 'warn'
  }

  return {
    usagePercent: Math.round(usagePercent * 100) / 100,
    isNearLimit: usagePercent >= 70,
    isAtLimit: usagePercent >= 95,
    remainingTokens,
    recommendedAction
  }
}

/**
 * Estimate tokens for a conversation with system prompt and history
 */
export async function estimateConversationTokens(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  modelId: string = 'default'
): Promise<{
  systemTokens: number
  messageTokens: number
  totalTokens: number
  status: ReturnType<typeof getContextWindowStatus>
}> {
  const systemTokens = await countTokens(systemPrompt, modelId)
  const messageTokens = await countConversationTokens(messages, modelId)
  const totalTokens = systemTokens + messageTokens

  const status = getContextWindowStatus(totalTokens, modelId)

  return {
    systemTokens,
    messageTokens,
    totalTokens,
    status
  }
}

/**
 * Clear token cache (useful for memory management)
 */
export function clearTokenCache(): void {
  tokenCache.clear()
}

/**
 * Get supported models for token counting
 */
export function getSupportedModels(): string[] {
  return Object.keys(TOKENIZATION_SCHEMES)
}

/**
 * Validate token count accuracy (for testing)
 */
export async function validateTokenCount(
  text: string,
  expectedRange: { min: number; max: number },
  modelId: string = 'default'
): Promise<boolean> {
  const actual = await countTokens(text, modelId)
  return actual >= expectedRange.min && actual <= expectedRange.max
}