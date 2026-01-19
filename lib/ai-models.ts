export const DEFAULT_CHAT_MODEL: string = 'xai/grok-code-fast-1';

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
    description: 'Automatically uses the best model for code generation',
    provider: 'vercel-gateway',
  },

  // Codestral Models (Custom)
  {
    id: 'codestral-latest',
    name: 'Codestral',
    description: 'Mistral Codestral model via custom endpoint',
    provider: 'codestral',
  },

  // a0.dev Models (Custom)
  {
    id: 'a0-dev-llm',
    name: 'Pixela',
    description: 'Pixela model from PiPilot with strong code generation capabilities',
    provider: 'a0dev',
  },

  // Mistral Models
  {
    id: 'pixtral-12b-2409',
    name: 'Pixtral 12B',
    description: 'Mistral multimodal model with vision capabilities',
    provider: 'mistral',
  },

  // Vercel AI Gateway Models
  {
    id: 'mistral/devstral-2',
    name: 'Mistral Devstral 2',
    description: 'Mistral Devstral 2 via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'xai/grok-code-fast-1',
    name: 'xAI Grok Code Fast 1',
    description: 'xAI Grok Code Fast 1 via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'moonshotai/kimi-k2-thinking',
    name: 'MoonshotAI Kimi K2 Thinking',
    description: 'MoonshotAI Kimi K2 Thinking via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Google Gemini 2.5 Flash',
    description: 'Google Gemini 2.5 Flash via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Google Gemini 2.5 Pro',
    description: 'Google Gemini 2.5 Pro via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'xai/glm-4.7',
    name: 'xAI GLM 4.7',
    description: 'xAI GLM 4.7 via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'minimax/minimax-m2.1',
    name: 'MiniMax M2.1',
    description: 'MiniMax M2.1 via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'alibaba/qwen3-max',
    name: 'Alibaba Qwen3 Max',
    description: 'Alibaba Qwen3 Max via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    name: 'Anthropic Claude Haiku 4.5',
    description: 'Anthropic Claude Haiku 4.5 via Vercel AI Gateway with Reasoning',
    provider: 'anthropic',
  },
  {
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Anthropic Claude Sonnet 4.5',
    description: 'Anthropic Claude Sonnet 4.5 via Vercel AI Gateway with Reasoning',
    provider: 'anthropic',
  },
  {
    id: 'anthropic/claude-opus-4.5',
    name: 'Anthropic Claude Opus 4.5',
    description: 'Anthropic Claude Opus 4.5 via Vercel AI Gateway with Reasoning',
    provider: 'anthropic',
  },
  {
    id: 'openai/gpt-5.1-thinking',
    name: 'OpenAI GPT-5.1 Thinking',
    description: 'OpenAI GPT-5.1 Thinking via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'openai/gpt-5.2-codex',
    name: 'OpenAI GPT-5.2 Codex',
    description: 'OpenAI GPT-5.2 Codex via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'openai/o3',
    name: 'OpenAI O3',
    description: 'OpenAI O3 via Vercel AI Gateway',
    provider: 'vercel-gateway',
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