import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import clientPromise from '@/lib/mongodb';
import { BookCatalogEntry } from '@/lib/google-books';

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const userId = (await params).userId;
    if (!userId) {
      return NextResponse.json({ error: 'User ID não fornecido' }, { status: 400 });
    }

    const supabase = supabaseAdmin;

    // 1. Busca os IDs e status no PostgreSQL (Supabase)
    const { data: bookshelfItems, error } = await supabase
      .from('user_bookshelf')
      .select('book_id, status, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    if (!bookshelfItems || bookshelfItems.length === 0) {
      return NextResponse.json({ want_to_read: [], reading: [], read: [] });
    }

    const bookIds = bookshelfItems.map((item: any) => item.book_id);

    // 2. Busca os metadados ricos no MongoDB
    const mongoClient = await clientPromise;
    const db = mongoClient.db(process.env.MONGODB_DB || 'literaconnect');
    const collection = db.collection<BookCatalogEntry>('books_catalog');

    const books = await collection.find({ _id: { $in: bookIds } }).toArray();
    const booksMap = new Map(books.map(b => [b._id, b]));

    // 3. Mescla e Agrupa
    const result: any = {
      want_to_read: [],
      reading: [],
      read: []
    };

    for (const item of bookshelfItems) {
      const bookData = booksMap.get(item.book_id);
      if (bookData) {
        result[item.status].push({
          id: item.book_id,
          status: item.status,
          updated_at: item.updated_at,
          title: bookData.title,
          authors: bookData.authors,
          thumbnail: bookData.thumbnail,
          description: bookData.description,
          categories: bookData.categories,
          pageCount: bookData.pageCount,
          publishedDate: bookData.publishedDate,
          isbn: bookData.isbn
        });
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Bookshelf GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
