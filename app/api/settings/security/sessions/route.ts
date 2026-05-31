import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { supabase } = auth;

    // Busca as sessões utilizando uma RPC criada no Supabase 
    // (A função busca em auth.sessions e filtra via auth.uid())
    const { data: sessions, error } = await supabase
      .rpc('get_user_sessions');

    if (error) {
      console.error('Error fetching user sessions:', error);
      return NextResponse.json({ error: 'Erro ao buscar sessões ativas' }, { status: 500 });
    }

    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error('Security Sessions GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    );
  }
}
