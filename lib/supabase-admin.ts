import { createClient } from '@supabase/supabase-js';

// Cliente Supabase que roda as queries ignorando as regras de RLS e validações do usuário común
// O Service Role Key NUNCA deve chegar ao frontend (Next.js client-side). Utilize apenas nas API Routes ou Server Actions.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
