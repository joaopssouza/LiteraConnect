import { connectRedis } from '@/lib/redis';

export const buildServerCacheKey = (...parts: Array<string | number | null | undefined>) =>
  parts.map((part) => (part === null || part === undefined ? '-' : String(part))).join(':');

/**
 * Cache distribuído via Redis.
 * Substitui o Map em memória que não funcionava em ambientes serverless
 * com múltiplas instâncias (Vercel, Railway, etc).
 *
 * @param key    Chave única do cache
 * @param ttlMs  Tempo de vida em milissegundos
 * @param producer Função assíncrona que produz o valor caso não esteja em cache
 */
export async function getOrSetServerCache<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>
): Promise<{ value: T; hit: boolean }> {
  try {
    const redis = await connectRedis();
    const cached = await redis.get(`cache:${key}`);

    if (cached) {
      return { value: JSON.parse(cached) as T, hit: true };
    }

    const value = await producer();
    const ttlSeconds = Math.ceil(ttlMs / 1000);

    await redis.setEx(`cache:${key}`, ttlSeconds, JSON.stringify(value));

    return { value, hit: false };
  } catch (redisErr) {
    // Se o Redis falhar, cai no producer diretamente (graceful degradation)
    console.warn('[cache] Redis indisponível, buscando direto:', redisErr);
    const value = await producer();
    return { value, hit: false };
  }
}

/**
 * Remove uma chave específica do cache Redis.
 */
export async function invalidateServerCache(key: string): Promise<void> {
  try {
    const redis = await connectRedis();
    await redis.del(`cache:${key}`);
  } catch (err) {
    console.warn('[cache] Falha ao invalidar cache:', err);
  }
}

/**
 * Remove todas as chaves de cache que começam com o prefixo informado.
 * Usa SCAN para não bloquear o Redis em produção (evita KEYS *).
 */
export async function invalidateServerCacheByPrefix(prefix: string): Promise<void> {
  try {
    const redis = await connectRedis();
    let cursor = '0';
    do {
      const result = await redis.scan(cursor, { MATCH: `cache:${prefix}*`, COUNT: 100 });
      cursor = String(result.cursor);
      if (result.keys.length > 0) {
        await redis.del(result.keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.warn('[cache] Falha ao invalidar cache por prefixo:', err);
  }
}
