import { createBrowserClient } from '@supabase/ssr';

declare global {
  interface Window {
    __LITERA_SUPABASE__?: {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };
  }
}

const runtimeConfig = typeof window !== 'undefined' ? window.__LITERA_SUPABASE__ : undefined;
const rawUrl = runtimeConfig?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseUrl = rawUrl && rawUrl.startsWith('http') ? rawUrl : rawUrl ? `https://${rawUrl}` : undefined;
const supabaseAnonKey = runtimeConfig?.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase credentials are missing. Check NEXT_PUBLIC_SUPABASE_URL (with protocol) and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

