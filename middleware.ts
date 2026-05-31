import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ─────────────────────────────────────────────────────────────────────────────
// Configurações de Segurança
// ─────────────────────────────────────────────────────────────────────────────
const BAN_DURATION_SECONDS = 60 * 60 * 24; // 24h de banimento
const VIOLATION_THRESHOLD = 5;            // Violações antes do ban
const VIOLATION_WINDOW_SEC = 60;           // Janela de contagem (60s)

// ─────────────────────────────────────────────────────────────────────────────
// Singleton: Redis + Rate Limiter (Token Bucket)
// Capacidade: 20 tokens (burst) | Recarga: 10 tokens / 10s
// ─────────────────────────────────────────────────────────────────────────────
let redisClient: Redis | null = null;
let ratelimiter: Ratelimit | null = null;

function getSecurityTools(): { redis: Redis | null; ratelimit: Ratelimit | null } {
  if (redisClient && ratelimiter) {
    return { redis: redisClient, ratelimit: ratelimiter };
  }

  // Permite desativar localmente para evitar custos ou problemas de latência/configuração
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_UPSTASH_LOCAL === 'true') {
    console.log('[Security] Upstash desativado via configuração local.');
    return { redis: null, ratelimit: null };
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[Security] Upstash não configurado. Rate limit e blacklist desativados.');
    return { redis: null, ratelimit: null };
  }

  redisClient = new Redis({ url, token });

  ratelimiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.tokenBucket(
      10,    // tokens recarregados por intervalo
      '10s', // intervalo de recarga
      30,    // capacidade máxima (burst)
    ),
    analytics: false,
    ephemeralCache: new Map(), // Cache in-memory da Vercel Edge para poupar comandos
    prefix: '@literaconnect/rl',
  });

  return { redis: redisClient, ratelimit: ratelimiter };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Local da Blocklist (In-Memory Vercel Edge)
// Objetivo: Evitar bater no Redis a cada req de um IP atacante (loop 10k req/s)
// ─────────────────────────────────────────────────────────────────────────────
const localBlocklistCache = new Map<string, { isBanned: boolean; expiresAt: number }>();
const BLOCKLIST_CACHE_TTL_MS = 10000; // 10 segundos

// ─────────────────────────────────────────────────────────────────────────────
// Resolve o IP real do cliente
// Prioridade: x-forwarded-for (primeiro da cadeia) → x-real-ip → fallback
// ─────────────────────────────────────────────────────────────────────────────
function resolveIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    if (ip) return ip;
  }
  return request.headers.get('x-real-ip') ?? '127.0.0.1';
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware principal
// Ordem de execução:
//   [1] Blacklist de IP (bloqueio imediato)
//   [2] Token Bucket + lógica de ban automático
//   [3] Validação JWT Supabase (sessão da aplicação)
// ─────────────────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {

  // ── Configuração base da resposta e cliente Supabase ─────────────────────
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── [1 + 2] Blacklist + Rate Limit ───────────────────────────────────────
  try {
    const { redis, ratelimit } = getSecurityTools();

    if (redis && ratelimit) {
      const ip = resolveIP(request);
      const banKey = `banned:ip:${ip}`;
      const violationKey = `violation:ip:${ip}`;

      // ── [1] Checar blacklist ANTES de qualquer outro processamento ────────
      let isBanned = false;
      const cachedStatus = localBlocklistCache.get(banKey);

      if (cachedStatus && cachedStatus.expiresAt > Date.now()) {
        isBanned = cachedStatus.isBanned; // Usa status da memória da Vercel Edge
      } else {
        // Se não tem no cache ou expirou, consulta o Redis (Upstash)
        const redisStatus = await redis.get(banKey);
        isBanned = !!redisStatus;

        // Salva na memória local por 10s para segurar floods massivos
        localBlocklistCache.set(banKey, {
          isBanned,
          expiresAt: Date.now() + BLOCKLIST_CACHE_TTL_MS,
        });
      }

      if (isBanned) {
        console.warn(`[Security] Requisição bloqueada — IP banido: ${ip}`);
        return new NextResponse(
          JSON.stringify({
            error: 'Forbidden',
            message: 'Acesso bloqueado temporariamente por atividade suspeita.',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // ── [2] Token Bucket ──────────────────────────────────────────────────
      const { success, limit, remaining, reset } = await ratelimit.limit(ip);
      const retryAfterSec = Math.max(0, Math.ceil((reset - Date.now()) / 1000));

      // Headers de observabilidade (sempre presentes)
      response.headers.set('X-RateLimit-Limit', String(limit));
      response.headers.set('X-RateLimit-Remaining', String(remaining));
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(reset / 1000)));

      if (!success) {
        // Incrementa contador de violações (operação atômica)
        const violations = await redis.incr(violationKey);

        // Define TTL na janela apenas na primeira violação
        if (violations === 1) {
          await redis.expire(violationKey, VIOLATION_WINDOW_SEC);
        }

        // Atingiu o limiar → banir IP automaticamente
        if (violations >= VIOLATION_THRESHOLD) {
          await redis.set(banKey, '1', { ex: BAN_DURATION_SECONDS });
          await redis.del(violationKey);

          // Aplica o ban imediatamente no cache local em memória
          localBlocklistCache.set(banKey, {
            isBanned: true,
            expiresAt: Date.now() + BLOCKLIST_CACHE_TTL_MS,
          });

          console.warn(`[Security] IP BANIDO por ${BAN_DURATION_SECONDS / 3600}h: ${ip} (${violations} violações)`);
        }

        return new NextResponse(
          JSON.stringify({
            error: 'Too Many Requests',
            message: `Limite de requisições excedido. Tente novamente em ${retryAfterSec}s.`,
            retryAfter: retryAfterSec,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
              'Retry-After': String(retryAfterSec),
            },
          }
        );
      }
    }
  } catch (err) {
    // Fail-open: Redis indisponível → não derruba a API
    console.error('[Security] Falha no Redis. Tráfego permitido (fail-open):', err);
  }

  // ── [3] Validar JWT Supabase no servidor ─────────────────────────────────
  // IMPORTANTE: getUser() valida o token criptograficamente no servidor.
  // Nunca confie em userId vindo do cliente.
  await supabase.auth.getUser();

  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// Matcher — exclui assets estáticos, imagens e avatars públicos
// ─────────────────────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|__nextjs_original-stack-frames|favicon.ico|public|api/avatar|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
