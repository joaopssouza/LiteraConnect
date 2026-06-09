import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import clientPromise from '@/lib/mongodb';
import { GoogleBooksService, BookCatalogEntry } from '@/lib/google-books';
import { connectRedis } from '@/lib/redis';

export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const categoriesParam = searchParams.get('categories') || searchParams.get('category');
    const attempt = parseInt(searchParams.get('attempt') || '0', 10);

    if (!categoriesParam) {
      return NextResponse.json({ error: 'Categorias não fornecidas' }, { status: 400 });
    }

    const categoriesList = categoriesParam.split(',').map(c => c.trim()).filter(Boolean);
    const selectedCats = categoriesList.slice(0, 3); // Limita a 3 para evitar sobrecarga na API

    let allBooks: BookCatalogEntry[] = [];

    await Promise.all(selectedCats.map(async (category) => {
      let books: BookCatalogEntry[] = [];
      const cacheKey = `onboarding:category:${category.toLowerCase()}`;

      if (attempt > 0) {
        try {
          const startIndex = attempt * 15;
          const externalResults = await GoogleBooksService.fetchPopularByCategory(category, 20, startIndex);
          if (externalResults.length > 0) {
            const mongoClient = await clientPromise;
            const db = mongoClient.db(process.env.MONGODB_DB || 'literaconnect');
            const collection = db.collection<BookCatalogEntry>('books_catalog');
            
            const bulkOps = externalResults.map(book => ({
              updateOne: { filter: { _id: book._id }, update: { $set: book }, upsert: true }
            }));
            await collection.bulkWrite(bulkOps, { ordered: false });
            books = externalResults;
          }
        } catch (err) {
          console.error(`Erro ao buscar dados paginados para ${category}:`, err);
        }
      } else {
        try {
          const redis = await connectRedis();
          if (redis.isOpen) {
            const cached = await redis.get(cacheKey);
            if (cached) books = JSON.parse(cached);
          }
        } catch (err) { }

        if (books.length === 0) {
          try {
            const mongoClient = await clientPromise;
            const db = mongoClient.db(process.env.MONGODB_DB || 'literaconnect');
            const collection = db.collection<BookCatalogEntry>('books_catalog');
            const regex = new RegExp(category, 'i');
            books = await collection.find({ categories: regex }).toArray();
          } catch (err) { }
        }

        if (books.length < 5) {
          try {
            const externalResults = await GoogleBooksService.fetchPopularByCategory(category, 20, 0);
            if (externalResults.length > 0) {
              const mongoClient = await clientPromise;
              const db = mongoClient.db(process.env.MONGODB_DB || 'literaconnect');
              const collection = db.collection<BookCatalogEntry>('books_catalog');
              
              const bulkOps = externalResults.map(book => ({
                updateOne: { filter: { _id: book._id }, update: { $set: book }, upsert: true }
              }));
              await collection.bulkWrite(bulkOps, { ordered: false });
              
              const redis = await connectRedis();
              if (redis.isOpen) {
                await redis.set(cacheKey, JSON.stringify(externalResults.slice(0, 15)), { EX: 60 * 60 * 24 * 7 });
              }
              books = externalResults;
            }
          } catch (err) { }
        }
      }
      allBooks.push(...books);
    }));

    // Deduplicate
    const uniqueMap = new Map<string, BookCatalogEntry>();
    allBooks.forEach(b => uniqueMap.set(b._id, b));
    const uniqueBooks = Array.from(uniqueMap.values());

    // Filtra e ordena
    const filteredAndSorted = uniqueBooks
      .filter(book => book.language?.toLowerCase().startsWith('pt'))
      .sort((a, b) => (b.ratingsCount || 0) - (a.ratingsCount || 0));

    // Embaralha levemente o top 30 e pega 16 para não ser sempre os mesmos
    const topBooks = filteredAndSorted.slice(0, 30);
    const shuffled = topBooks.sort(() => 0.5 - Math.random());

    return NextResponse.json({ results: shuffled.slice(0, 16) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
