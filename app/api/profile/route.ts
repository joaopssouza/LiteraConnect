import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';

// PATCH — atualiza nome, handle e bio do perfil do usuário autenticado
export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;

  try {
    const body = await request.json();
    const rawName = String(body.name || '').trim();
    const rawHandle = String(body.handle || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const rawBio = String(body.bio || '').trim();

    if (!rawName) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    if (rawName.length > 40)
      return NextResponse.json({ error: 'Nome excede 40 caracteres.' }, { status: 400 });
    if (!rawHandle || rawHandle.length < 2)
      return NextResponse.json({ error: '@handle precisa ter ao menos 2 caracteres.' }, { status: 400 });
    if (rawHandle.length > 10)
      return NextResponse.json({ error: '@handle excede 10 caracteres.' }, { status: 400 });
    if (rawBio.length > 350)
      return NextResponse.json({ error: 'Bio excede 350 caracteres.' }, { status: 400 });

    // Verifica unicidade do handle (exceto o próprio usuário)
    const { data: conflict } = await supabase
      .from('users')
      .select('id')
      .eq('handle', rawHandle)
      .neq('id', user.id)
      .maybeSingle();

    if (conflict) return NextResponse.json({ error: 'Esse @handle já está em uso.' }, { status: 409 });

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ name: rawName, handle: rawHandle, bio: rawBio || null })
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ user: updatedUser });
  } catch (err: any) {
    console.error('Profile PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

// PUT — atualiza avatar_url do usuário autenticado
export async function PUT(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;

  try {
    const { avatar_url } = await request.json();
    if (!avatar_url || typeof avatar_url !== 'string')
      return NextResponse.json({ error: 'avatar_url é obrigatório.' }, { status: 400 });

    const { data, error } = await supabase
      .from('users')
      .update({ avatar_url })
      .eq('id', user.id)
      .select('id, avatar_url')
      .single();

    if (error) throw error;
    return NextResponse.json({ user: data });
  } catch (err: any) {
    console.error('Avatar PUT error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
