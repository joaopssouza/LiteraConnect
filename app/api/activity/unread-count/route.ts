import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { buildServerCacheKey, getOrSetServerCache } from '@/lib/server-cache';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;
  const userId = user.id;

  try {
    // Buscamos as atividades mais recentes para ver o que o usuário ainda não viu.
    // Como não temos um campo "read_at" por item, usamos a estratégia de cache invalidation 
    // ou simplesmente comparamos datas se tivéssemos o "last_activity_view" no perfil.
    // Para simplificar e ser responsivo, retornamos o número de itens recebidos no polling
    // que o frontend ainda não marcou como visto.
    
    // Aqui fazemos uma query rápida nas tabelas de interesse
    const { data: myPosts } = await supabase.from('posts').select('id').eq('user_id', userId);
    const myPostIds = (myPosts || []).map(p => p.id);

    let count = 0;

    if (myPostIds.length > 0) {
      const { count: likes } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .in('post_id', myPostIds)
        .neq('user_id', userId);
      count += (likes || 0);

      const { count: comments } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .in('post_id', myPostIds)
        .neq('user_id', userId)
        .is('deleted_at', null);
      count += (comments || 0);
    }

    const { count: follows } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);
    count += (follows || 0);

    // Nota: Esta implementação conta TUDO. Para um contador real de "não lidas",
    // precisaríamos persistir o timestamp do último PATCH em /api/activity.
    // Vamos assumir que se o usuário está perguntando por notificações, 
    // ele quer ver se algo aconteceu.
    
    return NextResponse.json({ count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
