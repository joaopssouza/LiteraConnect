import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// Middleware principal
// Ordem de execução:
//   [1] Validação JWT Supabase (sessão da aplicação)
// ─────────────────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {

  // ── Configuração base da resposta e cliente Supabase ─────────────────────
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── [1] Validar JWT Supabase no servidor ─────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();

  // ── [2] Interceptação de Onboarding (Fase 7) ─────────────────────────────
  if (user) {
    let hasCompletedOnboarding = request.cookies.has('has_completed_onboarding');
    const pathname = request.nextUrl.pathname;

    const isPublicOrApi = pathname.startsWith('/login') || pathname.startsWith('/auth') || pathname.startsWith('/api') || pathname.startsWith('/_next');
    
    if (!hasCompletedOnboarding && !isPublicOrApi && pathname !== '/onboarding') {
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefs) {
        hasCompletedOnboarding = true;
        response.cookies.set('has_completed_onboarding', 'true', { path: '/', maxAge: 60 * 60 * 24 * 365 });
      } else {
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        return NextResponse.redirect(url);
      }
    }
    
    if (hasCompletedOnboarding && pathname === '/onboarding') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // ── [3] Headers de Segurança Genéricos (Helmet-like) ───────────────────
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|__nextjs_original-stack-frames|favicon.ico|public|api/avatar|api/internal/security|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
