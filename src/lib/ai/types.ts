export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  reasoning?: string;
  timestamp: number;
  tokensPerSec?: number;
  totalTokens?: number;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  status: 'pending' | 'success' | 'error';
}

export interface ChatRequest {
  messages: { role: Role; content: string }[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
  tools?: string[];
}

export interface ChatResponse {
  content: string;
  reasoning?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    tokensPerSecond?: number;
    latencyMs?: number;
  };
}

export type ProviderMode = 'webgpu' | 'api' | 'auto';

export interface AICapabilities {
  mode: ProviderMode;
  supportsStreaming: boolean;
  supportsTools: boolean;
  contextWindow: number;
  deviceName?: string;
  isHardwareAccelerated: boolean;
}

export interface AIStatus {
  state: 'idle' | 'loading' | 'generating' | 'error';
  progress?: number;
  statusText?: string;
  error?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  initialize(onProgress?: (progress: number, stage: string) => void): Promise<void>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  stream(
    request: ChatRequest,
    onToken: (token: string, reasoning?: string) => void,
    signal?: AbortSignal
  ): Promise<ChatResponse>;
  stop(): void;
  getCapabilities(): AICapabilities;
  getStatus(): AIStatus;
}
