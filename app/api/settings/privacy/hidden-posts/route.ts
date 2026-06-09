import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth, isAuthError } from '@/lib/auth-utils';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { user } = auth;

    // Fetch hidden posts details
    const { data, error } = await supabaseAdmin
      .from('hidden_posts')
      .select(`
        post_id,
        created_at,
        posts:post_id (
          id,
          content,
          book_title,
          users:user_id (
            name,
            handle,
            avatar_url
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching hidden posts:', error);
      return NextResponse.json({ error: 'Erro ao buscar posts ocultos' }, { status: 500 });
    }

    const hiddenPosts = data.map((item: any) => ({
      id: item.post_id,
      content: item.posts?.content,
      book_title: item.posts?.book_title,
      hidden_at: item.created_at,
      author: {
        name: item.posts?.users?.name,
        handle: item.posts?.users?.handle,
        avatar_url: item.posts?.users?.avatar_url,
      }
    }));

    return NextResponse.json({ hiddenPosts });
  } catch (error: any) {
    console.error('Hidden posts GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    );
  }
}
