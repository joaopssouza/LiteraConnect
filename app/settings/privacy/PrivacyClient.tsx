'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';

interface BlockedUser {
  id: string;
  name: string;
  handle: string;
  avatar_url: string;
}

export default function PrivacyClient() {
  const [isPrivate, setIsPrivate] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [hiddenPostsCount, setHiddenPostsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchPrivacyData();
  }, []);

  const fetchPrivacyData = async () => {
    try {
      const res = await fetch('/api/settings/privacy');
      if (!res.ok) throw new Error('Falha ao carregar configurações de privacidade.');
      const data = await res.json();
      setIsPrivate(data.is_private);
      setBlockedUsers(data.blocked_users || []);
      setHiddenPostsCount(data.hiddenPostsCount || 0);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível carregar as configurações de privacidade.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePrivate = async () => {
    setUpdating(true);
    const newValue = !isPrivate;
    try {
      const res = await fetch('/api/settings/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_private: newValue }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar perfil');
      setIsPrivate(newValue);
      toast.success(newValue ? 'Perfil definido como privado.' : 'Perfil definido como público.');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar privacidade do perfil.');
    } finally {
      setUpdating(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      const res = await fetch(`/api/settings/privacy/blocks/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Falha ao desbloquear usuário');
      
      setBlockedUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('Usuário desbloqueado com sucesso.');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao desbloquear usuário.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-xl animate-pulse">
        <div className="h-8 bg-[var(--border)] rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-[var(--border)] rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Privacidade</h2>
        <p className="text-[var(--text-main)]/60">Controle quem vê o que e suas restrições de comunidade.</p>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-[var(--text-main)]">Perfil Privado</h3>
            </div>
            <p className="text-sm text-[var(--text-main)]/60">Somente seus seguidores. Suas resenhas não aparecerão em Explorar.</p>
          </div>
          <button
            onClick={handleTogglePrivate}
            disabled={updating}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              isPrivate ? 'bg-brand-1' : 'bg-[var(--border)]'
            } ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isPrivate ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <hr className="border-[var(--border)]" />

        <div className="space-y-4">
           <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-[var(--text-main)]">Usuários Bloqueados</h3>
          </div>
          <p className="text-sm text-[var(--text-main)]/60">
            Você não receberá notificações de pessoas que bloqueou, e elas não poderão ver suas resenhas ou enviar mensagens.
          </p>
          
          {blockedUsers.length === 0 ? (
            <div className="p-4 border border-[var(--border)] rounded-xl text-center text-sm text-[var(--text-main)]/40 bg-[var(--bg-main)]">
              Nenhum usuário bloqueado no momento.
            </div>
          ) : (
            <div className="space-y-3">
              {blockedUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 border border-[var(--border)] rounded-xl bg-[var(--bg-main)]">
                  <div className="flex items-center gap-3">
                    <Image
                      src={user.avatar_url || '/default-avatar.png'}
                      alt={user.name}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-sm text-[var(--text-main)]">{user.name}</p>
                      <p className="text-xs text-[var(--text-main)]/60">@{user.handle}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblock(user.id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--border)] hover:bg-[var(--border-hover)] transition-colors text-[var(--text-main)]"
                  >
                    Desbloquear
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr className="border-[var(--border)]" />

        <div className="space-y-4">
           <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-[var(--text-main)]">Posts Ocultos</h3>
            <span className="text-[10px] bg-brand-2/10 text-brand-2 px-2 py-0.5 rounded-full font-bold uppercase">Em breve</span>
          </div>
          <p className="text-sm text-[var(--text-main)]/60">Você ocultou <strong>{hiddenPostsCount}</strong> posts do seu feed.</p>
          <button disabled className="text-sm px-4 py-2 bg-[var(--border)] text-[var(--text-main)]/60 rounded-xl cursor-not-allowed w-full font-medium">
            Gerenciar Posts Ocultos
          </button>
        </div>

      </div>
    </div>
  );
}
