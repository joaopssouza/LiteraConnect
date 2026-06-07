import { NextResponse } from 'next/server';
import { connectRedis } from '@/lib/redis';

// Runtime Node.js necessário para usar o pacote redis tcp
export const runtime = 'nodejs';

const BAN_DURATION_SECONDS = 60 * 60 * 24; // 24h de banimento
const VIOLATION_THRESHOLD = 10;           // Violações antes do ban (aumentado para evitar bans acidentais)
const VIOLATION_WINDOW_SEC = 120;         // Janela de contagem
const RATE_LIMIT_CAPACITY = 60;           // Burst (aumentado de 30 para 60 requisições globais)
const RATE_LIMIT_REFILL_INTERVAL = 10;    // interval in seconds

/**
 * Endpoint interno para checagem de segurança global (Blacklist e Rate Limit)
 * Usado exclusivamente pelo middleware (Edge) para contornar a limitação de TCP.
 */
export async function POST(request: Request) {
  try {
    // 1. Verificação de autorização interna
    const authHeader = request.headers.get('x-internal-secret');
    if (authHeader !== process.env.INTERNAL_SECURITY_SECRET && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized internal access' }, { status: 401 });
    }

    const { ip } = await request.json();
    if (!ip) {
      return NextResponse.json({ error: 'IP is required' }, { status: 400 });
    }

    const redis = await connectRedis();
    const banKey = `banned:ip:${ip}`;
    const violationKey = `violation:ip:${ip}`;
    const rlKey = `@literaconnect/rl:${ip}`;

    // 2. Checar Blacklist
    const isBanned = await redis.get(banKey);
    if (isBanned) {
      return NextResponse.json({ action: 'block', reason: 'banned' });
    }

    // 3. Checar Rate Limit (Sliding Window / Token Bucket approximation via Incer + Expire)
    // Para simplificar e manter performance no Redis open-source, usaremos Fixed Window com Expire
    // O Upstash usava Token Bucket. Podemos simular um limite simples para o global:
    // Permite 30 requisições a cada 10 segundos globalmente
    const windowKey = Math.floor(Date.now() / (RATE_LIMIT_REFILL_INTERVAL * 1000));
    const currentWindowKey = `${rlKey}:${windowKey}`;

    const currentRequests = await redis.incr(currentWindowKey);
    if (currentRequests === 1) {
      await redis.expire(currentWindowKey, RATE_LIMIT_REFILL_INTERVAL * 2); // Deixa uma margem
    }

    const reset = (windowKey + 1) * RATE_LIMIT_REFILL_INTERVAL * 1000;
    const remaining = Math.max(0, RATE_LIMIT_CAPACITY - currentRequests);
    const success = currentRequests <= RATE_LIMIT_CAPACITY;

    if (!success) {
      // Registrar violação
      const violations = await redis.incr(violationKey);
      if (violations === 1) {
        await redis.expire(violationKey, VIOLATION_WINDOW_SEC);
      }

      if (violations >= VIOLATION_THRESHOLD) {
        // Banir o IP
        await redis.set(banKey, '1', { EX: BAN_DURATION_SECONDS });
        await redis.del(violationKey);
        return NextResponse.json({ action: 'block', reason: 'banned_now', violations });
      }

      return NextResponse.json({
        action: 'ratelimit',
        limit: RATE_LIMIT_CAPACITY,
        remaining: 0,
        reset
      });
    }

    // Passou com sucesso
    return NextResponse.json({
      action: 'allow',
      limit: RATE_LIMIT_CAPACITY,
      remaining,
      reset
    });

  } catch (error) {
    console.error('[Security API] Erro ao validar requisição:', error);
    // Fail-open
    return NextResponse.json({ action: 'allow', reason: 'fail-open' });
  }
}
