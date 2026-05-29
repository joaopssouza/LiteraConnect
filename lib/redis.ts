import { createClient } from 'redis';

const globalForRedis = global as unknown as { redisClient: ReturnType<typeof createClient> };

export const redisClient = globalForRedis.redisClient || createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisClient = redisClient;
}

/**
 * Conecta o cliente Redis se ainda não estiver conectado.
 * Usa Singleton para evitar exaustão de conexões no Next.js Dev/Server Actions.
 */
export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    try {
      // Timeout de 500ms para evitar que latência de rede trave a API
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 500)
      );
      await Promise.race([redisClient.connect(), timeoutPromise]);
    } catch (err) {
      console.warn('[Redis] Erro ou timeout ao conectar:', err instanceof Error ? err.message : err);
    }
  }
  return redisClient;
};

/**
 * Incrementa o contador de views de um post.
 * Usa INCR simples (~8 bytes/chave) em vez de HyperLogLog (~12KB/chave).
 * TTL de 7 dias — posts antigos consolidam views no Supabase via job batch futuro.
 * Estratégia otimizada para Redis free tier (30MB).
 */
export const incrementPostViews = async (postId: string): Promise<number> => {
  const redis = await connectRedis();
  const key = `post:${postId}:views`;
  const views = await redis.incr(key);
  // Define TTL apenas na criação da chave (primeira view)
  if (views === 1) {
    await redis.expire(key, 60 * 60 * 24 * 7); // 7 dias
  }
  return views;
};

/**
 * Lê o total de views de um post do Redis.
 * Retorna 0 se a chave expirou (o chamador deve buscar do Supabase como fallback).
 */
export const getPostViews = async (postId: string): Promise<number> => {
  const redis = await connectRedis();
  const val = await redis.get(`post:${postId}:views`);
  return val ? parseInt(val, 10) : 0;
};

/**
 * Invalida o cache do feed de um usuário no Redis.
 * Chamado após publicação ou deleção de post para forçar rebuild na próxima requisição.
 * Usa SCAN para não bloquear o Redis (evita KEYS *).
 */
export const invalidateFeedCache = async (userId: string): Promise<void> => {
  const redis = await connectRedis();
  const keysToDelete: string[] = [];
  for await (const key of redis.scanIterator({ MATCH: `cache:feed:${userId}*`, COUNT: 50 })) {
    const k = Array.isArray(key) ? key[0] : key;
    keysToDelete.push(k as string);
  }
  if (keysToDelete.length > 0) {
    await redis.del(keysToDelete);
  }
};

