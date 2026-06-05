import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import clientPromise from '@/lib/mongodb';
import { BookCatalogEntry } from '@/lib/google-books';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const user = auth.user;

    const { data: prefs, error } = await supabaseAdmin
      .from('user_preferences')
      .select('favorite_categories, favorite_books')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    const categories = prefs?.favorite_categories || [];
    const bookIds = prefs?.favorite_books || [];
    let favoriteBooksDetails: any[] = [];

    if (bookIds.length > 0) {
      try {
        const mongoClient = await clientPromise;
        const db = mongoClient.db(process.env.MONGODB_DB || 'literaconnect');
        const collection = db.collection<BookCatalogEntry>('books_catalog');
        favoriteBooksDetails = await collection.find({
          _id: { $in: bookIds }
        }).toArray();
      } catch (mongoErr) {
        console.error('[API Onboarding GET] Erro ao buscar detalhes no MongoDB:', mongoErr);
      }
    }

    return NextResponse.json({
      categories,
      bookIds,
      favoriteBooks: favoriteBooksDetails
    });
  } catch (error: any) {
    console.error('[API Onboarding GET Error]', error);
    return NextResponse.json({ error: error.message, details: error.details, code: error.code }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const user = auth.user;
    const body = await request.json();
    const { categories, bookIds } = body;

    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json({ error: 'Payload de preferências inválido' }, { status: 400 });
    }

    // Persistência segura usando Admin Client (bypass RLS apenas para escrita sistêmica de setup,
    // ou depender do RLS usando o client normal. Neste caso admin garante sucesso na infra self-hosted).
    const { error } = await supabaseAdmin
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        favorite_categories: categories,
        favorite_books: bookIds || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw error;

    // Define cookie indicativo para otimização de Middleware
    const cookieStore = await cookies();
    cookieStore.set('has_completed_onboarding', 'true', { path: '/', maxAge: 60 * 60 * 24 * 365 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Onboarding Error]', error);
    return NextResponse.json({ error: error.message, details: error.details, code: error.code }, { status: 500 });
  }
}
