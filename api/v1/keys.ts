import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';

// In-memory key store on Vercel serverless instance
interface StoredKey {
  id: string;
  name: string;
  platform: string;
  keyPrefix: string;
  hashedKey: string;
  status: 'active' | 'revoked';
  permissions: string[];
  rateLimit: number;
  createdAt: number;
}

const MEMORY_KEYS: Map<string, StoredKey> = new Map();

function ensureDefaultKey() {
  const masterHash = crypto.createHash('sha256').update('sk-app-dev-master-minicpm').digest('hex');
  if (!MEMORY_KEYS.has('app_master')) {
    MEMORY_KEYS.set('app_master', {
      id: 'app_master_default',
      name: 'Master Developer Key',
      platform: 'mac',
      keyPrefix: 'sk-app-dev',
      hashedKey: masterHash,
      status: 'active',
      permissions: ['chat', 'models', 'tools', 'admin'],
      rateLimit: 120,
      createdAt: 1725667200000,
    });
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  ensureDefaultKey();

  if (req.method === 'GET') {
    const list = Array.from(MEMORY_KEYS.values()).map(k => ({
      id: k.id,
      name: k.name,
      platform: k.platform,
      key_prefix: k.keyPrefix,
      status: k.status,
      permissions: k.permissions,
      rate_limit: k.rateLimit,
      created_at: k.createdAt,
    }));
    return res.status(200).json({ object: 'list', data: list });
  }

  if (req.method === 'POST') {
    const { name = 'New App', platform = 'app', permissions = ['chat', 'models'], rateLimit = 60 } = req.body || {};
    const secretPart = crypto.randomBytes(24).toString('hex');
    const rawKey = `sk-app-${platform.slice(0, 3)}-${secretPart}`;
    const keyId = `app_${platform}_${crypto.randomBytes(4).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    const record: StoredKey = {
      id: keyId,
      name,
      platform,
      keyPrefix: rawKey.slice(0, 11),
      hashedKey,
      status: 'active',
      permissions,
      rateLimit,
      createdAt: Date.now(),
    };

    MEMORY_KEYS.set(keyId, record);

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

  if (req.method === 'DELETE') {
    const { key_id } = req.body || {};
    if (!key_id) {
      return res.status(400).json({ error: 'Missing key_id' });
    }
    const record = MEMORY_KEYS.get(key_id);
    if (record) {
      record.status = 'revoked';
      return res.status(200).json({ message: `API Key ${key_id} has been revoked.` });
    }
    return res.status(404).json({ error: 'Key not found' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
