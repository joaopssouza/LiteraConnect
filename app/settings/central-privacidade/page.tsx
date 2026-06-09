'use client';

import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';

interface BlockedUser {
  id: string;
  name: string;
  handle: string;
  avatar_url: string;
}

export default function CentralPrivacidadePage() {
  const [isPrivate, setIsPrivate] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [hiddenPostsCount, setHiddenPostsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [hiddenPosts, setHiddenPosts] = useState<any[]>([]);
  const [isHiddenModalOpen, setIsHiddenModalOpen] = useState(false);
  const [loadingHidden, setLoadingHidden] = useState(false);

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

  const handleOpenHiddenPosts = async () => {
    setIsHiddenModalOpen(true);
    setLoadingHidden(true);
    try {
      const res = await fetch('/api/settings/privacy/hidden-posts');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHiddenPosts(data.hiddenPosts || []);
    } catch (e) {
      toast.error('Erro ao carregar posts ocultos');
    } finally {
      setLoadingHidden(false);
    }
  };

  const handleUnhidePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/hide`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setHiddenPosts(prev => prev.filter(p => p.id !== postId));
      setHiddenPostsCount(prev => Math.max(0, prev - 1));
      toast.success('Post reexibido com sucesso');
    } catch (e) {
      toast.error('Erro ao reexibir post');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-xl animate-pulse p-6">
        <div className="h-8 bg-[var(--border-main)] rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-[var(--border-main)] rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-2xl">
      <div className="p-6 border-b border-[var(--border-main)]">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-main)]">
          <ShieldCheck className="w-6 h-6 text-brand-1" />
          Central de Privacidade
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          Gerencie sua privacidade e segurança no LiteraConnect.
        </p>
      </div>

      <div className="p-6 space-y-8">
        
        {/* Controles da Privacidade Original */}
        <div className="bg-[var(--surface)] border border-[var(--border-main)] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-[var(--text-main)]">Perfil Privado</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Somente seus seguidores. Suas resenhas não aparecerão em Explorar.</p>
            </div>
            <button
              onClick={handleTogglePrivate}
              disabled={updating}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isPrivate ? 'bg-brand-1' : 'bg-[var(--border-main)]'
              } ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPrivate ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <hr className="border-[var(--border-main)]" />

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-[var(--text-main)]">Usuários Bloqueados</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Você não receberá notificações de pessoas que bloqueou, e elas não poderão ver suas resenhas ou enviar mensagens.
            </p>
            
            {blockedUsers.length === 0 ? (
              <div className="p-4 border border-[var(--border-main)] rounded-xl text-center text-sm text-[var(--text-secondary)] bg-black/5 dark:bg-white/5">
                Nenhum usuário bloqueado no momento.
              </div>
            ) : (
              <div className="space-y-3">
                {blockedUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 border border-[var(--border-main)] rounded-xl bg-black/5 dark:bg-white/5">
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
                        <p className="text-xs text-[var(--text-secondary)]">@{user.handle}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblock(user.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white dark:bg-zinc-800 border border-[var(--border-main)] hover:border-brand-2 transition-colors text-[var(--text-main)]"
                    >
                      Desbloquear
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-[var(--border-main)]" />

          <div className="space-y-4">
             <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-[var(--text-main)]">Posts Ocultos</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">Você ocultou <strong>{hiddenPostsCount}</strong> posts do seu feed.</p>
            <button 
              onClick={handleOpenHiddenPosts}
              className="text-sm px-4 py-2 bg-black/5 dark:bg-white/5 border border-[var(--border-main)] text-[var(--text-main)] hover:border-brand-2 transition-colors rounded-xl w-full font-medium"
            >
              Gerenciar Posts Ocultos
            </button>
          </div>
        </div>

        {/* Link para Política de Privacidade */}
        <Link 
          href="/privacidade"
          className="flex items-start gap-4 p-4 border border-[var(--border-main)] hover:border-brand-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all group"
        >
          <div className="bg-black/5 dark:bg-white/5 p-3 rounded-full group-hover:bg-brand-1/10 transition-colors">
            <ShieldCheck className="w-6 h-6 text-[var(--text-secondary)] group-hover:text-brand-1 transition-colors" />
          </div>
          <div className="flex-1 mt-0.5">
            <h3 className="font-semibold text-[var(--text-main)] group-hover:text-brand-1 transition-colors">Ler a Política de Privacidade</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Como usamos seus dados e protegemos suas informações.</p>
          </div>
        </Link>
        
      </div>

      {isHiddenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface)] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
              <h2 className="text-xl font-bold">Posts Ocultos</h2>
              <button 
                onClick={() => setIsHiddenModalOpen(false)}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {loadingHidden ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-16 bg-[var(--border-main)] rounded-xl"></div>
                  <div className="h-16 bg-[var(--border-main)] rounded-xl"></div>
                </div>
              ) : hiddenPosts.length === 0 ? (
                <p className="text-center text-[var(--text-secondary)] py-8">Nenhum post oculto.</p>
              ) : (
                <div className="space-y-4">
                  {hiddenPosts.map(post => (
                    <div key={post.id} className="p-4 border border-[var(--border-main)] rounded-xl space-y-3 relative">
                      <div className="flex items-center gap-3">
                        <Image
                          src={post.author.avatar_url || '/default-avatar.png'}
                          alt={post.author.name}
                          width={32}
                          height={32}
                          className="rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm leading-tight">{post.author.name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">@{post.author.handle}</p>
                        </div>
                      </div>
                      <p className="text-sm line-clamp-3 text-[var(--text-secondary)]">{post.content}</p>
                      {post.book_title && (
                        <p className="text-xs font-medium text-brand-2 bg-brand-2/10 inline-block px-2 py-1 rounded-md">
                          📚 {post.book_title}
                        </p>
                      )}
                      <button
                        onClick={() => handleUnhidePost(post.id)}
                        className="absolute top-4 right-4 text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border-main)] hover:border-brand-2 hover:text-brand-2 transition-colors"
                      >
                        Reexibir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
