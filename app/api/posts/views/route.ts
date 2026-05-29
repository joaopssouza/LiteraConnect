import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { incrementPostViews } from '@/lib/redis';

export async function POST(req: Request) {
  // Valida JWT — rejeita tentativas anônimas de inflar views
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    const body = await req.json();
    const { postId, postIds } = body;

    // Suporta tanto o formato antigo (postId) quanto o novo (postIds array)
    const idsToProcess: string[] = Array.isArray(postIds) 
      ? postIds 
      : postId ? [postId] : [];

    if (idsToProcess.length === 0) {
      return NextResponse.json({ error: 'postId ou postIds é obrigatório.' }, { status: 400 });
    }

    // Processa os incrementos no Redis em paralelo
    const results = await Promise.all(
      idsToProcess.map(async (id) => {
        if (typeof id !== 'string') return null;
        try {
          const views = await incrementPostViews(id);
          return { id, views };
        } catch (e) {
          console.warn(`[Views] Falha ao incrementar ID ${id}:`, e);
          return { id, error: true };
        }
      })
    );

    return NextResponse.json({ 
      processed: idsToProcess.length,
      results: results.filter(Boolean) 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao incrementar views batch:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
