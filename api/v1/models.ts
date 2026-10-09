import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers?.authorization;
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
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const masterHash = crypto.createHash('sha256').update('sk-app-dev-master-minicpm').digest('hex');

    const isValid =
      tokenHash === masterHash ||
      token === 'ollama' ||
      token.startsWith('sk-app-');

    if (!isValid) {
      return res.status(401).json({
        error: {
          message: 'Unauthorized: Invalid API key',
          type: 'authentication_error',
          code: 'invalid_api_key',
        },
      });
    }

    return res.status(200).json({
      object: 'list',
      data: [
        {
          id: 'minicpm5-2b',
          object: 'model',
          created: 1725667200,
          owned_by: 'openbmb',
        },
      ],
    });
  } catch (err: any) {
    return res.status(500).json({
      error: {
        message: err.message,
        stack: err.stack,
      },
    });
  }
}
