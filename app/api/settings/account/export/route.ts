import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import clientPromise from '@/lib/mongodb';

export const maxDuration = 60; // Pode levar um tempinho extra para montar o JSON

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { user } = auth;
    const userId = user.id;

    const exportData: Record<string, any> = {
      generated_at: new Date().toISOString(),
      user_id: userId,
      status: 'success',
      data: {}
    };

    // 1. Coleta dados do PostgreSQL
    const { data: profile } = await supabaseAdmin.from('users').select('*').eq('id', userId).single();
    exportData.data.profile = profile || {};

    const { data: postsMetadata } = await supabaseAdmin.from('posts').select('*').eq('user_id', userId);
    exportData.data.posts = postsMetadata || [];

    const { data: comments } = await supabaseAdmin.from('comments').select('*').eq('user_id', userId);
    exportData.data.comments = comments || [];

    const { data: follows } = await supabaseAdmin.from('follows').select('*').eq('follower_id', userId);
    exportData.data.following = follows || [];

    // 2. Coleta dados do MongoDB
    try {
      const client = await clientPromise;
      const db = client.db('literaconnect');

      const drafts = await db.collection('drafts').find({ author_id: userId }).toArray();
      const postContents = await db.collection('post_contents').find({ author_id: userId }).toArray();
      const activities = await db.collection('activity_logs').find({ actor_id: userId }).toArray();

      exportData.data.drafts = drafts;
      exportData.data.post_contents = postContents;
      exportData.data.activity_logs = activities;
      
    } catch (mongoError) {
      console.error('Erro ao exportar MongoDB:', mongoError);
      exportData.data.mongodb_error = 'Alguns dados ricos podem não estar incluídos devido a falha temporária.';
    }

    // Como é um arquivo JSON sendo baixado, vamos ajustar os headers
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="literaconnect-export-${userId}.json"`,
      },
    });

  } catch (error: any) {
    if (error.message === 'Não autorizado') {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }
    console.error('Erro ao exportar dados:', error);
    return NextResponse.json(
      { error: 'Um erro inesperado ocorreu ao exportar seus dados.' },
      { status: 500 }
    );
  }
}
