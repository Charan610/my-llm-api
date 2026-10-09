import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateSecureApiKey, listKeys, revokeKey, validateApiKey } from '../_auth';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: List all keys (masked)
  if (req.method === 'GET') {
    const keys = listKeys();
    return res.status(200).json({ object: 'list', data: keys });
  }

  // POST: Create a new API key (shows full secret ONCE)
  if (req.method === 'POST') {
    const { platform = 'app', name, permissions = ['chat', 'models'], rateLimit = 60 } = req.body || {};
    const { rawKey, record } = generateSecureApiKey(platform);

    if (name) record.name = name;
    if (permissions) record.permissions = permissions;
    if (rateLimit) record.rateLimit = rateLimit;

    return res.status(201).json({
      message: 'API Key generated successfully. Save this secret now; you will not be able to view it again.',
      secret_api_key: rawKey,
      key_id: record.id,
      name: record.name,
      platform: record.platform,
      permissions: record.permissions,
      rate_limit_per_min: record.rateLimit,
      created_at: record.createdAt,
    });
  }

  // DELETE: Revoke an API key
  if (req.method === 'DELETE') {
    const { key_id } = req.body || {};
    if (!key_id) {
      return res.status(400).json({ error: 'Missing key_id' });
    }
    const success = revokeKey(key_id);
    if (success) {
      return res.status(200).json({ message: `API Key ${key_id} has been revoked.` });
    }
    return res.status(404).json({ error: 'Key not found' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
