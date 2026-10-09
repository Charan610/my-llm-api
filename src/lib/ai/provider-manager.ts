import { AIProvider, AICapabilities, AIStatus, ChatRequest, ChatResponse, ProviderMode } from './types';
import { WebGPUProvider } from './webgpu-provider';
import { APIProvider, APIProviderConfig } from './api-provider';

export interface ProviderManagerOptions {
  mode: ProviderMode;
  apiConfig: APIProviderConfig;
}

export class ProviderManager {
  private currentMode: ProviderMode = 'auto';
  private webgpuProvider: WebGPUProvider;
  private apiProvider: APIProvider;
  private activeProvider: AIProvider;

  constructor(options: ProviderManagerOptions) {
    this.webgpuProvider = new WebGPUProvider();
    this.apiProvider = new APIProvider(options.apiConfig);
    this.currentMode = options.mode;
    this.activeProvider = this.resolveProvider(options.mode);
  }

  public updateApiConfig(config: Partial<APIProviderConfig>) {
    this.apiProvider.updateConfig(config);
  }

  public setMode(mode: ProviderMode) {
    this.currentMode = mode;
    this.activeProvider = this.resolveProvider(mode);
  }

  public getMode(): ProviderMode {
    return this.currentMode;
  }

  private resolveProvider(mode: ProviderMode): AIProvider {
    if (mode === 'api') {
      return this.apiProvider;
    }
    if (mode === 'webgpu') {
      return this.webgpuProvider;
    }
    // Auto Mode: prefer WebGPU if supported in current browser, else API provider
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      return this.webgpuProvider;
    }
    return this.apiProvider;
  }

  public getActiveProvider(): AIProvider {
    return this.activeProvider;
  }

  public getCapabilities(): AICapabilities {
    return this.activeProvider.getCapabilities();
  }

  public getStatus(): AIStatus {
    return this.activeProvider.getStatus();
  }

  public async initialize(onProgress?: (progress: number, stage: string) => void): Promise<void> {
    return this.activeProvider.initialize(onProgress);
  }

  public stop(): void {
    this.activeProvider.stop();
  }

  public async stream(
    request: ChatRequest,
    onToken: (token: string, reasoning?: string) => void,
    signal?: AbortSignal
  ): Promise<ChatResponse> {
    return this.activeProvider.stream(request, onToken, signal);
  }
}
