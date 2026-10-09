import { ChatMessage, ProviderMode } from '../ai/types';

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  providerMode: ProviderMode;
  model: string;
}

export interface AuthorizedApplication {
  id: string;
  name: string;
  platform: 'android' | 'mac' | 'web' | 'agent' | 'custom';
  apiKey: string;
  status: 'active' | 'revoked';
  permissions: string[];
  rateLimit: number; // requests per minute
  createdAt: number;
  lastUsed?: number;
}

export interface AppSettings {
  providerMode: ProviderMode;
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  enabledTools: string[];
}

export interface UsageMetric {
  id: string;
  timestamp: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  tokensPerSecond: number;
  latencyMs: number;
  provider: string;
  model: string;
}

const STORAGE_KEYS = {
  CONVERSATIONS: 'universal_ai_conversations',
  CURRENT_CONV_ID: 'universal_ai_current_id',
  SETTINGS: 'universal_ai_settings',
  APPLICATIONS: 'universal_ai_apps',
  METRICS: 'universal_ai_metrics',
};

const DEFAULT_SETTINGS: AppSettings = {
  providerMode: 'auto',
  apiBaseUrl: 'http://127.0.0.1:11434/v1',
  apiKey: 'ollama',
  modelName: 'minicpm5-2b',
  systemPrompt: 'You are MiniCPM5-2B, a helpful, fast, and capable AI assistant.',
  temperature: 0.8,
  maxTokens: 2048,
  enabledTools: ['calculator', 'datetime', 'web_search'],
};

const DEFAULT_APPLICATIONS: AuthorizedApplication[] = [
  {
    id: 'app_android_main',
    name: 'Android Mobile App',
    platform: 'android',
    apiKey: 'sk-app-and-8f3a9c72e1b4',
    status: 'active',
    permissions: ['chat', 'models', 'web_search'],
    rateLimit: 60,
    createdAt: Date.now() - 86400000 * 2,
    lastUsed: Date.now() - 3600000,
  },
  {
    id: 'app_mac_assistant',
    name: 'Mac Agent Assistant',
    platform: 'mac',
    apiKey: 'sk-app-mac-4d9e2b10a56f',
    status: 'active',
    permissions: ['chat', 'models', 'tools', 'web_search', 'web_fetch'],
    rateLimit: 120,
    createdAt: Date.now() - 86400000 * 5,
    lastUsed: Date.now() - 1800000,
  },
  {
    id: 'app_web_dashboard',
    name: 'Universal Web Dashboard',
    platform: 'web',
    apiKey: 'sk-app-web-71c84a0d92ef',
    status: 'active',
    permissions: ['chat', 'models', 'tools', 'web_search'],
    rateLimit: 100,
    createdAt: Date.now() - 86400000,
    lastUsed: Date.now(),
  },
];

export const Storage = {
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings', e);
    }
  },

  getConversations(): Conversation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveConversations(conversations: Conversation[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    } catch (e) {
      console.error('Error saving conversations', e);
    }
  },

  getCurrentConversationId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_CONV_ID);
    } catch {
      return null;
    }
  },

  setCurrentConversationId(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_CONV_ID, id);
    } catch (e) {
      console.error('Error setting current conversation', e);
    }
  },

  getApplications(): AuthorizedApplication[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
      return data ? JSON.parse(data) : DEFAULT_APPLICATIONS;
    } catch {
      return DEFAULT_APPLICATIONS;
    }
  },

  saveApplications(apps: AuthorizedApplication[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
    } catch (e) {
      console.error('Error saving applications', e);
    }
  },

  getMetrics(): UsageMetric[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.METRICS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  logMetric(metric: Omit<UsageMetric, 'id' | 'timestamp'>): void {
    try {
      const metrics = this.getMetrics();
      const newMetric: UsageMetric = {
        ...metric,
        id: 'metric_' + Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
      };
      // Keep last 100 metrics
      const updated = [newMetric, ...metrics].slice(0, 100);
      localStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify(updated));
    } catch (e) {
      console.error('Error logging metric', e);
    }
  },
};
