import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/settings/mfa/enroll
 * Inicia o processo de enroll de MFA TOTP.
 * Retorna: { id, totp: { qr_code, secret } }
 * O cliente deve exibir o QR Code para o usuário escanear.
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'LiteraConnect',
    });

    if (error) throw error;

    return NextResponse.json({
      id: data.id,
      totp: {
        qr_code: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      },
    });
  } catch (err: any) {
    console.error('[MFA Enroll] Erro:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao iniciar configuração do 2FA.' },
      { status: 500 }
    );
  }
}
