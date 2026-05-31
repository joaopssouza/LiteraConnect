
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);



async function deleteSupabaseMedia(url: string) {
  try {
    // A URL pública é do tipo: https://.../storage/v1/object/public/media/uploads/filename.ext
    const marker = '/storage/v1/object/public/media/';
    if (!url.includes(marker)) return;
    
    const filePath = url.split(marker)[1];
    if (!filePath) return;

    await supabaseAdmin.storage.from('media').remove([filePath]);
  } catch (e) {
    console.error('[Supabase Storage] Erro ao deletar mídia:', e);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Usuário inválido' }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const postId = resolvedParams.id;

    // Buscar o post para verificar a propriedade e obter a URL da mídia
    const { data: post, error: fetchError } = await supabaseAdmin
      .from('posts')
      .select('user_id, book_cover_url, video_url')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
    }

    if (post.user_id !== user.id) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    // Excluir mídias
    const mediaUrls = [post.book_cover_url, post.video_url].filter(Boolean);
    
    for (const mediaUrl of mediaUrls) {
      if (mediaUrl.includes('/storage/v1/object/public/media/')) {
        await deleteSupabaseMedia(mediaUrl);
      }
    }

    // Excluir o post do banco de dados
    const { error: deleteError } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
