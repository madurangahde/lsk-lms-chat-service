import crypto from 'crypto';
import { env } from '../config/env.js';
import { getRedisClient } from '../config/redis.js';

const memoryCache = new Map();

function keyForToken(token) {
  return `chat-auth:${crypto.createHash('sha256').update(token).digest('hex')}`;
}

export async function getCachedAuth(token) {
  const key = keyForToken(token);
  const now = Date.now();

  const local = memoryCache.get(key);
  if (local && local.expiresAt > now) {
    return local.value;
  }

  const redis = getRedisClient();
  if (redis) {
    const raw = await redis.get(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryCache.set(key, { value: parsed, expiresAt: now + env.authCacheTtlSeconds * 1000 });
      return parsed;
    }
  }

  return null;
}

export async function setCachedAuth(token, value) {
  const key = keyForToken(token);
  const ttlMs = env.authCacheTtlSeconds * 1000;
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });

  const redis = getRedisClient();
  if (redis) {
    await redis.set(key, JSON.stringify(value), { EX: env.authCacheTtlSeconds });
  }
}
