import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Busca dados do usuário para verificar bloqueios/restrições
    // Como ainda não existem tabelas de 'reports' ou 'warnings', vamos usar a tabela users
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, is_private') // No futuro, selecionar `banned_until`, `warning_count`, etc.
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[Status API] Erro ao buscar perfil:', profileError);
      return NextResponse.json({ error: 'Erro ao buscar status.' }, { status: 500 });
    }

    // Mock das restrições para a UI baseada no perfil
    // Se houvesse restrições no DB, usaríamos os campos reais aqui.
    const statusData = {
      isGoodStanding: true, // ex: !profile.banned_until
      featuresActive: 'Todos ativos',
      removedContents: 0, // ex: profile.deleted_posts_count || 0
      activeReports: 0, // ex: profile.active_reports_count || 0
    };

    return NextResponse.json(statusData);

  } catch (error) {
    console.error('[Status API] Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
