import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import clientPromise from '@/lib/mongodb';
import { GoogleBooksService, BookCatalogEntry } from '@/lib/google-books';

export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db(process.env.MONGODB_DB || 'literaconnect');
    const collection = db.collection<BookCatalogEntry>('books_catalog');

    // 1. Busca Local de Alta Performance (MongoDB)
    // O ideal no Mongo é um text index, mas usaremos RegEx em memória para este protótipo
    const regex = new RegExp(q, 'i');
    const localResults = await collection.find({
      $or: [{ title: regex }, { authors: regex }]
    }).limit(10).toArray();

    // Se temos volume de dados no DB local, evitamos bater na rede do Google
    if (localResults.length >= 5) {
      return NextResponse.json({ results: localResults, source: 'local' });
    }

    // 2. Fallback: Busca Externa em Tempo Real (Google Books API)
    const externalResults = await GoogleBooksService.searchBooks(q, 10);
    
    // 3. Estratégia de Cache-Aside: Salva os novos livros assincronamente no MongoDB
    if (externalResults.length > 0) {
      const bulkOps = externalResults.map(book => ({
        updateOne: { filter: { _id: book._id }, update: { $set: book }, upsert: true }
      }));
      // Não damos await no bulkWrite para não atrasar a resposta ao usuário
      collection.bulkWrite(bulkOps, { ordered: false })
        .catch(err => console.error('[Busca Hibrida] Erro no Cache-Aside:', err));
    }

    // Mesclagem inteligente evitando duplicidade
    const merged = [...localResults];
    const localIds = new Set(localResults.map(b => b._id));
    
    for (const ext of externalResults) {
      if (!localIds.has(ext._id)) {
        merged.push(ext);
        localIds.add(ext._id);
      }
    }

    // Ordenação Inteligente
    // Prioridade 1: Semelhança exata com o termo (título ou autor)
    // Prioridade 2: Título ou Autor começando com o termo
    // Prioridade 3: Mais procurados/avaliados (ratingsCount)
    const lowerQ = q.toLowerCase();
    
    merged.sort((a, b) => {
      // 1. Título exato
      const aTitleExact = a.title.toLowerCase() === lowerQ;
      const bTitleExact = b.title.toLowerCase() === lowerQ;
      if (aTitleExact && !bTitleExact) return -1;
      if (!aTitleExact && bTitleExact) return 1;

      // 1.5. Autor exato
      const aAuthorExact = a.authors.some(auth => auth.toLowerCase() === lowerQ);
      const bAuthorExact = b.authors.some(auth => auth.toLowerCase() === lowerQ);
      if (aAuthorExact && !bAuthorExact) return -1;
      if (!aAuthorExact && bAuthorExact) return 1;

      // 2. Título ou autor começando com o termo
      const aStarts = a.title.toLowerCase().startsWith(lowerQ) || a.authors.some(auth => auth.toLowerCase().startsWith(lowerQ));
      const bStarts = b.title.toLowerCase().startsWith(lowerQ) || b.authors.some(auth => auth.toLowerCase().startsWith(lowerQ));
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // 3. Mais avaliados (procurados) - usamos a média e o total de avaliações
      const aPopularity = (a.ratingsCount || 0) + (a.averageRating || 0) * 10;
      const bPopularity = (b.ratingsCount || 0) + (b.averageRating || 0) * 10;
      
      if (bPopularity !== aPopularity) {
        return bPopularity - aPopularity;
      }

      return 0;
    });

    return NextResponse.json({ results: merged.slice(0, 10), source: 'hybrid' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
