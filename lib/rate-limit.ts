import { connectRedis } from '@/lib/redis';
import { NextResponse } from 'next/server';

/**
 * Rate Limiting via Redis com sliding window.
 *
 * Estratégia: contador INCR com expiração por janela de tempo.
 * Chave: ratelimit:<identifier>:<windowKey>
 *
 * @param identifier - identificador único (ex: userId, IP)
 * @param limit      - máximo de requisições na janela
 * @param windowSecs - tamanho da janela em segundos
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 20,
  windowSecs: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  try {
    const redis = await connectRedis();
    const windowKey = Math.floor(Date.now() / (windowSecs * 1000));
    const key = `ratelimit:${identifier}:${windowKey}`;

    const current = await redis.incr(key);
    if (current === 1) {
      // Primeira requisição na janela — define TTL
      await redis.expire(key, windowSecs + 5);
    }

    const resetAt = (windowKey + 1) * windowSecs * 1000;
    const remaining = Math.max(0, limit - current);

    return { allowed: current <= limit, remaining, resetAt };
  } catch {
    // Redis indisponível → permite a requisição (fail-open)
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowSecs * 1000 };
  }
}

/**
 * Retorna resposta HTTP 429 padronizada com headers Retry-After.
 */
export function rateLimitResponse(resetAt: number): NextResponse {
  const retryAfterSecs = Math.ceil((resetAt - Date.now()) / 1000);
  const response = NextResponse.json(
    { error: 'Muitas requisições. Aguarde antes de tentar novamente.', retryAfterSecs },
    { status: 429 }
  );
  response.headers.set('Retry-After', String(retryAfterSecs));
  response.headers.set('X-RateLimit-Reset', String(resetAt));
  return response;
}
