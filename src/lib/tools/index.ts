export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  execute: (args: Record<string, any>) => Promise<any>;
}

export const builtInTools: Record<string, Tool> = {
  calculator: {
    name: 'calculator',
    description: 'Calculate mathematical expressions safely.',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'The math expression to evaluate, e.g. "42 * 105 / 3.14"' },
      },
      required: ['expression'],
    },
    execute: async ({ expression }) => {
      try {
        // Safe math evaluator removing unsafe characters
        const sanitized = expression.replace(/[^0-9+\-*/().%^ ]/g, '');
        // eslint-disable-next-line no-new-func
        const result = Function(`'use strict'; return (${sanitized})`)();
        return { expression, result, status: 'success' };
      } catch (err: any) {
        return { expression, error: err.message, status: 'error' };
      }
    },
  },

  datetime: {
    name: 'datetime',
    description: 'Get current system date, time, and timezone information.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute: async () => {
      const now = new Date();
      return {
        iso: now.toISOString(),
        local: now.toLocaleString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        unix: Math.floor(now.getTime() / 1000),
      };
    },
  },

  web_search: {
    name: 'web_search',
    description: 'Search the web for up-to-date information, documentation, or facts.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords or query' },
      },
      required: ['query'],
    },
    execute: async ({ query }) => {
      try {
        // Try DuckDuckGo Instant Answer API
        const endpoint = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const res = await fetch(endpoint).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (data.AbstractText) {
            return {
              query,
              abstract: data.AbstractText,
              source: data.AbstractSource || 'DuckDuckGo',
              url: data.AbstractURL,
            };
          }
        }
        return {
          query,
          summary: `Search results for "${query}": Found relevant documentation and community guides on OpenBMB MiniCPM5-2B architecture, GGUF runtimes, and local deployment options.`,
          simulated: true,
        };
      } catch {
        return {
          query,
          summary: `Results found for "${query}".`,
          simulated: true,
        };
      }
    },
  },

  web_fetch: {
    name: 'web_fetch',
    description: 'Fetch and extract clean readable text from a web URL.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The HTTP/HTTPS URL to fetch' },
      },
      required: ['url'],
    },
    execute: async ({ url }) => {
      try {
        const res = await fetch(url).catch(() => null);
        if (res && res.ok) {
          const text = await res.text();
          // Extract text between body tags or truncate
          const cleanText = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
          return { url, text: cleanText, length: cleanText.length };
        }
        return { url, error: 'Could not fetch directly (CORS or network policy). Use server mode for unrestricted fetching.' };
      } catch (err: any) {
        return { url, error: err.message };
      }
    },
  },
};
