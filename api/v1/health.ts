import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  return res.status(200).json({
    status: 'healthy',
    platform: 'Universal MiniCPM AI Platform',
    version: '1.0.0',
    model: 'minicpm5-2b',
    endpoints: {
      models: '/v1/models',
      chat_completions: '/v1/chat/completions',
      keys: '/api/v1/keys',
    },
    upstream_backend: process.env.MINICPM_BACKEND_URL || 'http://127.0.0.1:11434',
    time: new Date().toISOString(),
  });
}
