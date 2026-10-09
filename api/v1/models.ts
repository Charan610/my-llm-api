import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'crypto';

// Master key hash for instant authentication
const MASTER_KEY_HASH = createHash('sha256').update('sk-app-dev-master-minicpm').digest('hex');

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate
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

  // Validate against Master Key or custom keys in environment or standard prefix
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

  return res.status(200).json({
    object: 'list',
    data: [
      {
        id: 'minicpm5-2b',
        object: 'model',
        created: 1725667200,
        owned_by: 'openbmb',
        permission: [],
        root: 'minicpm5-2b',
        parent: null,
      },
    ],
  });
}
