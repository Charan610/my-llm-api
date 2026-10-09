import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateApiKey } from '../_auth';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enforce API Key authentication
  const auth = validateApiKey(req.headers.authorization, 'models');
  if (!auth.valid) {
    return res.status(auth.status).json({
      error: {
        message: auth.error,
        type: 'authentication_error',
        code: auth.status === 401 ? 'invalid_api_key' : 'forbidden',
      },
    });
  }

  // Return OpenAI compatible model list
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
