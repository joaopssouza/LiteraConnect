'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function DraftsClient() {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchDrafts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('id, content, created_at, scheduled_at, visibility')
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });
      if (!error) setDrafts(data || []);
      setLoading(false);
    };
    fetchDrafts();
  }, [user]);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4 text-[var(--text-main)]">Meus Rascunhos</h1>
      {loading && <p className="text-[var(--text-main)]/60">Carregando...</p>}
      {!loading && drafts.length === 0 && <p className="text-[var(--text-main)]/60">Nenhum rascunho encontrado.</p>}
      <ul className="space-y-4">
        {drafts.map((draft) => (
          <li key={draft.id} className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)]">
            <div className="text-xs text-[var(--text-main)]/60 mb-1">Criado em: {new Date(draft.created_at).toLocaleString()}</div>
            <div className="line-clamp-2 text-[var(--text-main)] mb-2" dangerouslySetInnerHTML={{ __html: draft.content }} />
            <div className="flex gap-4 text-sm text-[var(--text-main)]/60">
              <Link href={`/post/edit/${draft.id}`} className="text-brand-3 hover:underline">Editar</Link>
              {draft.scheduled_at && <span>Agendado para: {new Date(draft.scheduled_at).toLocaleString()}</span>}
              <span>Visibilidade: {draft.visibility === 'public' ? 'Público' : 'Não listado'}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
