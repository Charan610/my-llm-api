import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateApiKey } from '../../_auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Enforce Authentication & Scoped Permissions
  const auth = validateApiKey(req.headers.authorization, 'chat');
  if (!auth.valid) {
    return res.status(auth.status).json({
      error: {
        message: auth.error,
        type: 'authentication_error',
        code: auth.status === 401 ? 'invalid_api_key' : 'forbidden',
      },
    });
  }

  const { model, messages, stream = false, temperature = 0.8, max_tokens = 2048 } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: {
        message: "Missing 'messages' array in request body",
        type: 'invalid_request_error',
      },
    });
  }

  // Upstream Inference Server (Mac with Cloudflare Tunnel, or local address)
  const upstreamUrl = process.env.MINICPM_BACKEND_URL || 'http://127.0.0.1:11434';
  const targetUrl = `${upstreamUrl.replace(/\/+$/, '')}/v1/chat/completions`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'minicpm5-2b',
        messages,
        stream,
        temperature,
        max_tokens,
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
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
    // Upstream could not be reached (e.g. Mac laptop is offline or MINICPM_BACKEND_URL not set in cloud)
    // Return structured, helpful response
    const lastPrompt = messages[messages.length - 1]?.content || '';
    const isLocalhost = upstreamUrl.includes('127.0.0.1') || upstreamUrl.includes('localhost');

    const errorMsg = isLocalhost
      ? `MiniCPM Inference Engine is running locally on your Mac. To connect your cloud Vercel API to your Mac, start Cloudflare Tunnel (cloudflared tunnel --url http://localhost:11434) and set MINICPM_BACKEND_URL in Vercel settings.`
      : `Could not reach upstream inference server at ${upstreamUrl}: ${err.message}`;

    return res.status(503).json({
      error: {
        message: errorMsg,
        type: 'upstream_unavailable',
        code: 'service_unavailable',
        authenticated_as: auth.record?.name,
        upstream_configured: upstreamUrl,
      },
    });
  }
}
