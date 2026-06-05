import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { user, supabase } = auth;

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      return NextResponse.json({ error: 'Erro ao buscar chamados.' }, { status: 500 });
    }

    return NextResponse.json({ tickets: data });
  } catch (error: any) {
    console.error('Tickets GET error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { user, supabase } = auth;

    const body = await request.json();
    const { title, description } = body;

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'Título e descrição são obrigatórios.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .insert([{
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        status: 'Em análise'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      return NextResponse.json({ error: 'Erro ao criar chamado.' }, { status: 500 });
    }

    return NextResponse.json({ ticket: data }, { status: 201 });
  } catch (error: any) {
    console.error('Tickets POST error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
