import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // se houver um `next` param, redireciona para ele após o login, senão para /
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    const isLocalEnv = process.env.NODE_ENV === 'development'
    // Em produção, a variável NEXT_PUBLIC_SUPABASE_URL já aponta pro domínio principal (ex: https://literaconnect.jpdev.uk)
    const baseUrl = isLocalEnv ? origin : process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`)
    } else {
      console.error('[Auth Callback] Erro ao trocar código por sessão:', error)
      return NextResponse.redirect(`${baseUrl}/login?error=auth_failed&reason=${encodeURIComponent(error.message)}`)
    }
  }

  const baseUrl = process.env.NODE_ENV === 'development' ? origin : process.env.NEXT_PUBLIC_SUPABASE_URL
  return NextResponse.redirect(`${baseUrl}/login?error=auth_failed&reason=no_code`)
}
