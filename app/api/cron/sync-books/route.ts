import { NextResponse } from 'next/server';
import { GoogleBooksService } from '@/lib/google-books';

// Array de categorias mais populares para manter em cache local no Onboarding
const POPULAR_CATEGORIES = [
  'Fiction',
  'Romance',
  'Fantasy',
  'Science Fiction',
  'Thriller',
  'Mystery',
  'Young Adult',
  'Horror',
  'Biography',
  'Self-Help'
];

export async function POST(request: Request) {
  try {
    // 1. Verificação de Segurança (Machine-to-Machine Auth)
    // Usado pelo Ofelia (Docker) ou Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Executar a sincronização das categorias (Upsert no Mongo + Cache no Redis)
    console.log('[Cron Sync] Iniciando sincronização do Google Books...');
    
    const results = [];
    for (const category of POPULAR_CATEGORIES) {
      try {
        await GoogleBooksService.syncCategoryCatalog(category);
        results.push({ category, status: 'success' });
      } catch (err) {
        console.error(`[Cron Sync] Falha ao sincronizar a categoria ${category}`, err);
        results.push({ category, status: 'error', message: err instanceof Error ? err.message : 'Unknown' });
      }
    }

    console.log('[Cron Sync] Sincronização concluída.');

    return NextResponse.json({
      message: 'Sincronização do catálogo local finalizada.',
      results
    });
  } catch (error: any) {
    console.error('[Cron Sync] Falha crítica:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
