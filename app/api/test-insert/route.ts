import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000', // invalid uuid, will fail FK
      content: 'test',
      status: 'published',
      visibility: 'public',
    })
    .select();

  return NextResponse.json({ error, data });
}
