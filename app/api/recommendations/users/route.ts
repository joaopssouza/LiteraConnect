import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { connectRedis } from '@/lib/redis';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const userId = auth.user.id;
    
    // 1. Orquestração com Redis (Velocidade Sub-milissegundo)
    const redis = await connectRedis();
    const cacheKey = `matchmaking:${userId}`;
    if (redis.isOpen) {
      const cachedMatch = await redis.get(cacheKey);
      if (cachedMatch) return NextResponse.json(JSON.parse(cachedMatch as string));
    }

    // 2. Fallback de Algoritmo Relacional (Processamento sob demanda)
    const supabase = supabaseAdmin;
    
    // Resgata os vetores de interesses do aluno logado
    const { data: myPrefs } = await supabase
      .from('user_preferences')
      .select('favorite_categories, favorite_books')
      .eq('user_id', userId)
      .single();

    if (!myPrefs || !myPrefs.favorite_categories?.length) {
      return NextResponse.json({ recommendations: [] });
    }

    // Cruza via operador lógico ARRAY OVERLAP (&&) do PostgreSQL
    // Busca usuários com pelo menos um gosto literário em comum
    const { data: matches, error } = await supabase
      .from('user_preferences')
      .select('user_id, favorite_categories, users(id, name, handle, avatar_url)')
      .neq('user_id', userId)
      .overlaps('favorite_categories', myPrefs.favorite_categories)
      .limit(15);

    if (error) throw error;

    // Calcula o "Score" do Match (Soma matemática de similaridades)
    const results = (matches || []).map((m: any) => {
      const common_categories = m.favorite_categories.filter((c: string) => myPrefs.favorite_categories.includes(c));
      return {
        user: m.users,
        common_categories,
        match_score: common_categories.length * 10 // Ponderação base
      };
    }).sort((a: any, b: any) => b.match_score - a.match_score); // Do maior para o menor match

    const responseData = { recommendations: results };

    // 3. Cacheamento do Lote Resultante para preservar o Banco de Dados
    if (redis.isOpen) {
      await redis.set(cacheKey, JSON.stringify(responseData), { EX: 60 * 60 * 24 }); // TTL 24 horas
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

