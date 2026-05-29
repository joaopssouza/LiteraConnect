import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { incrementPostViews, invalidateFeedCache } from '@/lib/redis';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;

  try {
    const body = await req.json();
    const { draftId, visibility, scheduledAt } = body;

    if (!draftId) {
      return NextResponse.json({ error: 'draftId é obrigatório.' }, { status: 400 });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db('literaconnect');

    // 1. Busca o rascunho completo no MongoDB, garantindo propriedade
    const draft = await db
      .collection('drafts')
      .findOne({ _id: new ObjectId(draftId), author_id: user.id });

    if (!draft) {
      return NextResponse.json({ error: 'Rascunho não encontrado ou sem permissão.' }, { status: 404 });
    }

    // 2. Persiste metadados no Supabase (indexação, feed, RLS)
    const { data: postRef, error: pgError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        // Snippet para preview no feed (primeiros 500 chars do conteúdo limpo)
        content: draft.content?.replace(/<[^>]*>/g, '').slice(0, 500) || '',
        book_title: draft.title || null,
        status: 'published',
        visibility: visibility || draft.visibility || 'public',
        scheduled_at: scheduledAt || null,
        mongo_document_id: draft._id.toString(),
      })
      .select('id')
      .single();

    if (pgError || !postRef) {
      console.error('Erro ao inserir post no Supabase:', pgError);
      return NextResponse.json({ error: 'Falha ao publicar no feed.' }, { status: 500 });
    }

    // 3. Move o draft para a coleção post_contents no MongoDB
    await db.collection('post_contents').insertOne({
      supabase_post_id: postRef.id,
      author_id: user.id,
      title: draft.title,
      content: draft.content, // Conteúdo TipTap completo (HTML/JSON)
      visibility: visibility || draft.visibility || 'public',
      published_at: new Date(),
    });

    // 4. Atualiza status do draft original → 'published'
    await db.collection('drafts').updateOne(
      { _id: draft._id },
      { $set: { status: 'published', supabase_post_id: postRef.id, updated_at: new Date() } }
    );

    // 5. Inicializa contador de views no Redis (INCR, não HLL)
    await incrementPostViews(postRef.id).catch((e) =>
      console.warn('Redis view init error (non-critical):', e)
    );

    // 6. Invalida cache do feed para o post aparecer imediatamente
    await invalidateFeedCache(user.id).catch((e) =>
      console.warn('Redis cache invalidation error (non-critical):', e)
    );

    return NextResponse.json({ success: true, postId: postRef.id }, { status: 200 });
  } catch (error: any) {
    console.error('Error publishing post:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
