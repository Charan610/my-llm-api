import { AIProvider, AICapabilities, AIStatus, ChatRequest, ChatResponse } from './types';

export interface APIProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  defaultHeaders?: Record<string, string>;
}

export class APIProvider implements AIProvider {
  public id = 'api';
  public name = 'MiniCPM API Server';
  private config: APIProviderConfig;
  private status: AIStatus = { state: 'idle' };
  private abortController: AbortController | null = null;

  constructor(config: APIProviderConfig) {
    this.config = config;
  }

  public updateConfig(config: Partial<APIProviderConfig>) {
    this.config = { ...this.config, ...config };
  }

  public async initialize(): Promise<void> {
    this.status = { state: 'loading', statusText: 'Connecting to API server...' };
    try {
      // Test connectivity by pinging models or root
      const url = `${this.config.baseUrl.replace(/\/+$/, '')}/models`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      }).catch(() => null);

      if (res && res.ok) {
        this.status = { state: 'idle', statusText: 'Connected' };
      } else {
        this.status = { state: 'idle', statusText: 'Ready' };
      }
    } catch {
      this.status = { state: 'idle', statusText: 'Ready' };
    }
  }

  public getCapabilities(): AICapabilities {
    return {
      mode: 'api',
      supportsStreaming: true,
      supportsTools: true,
      contextWindow: 4096,
      deviceName: this.config.baseUrl,
      isHardwareAccelerated: true,
    };
  }

  public getStatus(): AIStatus {
    return this.status;
  }

  public stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.status = { state: 'idle' };
  }

  public async chat(request: ChatRequest): Promise<ChatResponse> {
    let fullContent = '';
    let fullReasoning = '';
    const res = await this.stream(request, (token, reasoning) => {
      if (token) fullContent += token;
      if (reasoning) fullReasoning += reasoning;
    });
    return res;
  }

  public async stream(
    request: ChatRequest,
    onToken: (token: string, reasoning?: string) => void,
    externalSignal?: AbortSignal
  ): Promise<ChatResponse> {
    this.abortController = new AbortController();
    const signal = externalSignal || this.abortController.signal;
    this.status = { state: 'generating', statusText: 'Generating response...' };

    const startTime = performance.now();
    let tokenCount = 0;
    let accumulatedContent = '';
    let accumulatedReasoning = '';
    let inThinkTag = false;

    try {
      const url = `${this.config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

      const messages = [...request.messages];
      if (request.systemPrompt && !messages.some(m => m.role === 'system')) {
        messages.unshift({ role: 'system', content: request.systemPrompt });
      }

      const payload = {
        model: request.model || this.config.model || 'minicpm5-2b',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: request.temperature ?? 0.8,
        stream: true,
        max_tokens: request.maxTokens ?? 2048,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
          ...this.config.defaultHeaders,
        },
        body: JSON.stringify(payload),
        signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API error (${response.status}): ${errText || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by server response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue; // Skip keep-alives and empty lines

          if (trimmed === 'data: [DONE]') {
            break;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const jsonStr = trimmed.slice(6);
              const data = JSON.parse(jsonStr);
              const delta = data.choices?.[0]?.delta;

              if (delta) {
                // Check if server supplies dedicated reasoning_content or <think> tags
                if (delta.reasoning_content || delta.reasoning) {
                  const reasoningPiece = delta.reasoning_content || delta.reasoning;
                  accumulatedReasoning += reasoningPiece;
                  onToken('', reasoningPiece);
                }

                if (delta.content) {
                  const contentPiece = delta.content;

                  // Parse <think>...</think> if inline in content
                  if (contentPiece.includes('<think>')) {
                    inThinkTag = true;
                    const parts = contentPiece.split('<think>');
                    if (parts[1]) {
                      accumulatedReasoning += parts[1];
                      onToken('', parts[1]);
                    }
                  } else if (contentPiece.includes('</think>')) {
                    inThinkTag = false;
                    const parts = contentPiece.split('</think>');
                    if (parts[0]) {
                      accumulatedReasoning += parts[0];
                      onToken('', parts[0]);
                    }
                    if (parts[1]) {
                      accumulatedContent += parts[1];
                      tokenCount++;
                      onToken(parts[1]);
                    }
                  } else if (inThinkTag) {
                    accumulatedReasoning += contentPiece;
                    onToken('', contentPiece);
                  } else {
                    accumulatedContent += contentPiece;
                    tokenCount++;
                    onToken(contentPiece);
                  }
                }
              }
            } catch {
              // Ignore malformed JSON chunk in stream
            }
          }
        }
      }

      const elapsedSec = (performance.now() - startTime) / 1000;
      const tokensPerSec = elapsedSec > 0 ? Number((tokenCount / elapsedSec).toFixed(1)) : 0;

      this.status = { state: 'idle' };

      return {
        content: accumulatedContent,
        reasoning: accumulatedReasoning || undefined,
        usage: {
          promptTokens: 0,
          completionTokens: tokenCount,
          totalTokens: tokenCount,
          tokensPerSecond: tokensPerSec,
          latencyMs: Math.round(performance.now() - startTime),
        },
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.status = { state: 'idle', statusText: 'Stopped' };
        return {
          content: accumulatedContent,
          reasoning: accumulatedReasoning,
        };
      }
      this.status = { state: 'error', error: err.message };
      throw err;
    } finally {
      this.abortController = null;
    }
  }
}
