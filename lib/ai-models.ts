export const DEFAULT_CHAT_MODEL: string = 'auto';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider: string;
}

export const chatModels: Array<ChatModel> = [
  // Auto/Default Option
  {
    id: 'auto',
    name: 'Auto',
    description: 'Automatically uses the best model for code generation ',
    provider: 'auto',
  },
  
  // a0.dev Models
  {
    id: 'a0-dev-llm',
    name: 'Pixela',
    description: 'Pixela model from PiPilot with strong code generation capabilities',
    provider: 'a0dev',
  },
  
  // Mistral Models (Default - Code-focused)
  {
    id: 'open-codestral-mamba',
    name: 'Codestral Mamba',
    description: 'Mistral specialized code generation model',
    provider: 'mistral',
  },
  {
    id: 'pixtral-12b-2409',
    name: 'Pixtral 12B',
    description: 'Mistral multimodal model with vision capabilities',
    provider: 'mistral',
  },
  {
    id: 'mistral-small-2503',
    name: 'Mistral Small 2503',
    description: 'Compact and efficient Mistral model (2503 version)',
    provider: 'mistral',
  },
  {
    id: 'mistral-small-2506',
    name: 'Mistral Small 2506',
    description: 'Latest compact and efficient Mistral model (2506 version)',
    provider: 'mistral',
  },
  {
    id: 'open-mistral-nemo',
    name: 'Mistral Nemo',
    description: 'Versatile open Mistral model',
    provider: 'mistral',
  },

  // OpenAI Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Latest GPT-4 Omni model with enhanced capabilities',
    provider: 'openai',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Faster, cost-effective GPT-4 variant',
    provider: 'openai',
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Advanced GPT-4 with 128k context',
    provider: 'openai',
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast and efficient GPT-3.5 model',
    provider: 'openai',
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    description: 'Next-generation GPT-5 compact model',
    provider: 'openai',
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    description: 'Ultra-lightweight GPT-4.1 model',
    provider: 'openai',
  },
  {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    description: 'Ultra-compact GPT-5 model for efficiency',
    provider: 'openai',
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    description: 'Compact GPT-4.1 model with improved performance',
    provider: 'openai',
  },

  // Google Gemini Models
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Latest Google multimodal model',
    provider: 'google',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Advanced Google model with large context',
    provider: 'google',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Fast Google model for quick responses',
    provider: 'google',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    description: 'Ultra-lightweight Gemini 2.5 Flash model',
    provider: 'google',
  },

  // Groq Models (Fast inference)
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    description: 'Large versatile Llama model via Groq',
    provider: 'groq',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    description: 'Fast Llama model for quick responses',
    provider: 'groq',
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    description: 'Excellent mixture of experts model for code',
    provider: 'groq',
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B',
    description: 'Google Gemma instruction-tuned model',
    provider: 'groq',
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 Distill',
    description: 'DeepSeek R1 distilled reasoning model via Groq',
    provider: 'groq',
  },
  {
    id: 'moonshotai/kimi-k2-instruct',
    name: 'Kimi K2 Instruct',
    description: 'Moonshot AI Kimi K2 instruction model',
    provider: 'groq',
  },
  {
    id: 'qwen/qwen3-32b',
    name: 'Qwen 3 32B',
    description: 'Alibaba Qwen 3 32B model via Groq',
    provider: 'groq',
  },
  {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Llama 4 Scout 17B',
    description: 'Meta Llama 4 Scout 17B extended instruct model',
    provider: 'groq',
  },

  // Together.ai Models (Open source)
  {
    id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    name: 'Llama 3.3 70B Turbo',
    description: 'Meta Llama model via Together.ai',
    provider: 'togetherai',
  },
  {
    id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    name: 'Llama 3.1 8B Turbo',
    description: 'Fast Meta Llama model via Together.ai',
    provider: 'togetherai',
  },
  {
    id: 'codellama/CodeLlama-34b-Instruct-hf',
    name: 'Code Llama 34B',
    description: 'Specialized code generation model',
    provider: 'togetherai',
  },
  {
    id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    name: 'Llama 3.3 70B Free',
    description: 'Free tier Meta Llama 3.3 70B model via Together.ai',
    provider: 'togetherai',
  },
  {
    id: 'meta-llama/Llama-Vision-Free',
    name: 'Llama Vision Free',
    description: 'Free tier Llama Vision model with multimodal capabilities',
    provider: 'togetherai',
  },
  {
    id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free',
    name: 'DeepSeek R1 Free',
    description: 'Free tier DeepSeek R1 distilled reasoning model',
    provider: 'togetherai',
  },

  // Cohere Models (v2 compatible - confirmed working)
  {
    id: 'command-r-plus',
    name: 'Command R+ (04-2024)',
    description: 'Cohere advanced model with tool support (v2 compatible)',
    provider: 'cohere',
  },
  {
    id: 'command-r',
    name: 'Command R (08-2024)',
    description: 'Cohere balanced model for general tasks (v2 compatible)',
    provider: 'cohere',
  },
  {
    id: 'command',
    name: 'Command Nightly',
    description: 'Cohere latest nightly build model (v2 compatible)',
    provider: 'cohere',
  },
  {
    id: 'command-a-reasoning-08-2025',
    name: 'Command A (03-2025)',
    description: 'Cohere advanced reasoning model (v2 compatible)',
    provider: 'cohere',
  },
];

export function getModelById(modelId: string): ChatModel | undefined {
  return chatModels.find(model => model.id === modelId);
}

export function getModelsByProvider(provider: string): ChatModel[] {
  return chatModels.filter(model => model.provider === provider);
}

export function getAllProviders(): string[] {
  return Array.from(new Set(chatModels.map(model => model.provider)));
}