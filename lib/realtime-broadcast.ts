/**
 * Broadcast direto ao Supabase Realtime via HTTP interno (rede Docker db_network).
 *
 * O supabaseAdmin usa NEXT_PUBLIC_SUPABASE_URL = domínio público, que roteia
 * via Cloudflare → NPM → Kong. O endpoint /api/broadcast do Realtime exige
 * autenticação JWT assinada com JWT_SECRET — não o API_JWT_SECRET hardcoded.
 *
 * Este módulo:
 * 1. Gera um JWT HS256 assinado com process.env.JWT_SECRET
 * 2. Chama http://supabase_realtime:4000/api/broadcast diretamente
 */

import * as crypto from 'crypto';

const REALTIME_INTERNAL_URL = 'http://supabase_realtime:4000';
const JWT_SECRET = process.env.JWT_SECRET || '';

/** Gera um Bearer JWT HS256 com role=service_role para o Realtime */
function generateRealtimeJwt(): string {
  function b64url(str: string) {
    return Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ role: 'service_role', iat: now, exp: now + 3600 }));
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${payload}.${sig}`;
}

interface BroadcastMessage {
  topic: string;
  event: string;
  payload: Record<string, unknown>;
}

/**
 * Envia eventos broadcast diretamente ao Realtime via HTTP interno.
 * Falha silenciosamente — o cliente tem polling de 10s como fallback.
 */
export async function realtimeBroadcast(messages: BroadcastMessage[]): Promise<void> {
  try {
    const jwt = generateRealtimeJwt();
    const body = JSON.stringify({ messages });
    const res = await fetch(`${REALTIME_INTERNAL_URL}/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body,
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[realtimeBroadcast] HTTP ${res.status}: ${text}`);
    }
  } catch (err: any) {
    console.warn('[realtimeBroadcast] Error:', err?.message || err);
  }
}

/**
 * Atalho para enviar um único evento a um canal de mensagens de conversa.
 * O prefix 'realtime:' é obrigatório para canais broadcast do Realtime.
 */
export async function broadcastToChatChannel(
  conversationId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  return realtimeBroadcast([{
    topic: `realtime:messages:${conversationId}`,
    event,
    payload: { ...payload, type: 'broadcast', event },
  }]);
}
