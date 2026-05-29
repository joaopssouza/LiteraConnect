import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

interface AuthResult {
  user: User;
  supabase: ReturnType<typeof createServerSupabaseClient>;
}

/**
 * Valida o JWT da requisição e retorna o usuário autenticado.
 * Usa auth.getUser() — nunca confia em dados do client (query string, body).
 * Deve ser chamado no início de qualquer rota protegida.
 *
 * @returns { user, supabase } em caso de sucesso
 * @returns NextResponse 401 se o token for inválido ou ausente
 */
export async function requireAuth(request: Request): Promise<AuthResult | NextResponse> {
  const supabase = createServerSupabaseClient();

  // Extrai e valida o JWT do cookie de sessão — nunca do query string
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return { user, supabase };
}

/**
 * Type guard para checar se o resultado é um NextResponse (erro) ou AuthResult.
 */
export function isAuthError(result: AuthResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
