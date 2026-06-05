import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Função utilitária para sincronizar o progresso da meta de leitura do ano atual.
 */
async function syncReadingGoal(userId: string) {
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01T00:00:00.000Z`;
  const endDate = `${currentYear}-12-31T23:59:59.999Z`;

  // 1. Conta os livros lidos no ano atual
  const { count, error: countError } = await supabaseAdmin
    .from('user_bookshelf')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'read')
    .gte('updated_at', startDate)
    .lte('updated_at', endDate);

  if (countError) {
    console.error('[Bookshelf Sync] Erro na contagem:', countError);
    return;
  }

  const currentBooks = count ?? 0;

  // 2. Busca a meta existente ou cria uma nova com valor padrão
  const { data: goal } = await supabaseAdmin
    .from('reading_goals')
    .select('target_books')
    .eq('user_id', userId)
    .eq('goal_year', currentYear)
    .maybeSingle();

  const targetBooks = goal?.target_books ?? 12;

  // 3. Salva/Atualiza o progresso da meta
  await supabaseAdmin
    .from('reading_goals')
    .upsert({
      user_id: userId,
      goal_year: currentYear,
      target_books: targetBooks,
      current_books: currentBooks,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id, goal_year' });
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { bookId, status } = await request.json(); 

    if (!bookId || !['want_to_read', 'reading', 'read'].includes(status)) {
      return NextResponse.json({ error: 'Status ou Book ID inválidos' }, { status: 400 });
    }
    
    // Insere ou atualiza o status do livro na estante relacional do PostgreSQL
    const { data, error } = await supabaseAdmin
      .from('user_bookshelf')
      .upsert({
        user_id: auth.user.id,
        book_id: bookId,
        status,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, book_id' })
      .select();

    if (error) throw error;

    // Sincroniza a meta de leitura
    await syncReadingGoal(auth.user.id);

    return NextResponse.json({ success: true, item: data[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID não fornecido' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('user_bookshelf')
      .delete()
      .eq('user_id', auth.user.id)
      .eq('book_id', bookId);

    if (error) throw error;

    // Sincroniza a meta de leitura
    await syncReadingGoal(auth.user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

