import { NextResponse } from 'next/server';
import { connectRedis } from '@/lib/redis';
import { createClient } from '@supabase/supabase-js';

// Remove global client instantiation to avoid build errors if env vars are missing
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    // Lê o valor persistido no banco
    const { data } = await supabaseAdmin
      .from('posts')
      .select('views_count')
      .eq('id', id)
      .single();

    const dbViews = data?.views_count ?? 0;

    // Lê o contador em tempo real do Redis
    let redisViews = 0;
    try {
      const redis = await connectRedis();
      if (redis.isOpen) {
        const val = await redis.get(`post:${id}:views`);
        redisViews = val ? Number(val) : 0;
      }
    } catch {
      // Redis indisponível — retorna só o banco
    }

    const views = Math.max(dbViews, redisViews);
    return NextResponse.json({ views });
  } catch (e: any) {
    return NextResponse.json({ views: 0 });
  }
}
