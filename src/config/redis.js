import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { env } from './env.js';

let cacheClient = null;

export async function configureRedis(io) {
  if (!env.useRedis || !env.redisUrl) {
    console.log('ℹ️ Redis disabled');
    return null;
  }

  const pubClient = createClient({ url: env.redisUrl });
  const subClient = pubClient.duplicate();
  cacheClient = createClient({ url: env.redisUrl });

  await Promise.all([pubClient.connect(), subClient.connect(), cacheClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  console.log('✅ Redis adapter enabled');
  return { pubClient, subClient, cacheClient };
}

export function getRedisClient() {
  return cacheClient;
}
