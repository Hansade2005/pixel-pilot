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

  // PiPilot Local Models (OpenAI Compatible)
  {
    id: 'pipilot-1-chat',
    name: 'PiPilot Chat 1.0',
    description: 'General-purpose AI assistant for everyday tasks',
    provider: 'pipilot',
  },
  {
    id: 'pipilot-1-code',
    name: 'PiPilot Code 1.0',
    description: 'Agentic coding model with autonomous reasoning (SWE-bench)',
    provider: 'pipilot',
  },
  {
    id: 'pipilot-1-vision',
    name: 'PiPilot Vision 1.0',
    description: 'Multimodal AI assistant for image analysis',
    provider: 'pipilot',
  },
  {
    id: 'pipilot-1-thinking',
    name: 'PiPilot Thinking 1.0',
    description: 'Super-intelligent reasoning model with Chain of Thought',
    provider: 'pipilot',
  },

  // PiPilot Premium Models (Claude via OpenRouter - Premium Only)
  {
    id: 'pipilot-pro',
    name: 'PiPilot Pro',
    description: 'Advanced PiPilot model with superior reasoning and coding capabilities',
    provider: 'pipilot',
  },
  {
    id: 'pipilot-ultra',
    name: 'PiPilot Ultra',
    description: 'PiPilot\'s most powerful model for complex tasks and deep analysis',
    provider: 'pipilot',
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

  // MiniMax Models (OpenAI Compatible)
  {
    id: 'minimax-m2',
    name: 'MiniMax M2',
    description: 'MiniMax M2 model via OpenAI-compatible endpoint',
    provider: 'minimax',
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
  {
    id: 'grok-4-1-fast-non-reasoning',
    name: 'Grok 4.1 Fast Non-Reasoning',
    description: 'xAI Grok 4.1 fast model optimized for speed without reasoning capabilities',
    provider: 'xai',
  },
  {
    id: 'grok-4-1-fast-reasoning',
    name: 'Grok 4.1 Fast Reasoning',
    description: 'xAI Grok 4.1 fast model with advanced reasoning capabilities',
    provider: 'xai',
  },

  // OpenRouter Claude Models
  {
    id: 'claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    description: 'Anthropic Claude Sonnet 4.5 via OpenRouter - best coding model with extended thinking',
    provider: 'openrouter',
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    description: 'Anthropic Claude Sonnet 4 via OpenRouter - advanced coding and reasoning model',
    provider: 'openrouter',
  },
  {
    id: 'claude-haiku-4.5',
    name: 'Claude Haiku 4.5',
    description: 'Anthropic Claude Haiku 4.5 via OpenRouter - fast and efficient coding model with reasoning',
    provider: 'openrouter',
  },

  // OpenRouter Advanced Models (with reasoning support)
  {
    id: 'deepseek-v3.2-exp',
    name: 'DeepSeek V3.2 Experimental',
    description: 'DeepSeek V3.2 Experimental via OpenRouter - advanced reasoning and coding capabilities',
    provider: 'openrouter',
  },
  {
    id: 'grok-4-fast-reasoning',
    name: 'Grok 4 Fast Reasoning',
    description: 'xAI Grok 4 Fast via OpenRouter - fast reasoning and analysis',
    provider: 'openrouter',
  },
  {
    id: 'qwen3-30b-thinking',
    name: 'Qwen3 30B Thinking',
    description: 'Qwen3 30B A3B Thinking via OpenRouter - advanced reasoning model',
    provider: 'openrouter',
  },
  {
    id: 'qwen3-coder',
    name: 'Qwen3 Coder',
    description: 'Qwen3 Coder via OpenRouter - specialized coding and development model',
    provider: 'openrouter',
  },
  {
    id: 'deepseek-chat-v3.1-free',
    name: 'DeepSeek Chat V3.1 Free',
    description: 'DeepSeek Chat V3.1 Free tier via OpenRouter - cost-effective AI assistance',
    provider: 'openrouter',
  },
  {
    id: 'qwen3-coder-free',
    name: 'Qwen3 Coder Free',
    description: 'Qwen3 Coder Free tier via OpenRouter - cost-effective coding assistance',
    provider: 'openrouter',
  },
  {
    id: 'qwen3-coder-30b-instruct',
    name: 'Qwen3 Coder 30B Instruct',
    description: 'Qwen3 Coder 30B A3B Instruct via OpenRouter - powerful coding model with instructions',
    provider: 'openrouter',
  },
  {
    id: 'deepseek-r1t2-chimera-free',
    name: 'DeepSeek R1T2 Chimera Free',
    description: 'DeepSeek R1T2 Chimera Free via OpenRouter - hybrid reasoning model',
    provider: 'openrouter',
  },
  {
    id: 'qwen3-next-80b-thinking',
    name: 'Qwen3 Next 80B Thinking',
    description: 'Qwen3 Next 80B A3B Thinking via OpenRouter - powerful reasoning capabilities',
    provider: 'openrouter',
  },
  {
    id: 'phi-4-multimodal',
    name: 'Phi-4 Multimodal',
    description: 'Microsoft Phi-4 Multimodal Instruct via OpenRouter - multimodal AI with reasoning',
    provider: 'openrouter',
  },
  {
    id: 'deepseek-chat-v3.1',
    name: 'DeepSeek Chat V3.1',
    description: 'DeepSeek Chat V3.1 via OpenRouter - advanced conversational AI',
    provider: 'openrouter',
  },
  {
    id: 'kwaipilot/kat-coder-pro:free',
    name: 'Kwaipilot Kat Coder Pro Free',
    description: 'Kwaipilot Kat Coder Pro Free via OpenRouter - cost-effective coding assistance',
    provider: 'openrouter',
  },
  {
    id: 'qwen/qwen-turbo',
    name: 'Qwen Turbo',
    description: 'Qwen Turbo via OpenRouter - fast and efficient AI model',
    provider: 'openrouter',
  },

  // ZenMux models
  {
    id: 'kuaishou/kat-coder-pro-v1',
    name: 'Kuaishou Kat Coder Pro V1',
    description: 'Kuaishou Kat Coder Pro V1 via ZenMux - advanced coding and development model',
    provider: 'zenmux',
  },

  // Volcengine models (via ZenMux)
  {
    id: 'volcengine/doubao-seed-code',
    name: 'Volcengine Doubao Seed Code',
    description: 'Volcengine Doubao Seed Code via ZenMux - specialized coding model for development tasks',
    provider: 'zenmux',
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