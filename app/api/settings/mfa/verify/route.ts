import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/settings/mfa/verify
 * Verifica o código TOTP e ativa o fator MFA.
 * Body: { factorId: string, code: string }
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { factorId, code } = await request.json();

    if (!factorId || !code) {
      return NextResponse.json(
        { error: 'factorId e code são obrigatórios.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Cria um challenge para o factor
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError) throw challengeError;

    // Verifica o código com o challenge
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[MFA Verify] Erro:', err);
    return NextResponse.json(
      { error: err.message || 'Código inválido. Tente novamente.' },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/settings/mfa/verify
 * Remove (unenroll) um fator MFA existente.
 * Body: { factorId: string }
 */
export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { factorId } = await request.json();
    if (!factorId) {
      return NextResponse.json({ error: 'factorId é obrigatório.' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[MFA Unenroll] Erro:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao remover 2FA.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/settings/mfa/verify
 * Lista os fatores MFA ativos do usuário.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;

    return NextResponse.json({
      factors: data.totp || [],
      hasMfa: (data.totp || []).some((f) => f.status === 'verified'),
    });
  } catch (err: any) {
    console.error('[MFA List] Erro:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao listar fatores MFA.' },
      { status: 500 }
    );
  }
}
