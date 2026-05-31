import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import clientPromise from '@/lib/mongodb';

export const maxDuration = 60; // Dando mais tempo caso a deleção encadeada demore

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { user } = auth;
    
    // Verificação dupla se a Service Role Key está configurada
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
       console.error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
       return NextResponse.json(
        { error: 'Serviço indisponível. Contate o suporte técnico.' },
        { status: 501 }
      );
    }

    const userId = user.id;

    // 1. Limpeza no MongoDB (Drafts, Activities, Post Contents)
    try {
      const client = await clientPromise;
      const db = client.db('literaconnect');

      // Deletar drafts do usuário
      await db.collection('drafts').deleteMany({ author_id: userId });

      // Deletar conteúdos formatados dos posts
      await db.collection('post_contents').deleteMany({ author_id: userId });

      // Deletar activity logs (como subject_id para não quebrar referências, ou como actor_id)
      await db.collection('activity_logs').deleteMany({ 
        $or: [
          { actor_id: userId },
          { subject_id: userId }
        ]
      });
    } catch (mongoError) {
      console.error('Erro ao deletar dados do MongoDB:', mongoError);
      // Podemos optar por continuar ou parar. No caso de exclusão lógica/física, vamos continuar.
    }

    // 2. Deleção Física no Supabase Auth + Cascade no Public (se configurado ON DELETE CASCADE).
    // O auth.admin.deleteUser(id) remove o registro da auth.users.
    // Presumindo que public.users (e posts, conversas) tem FK referenciando auth.users com ON DELETE CASCADE.
    // Caso não tenha, adicionamos na mão uma chamada antes para garantir:
    await supabaseAdmin.from('users').delete().eq('id', userId);

    // Agora apagamos o cadastro principal de Auth
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Erro ao deletar auth user:', deleteAuthError);
      return NextResponse.json(
        { error: 'Não foi possível excluir o login permanentemente: ' + deleteAuthError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Conta e dados vinculados foram excluídos com sucesso.' });
  } catch (error: any) {
    if (error.message === 'Não autorizado') {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }
    console.error('Erro geral ao excluir conta:', error);
    return NextResponse.json(
      { error: 'Um erro inesperado ocorreu. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}
