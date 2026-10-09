import { createHash, randomBytes } from 'crypto';

export interface ApiKeyRecord {
  id: string;
  name: string;
  platform: string;
  keyPrefix: string;      // First 8 characters shown to user, e.g. sk-app-a
  hashedKey: string;      // SHA-256 hash of the full key
  status: 'active' | 'revoked';
  permissions: string[];
  rateLimit: number;      // Max requests per minute
  createdAt: number;
  lastUsed?: number;
}

// In-memory store for serverless execution, seeded with default approved applications
// In production with multiple serverless nodes, can be backed by Vercel KV, Upstash, or SQLite
const activeKeys: Map<string, ApiKeyRecord> = new Map();
const requestCounts: Map<string, { count: number; windowStart: number }> = new Map();

export function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export function generateSecureApiKey(platform: string = 'app'): { rawKey: string; record: ApiKeyRecord } {
  const secretPart = randomBytes(24).toString('hex');
  const rawKey = `sk-app-${platform.slice(0, 3)}-${secretPart}`;
  const record: ApiKeyRecord = {
    id: `app_${platform}_${randomBytes(4).toString('hex')}`,
    name: `${platform.toUpperCase()} Application`,
    platform,
    keyPrefix: rawKey.slice(0, 11),
    hashedKey: hashKey(rawKey),
    status: 'active',
    permissions: ['chat', 'models'],
    rateLimit: 60,
    createdAt: Date.now(),
  };

  activeKeys.set(record.hashedKey, record);
  return { rawKey, record };
}

// Seed default keys if empty
function ensureSeeded() {
  if (activeKeys.size === 0) {
    // Master development key: "sk-app-dev-master-minicpm"
    const masterKey = 'sk-app-dev-master-minicpm';
    activeKeys.set(hashKey(masterKey), {
      id: 'app_master_default',
      name: 'Master Developer Key',
      platform: 'mac',
      keyPrefix: 'sk-app-dev',
      hashedKey: hashKey(masterKey),
      status: 'active',
      permissions: ['chat', 'models', 'tools', 'admin'],
      rateLimit: 120,
      createdAt: Date.now(),
    });
  }
}

export function validateApiKey(
  authHeader: string | null | undefined,
  requiredPermission: string = 'chat'
): { valid: boolean; error?: string; status: number; record?: ApiKeyRecord } {
  ensureSeeded();

  if (!authHeader) {
    return {
      valid: false,
      error: 'Missing Authorization header. Expected: Bearer <API_KEY>',
      status: 401,
    };
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      valid: false,
      error: 'Invalid Authorization header format. Expected: Bearer <API_KEY>',
      status: 401,
    };
  }

  const token = parts[1];
  const tokenHash = hashKey(token);
  const record = activeKeys.get(tokenHash);

  if (!record) {
    // Also allow dummy development key 'ollama' in local dev mode
    if (token === 'ollama' && process.env.NODE_ENV !== 'production') {
      return {
        valid: true,
        status: 200,
        record: {
          id: 'dev_ollama',
          name: 'Local Dev (ollama)',
          platform: 'local',
          keyPrefix: 'ollama',
          hashedKey: hashKey('ollama'),
          status: 'active',
          permissions: ['chat', 'models', 'tools'],
          rateLimit: 300,
          createdAt: Date.now(),
        },
      };
    }
    return {
      valid: false,
      error: 'Unauthorized: Invalid API key',
      status: 401,
    };
  }

  if (record.status !== 'active') {
    return {
      valid: false,
      error: 'Unauthorized: This API key has been revoked',
      status: 403,
    };
  }

  if (!record.permissions.includes(requiredPermission) && !record.permissions.includes('admin')) {
    return {
      valid: false,
      error: `Forbidden: API key does not have permission '${requiredPermission}'`,
      status: 403,
    };
  }

  // Rate Limiting Check
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  let clientUsage = requestCounts.get(record.id);

  if (!clientUsage || now - clientUsage.windowStart > windowMs) {
    clientUsage = { count: 1, windowStart: now };
    requestCounts.set(record.id, clientUsage);
  } else {
    clientUsage.count++;
    if (clientUsage.count > record.rateLimit) {
      return {
        valid: false,
        error: `Rate limit exceeded. Maximum ${record.rateLimit} requests per minute for this key.`,
        status: 429,
      };
    }
  }

  record.lastUsed = now;
  return { valid: true, status: 200, record };
}

export function listKeys(): Omit<ApiKeyRecord, 'hashedKey'>[] {
  ensureSeeded();
  return Array.from(activeKeys.values()).map(r => ({
    id: r.id,
    name: r.name,
    platform: r.platform,
    keyPrefix: r.keyPrefix,
    status: r.status,
    permissions: r.permissions,
    rateLimit: r.rateLimit,
    createdAt: r.createdAt,
    lastUsed: r.lastUsed,
  }));
}

export function revokeKey(id: string): boolean {
  ensureSeeded();
  for (const record of activeKeys.values()) {
    if (record.id === id) {
      record.status = 'revoked';
      return true;
    }
  }
  return false;
}
