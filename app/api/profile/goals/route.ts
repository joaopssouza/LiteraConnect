import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/profile/goals
 * Retorna a meta de leitura do usuário para o ano atual.
 * Se não existir, calcula a contagem real de livros lidos no ano e cria uma meta padrão (12 livros).
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const userId = auth.user.id;
    const currentYear = new Date().getFullYear();

    // 1. Busca a meta do ano atual no PostgreSQL
    const { data: goal, error: fetchError } = await supabaseAdmin
      .from('reading_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('goal_year', currentYear)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (goal) {
      return NextResponse.json({ goal });
    }

    // 2. Se não existir, calcula o progresso real atual
    const startDate = `${currentYear}-01-01T00:00:00.000Z`;
    const endDate = `${currentYear}-12-31T23:59:59.999Z`;

    const { count, error: countError } = await supabaseAdmin
      .from('user_bookshelf')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'read')
      .gte('updated_at', startDate)
      .lte('updated_at', endDate);

    if (countError) throw countError;

    const currentBooks = count ?? 0;
    const targetBooks = 12; // Meta padrão recomendada

    // 3. Cria a meta no PostgreSQL
    const { data: newGoal, error: insertError } = await supabaseAdmin
      .from('reading_goals')
      .insert({
        user_id: userId,
        goal_year: currentYear,
        target_books: targetBooks,
        current_books: currentBooks,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ goal: newGoal });
  } catch (error: any) {
    console.error('[Goals GET] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/profile/goals
 * Atualiza o objetivo (target_books) da meta anual de leitura.
 */
export async function PUT(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const userId = auth.user.id;
    const currentYear = new Date().getFullYear();

    const body = await request.json();
    const { targetBooks } = body;

    const parsedTarget = parseInt(targetBooks, 10);
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      return NextResponse.json({ error: 'Meta de livros inválida' }, { status: 400 });
    }

    // Realiza o upsert da meta de leitura no PostgreSQL
    const { data: updatedGoal, error } = await supabaseAdmin
      .from('reading_goals')
      .upsert({
        user_id: userId,
        goal_year: currentYear,
        target_books: parsedTarget,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, goal_year' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ goal: updatedGoal });
  } catch (error: any) {
    console.error('[Goals PUT] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
