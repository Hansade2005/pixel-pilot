// Type definitions for PiPilot AI SDK

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionOptions {
  model: string;
  messages: Message[];
  temperature?: number;
  tools?: Tool[];
  stream?: boolean;
  onChunk?: (chunk: any) => void;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ToolResult {
  tool_call_id: string;
  output?: any;
  error?: string;
}

export interface PiPilotAIOptions {
  apiUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

declare class PiPilotAI {
  constructor(options?: PiPilotAIOptions);

  createChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;

  chat(messages: string | Message[], options?: Partial<ChatCompletionOptions>): Promise<ChatCompletionResponse>;

  think(messages: string | Message[], options?: Partial<ChatCompletionOptions>): Promise<ChatCompletionResponse>;

  code(messages: string | Message[], options?: Partial<ChatCompletionOptions>): Promise<ChatCompletionResponse>;

  vision(messages: string | Message[], options?: Partial<ChatCompletionOptions>): Promise<ChatCompletionResponse>;

  executeTools(toolCalls: ToolCall[], toolHandlers: Record<string, (args: any) => Promise<any>>): Promise<ToolResult[]>;
}

export default PiPilotAI;