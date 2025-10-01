export const DEFAULT_CHAT_MODEL: string = 'grok-code-fast-1';

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

  // Codestral Models (OpenAI Compatible)
  {
    id: 'codestral-latest',
    name: 'Codestral',
    description: 'Mistral Codestral model via OpenAI-compatible endpoint',
    provider: 'codestral',
  },

  // a0.dev Models
  {
    id: 'a0-dev-llm',
    name: 'Pixela',
    description: 'Pixela model from PiPilot with strong code generation capabilities',
    provider: 'a0dev',
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

  // xAI Grok Models
  {
    id: 'grok-code-fast-1',
    name: 'Grok Code Fast 1',
    description: 'xAI Grok specialized code generation model with fast inference',
    provider: 'xai',
  },
  {
    id: 'grok-3',
    name: 'Grok 3',
    description: 'xAI Grok 3 model with advanced reasoning and live search capabilities',
    provider: 'xai',
  },
  {
    id: 'grok-3-mini',
    name: 'Grok 3 Mini',
    description: 'Compact xAI Grok 3 model with reasoning effort control',
    provider: 'xai',
  },
  {
    id: 'grok-3-mini-fast',
    name: 'Grok 3 Mini Fast',
    description: 'Fast version of xAI Grok 3 Mini with reasoning capabilities',
    provider: 'xai',
  },
  {
    id: 'grok-3-latest',
    name: 'Grok 3 Latest',
    description: 'Latest xAI Grok 3 model with live search and comprehensive capabilities',
    provider: 'xai',
  },
  {
    id: 'grok-4-fast-non-reasoning',
    name: 'Grok 4 Fast',
    description: 'xAI Grok 4 fast model optimized for speed without reasoning',
    provider: 'xai',
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