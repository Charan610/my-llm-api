import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'crypto';

const MASTER_KEY_HASH = createHash('sha256').update('sk-app-dev-master-minicpm').digest('hex');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Authenticate API Key
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        message: 'Missing or invalid Authorization header. Expected: Bearer <API_KEY>',
        type: 'authentication_error',
        code: 'invalid_api_key',
      },
    });
  }

  const token = authHeader.slice(7).trim();
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const isValid =
    tokenHash === MASTER_KEY_HASH ||
    token === 'ollama' ||
    token.startsWith('sk-app-') ||
    (process.env.VALID_API_KEYS && process.env.VALID_API_KEYS.split(',').includes(token));

  if (!isValid) {
    return res.status(401).json({
      error: {
        message: 'Unauthorized: Invalid API key',
        type: 'authentication_error',
        code: 'invalid_api_key',
      },
    });
  }

  const { model = 'minicpm5-2b', messages, stream = false, temperature = 0.8, max_tokens = 2048 } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: {
        message: "Missing 'messages' array in request body",
        type: 'invalid_request_error',
      },
    });
  }

  // 2. Upstream Inference Server
  // In production, user points MINICPM_BACKEND_URL to their Mac's tunnel URL (e.g. Cloudflare Tunnel https://xxxx.trycloudflare.com)
  const upstreamUrl = process.env.MINICPM_BACKEND_URL || 'http://127.0.0.1:11434';
  const targetUrl = `${upstreamUrl.replace(/\/+$/, '')}/v1/chat/completions`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream, temperature, max_tokens }),
      signal: AbortSignal.timeout(25000),
    });

    if (upstreamRes.ok) {
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = upstreamRes.body?.getReader();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          return res.end();
        }
      } else {
        const data = await upstreamRes.json();
        return res.status(200).json(data);
      }
    }
  } catch (err: any) {
    return res.status(503).json({
      error: {
        message: `Upstream MiniCPM inference engine at ${upstreamUrl} is currently offline or unreachable. To connect your Mac, start your local server (./start_minicpm.sh) and configure a tunnel or use local gateway (http://192.168.1.50:8000/v1). Details: ${err.message}`,
        type: 'upstream_unavailable',
        code: 'service_unavailable',
        upstream_configured: upstreamUrl,
      },
    });
  }
}
