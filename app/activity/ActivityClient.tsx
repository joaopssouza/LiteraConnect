'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { resolveAvatarUrl } from '@/lib/avatar';

interface ActivityItem {
  id: string;
  type: 'like' | 'comment' | 'follow';
  created_at: string;
  user: {
    name: string;
    handle: string;
    avatar_url: string;
  };
  post?: {
    id: string;
    content: string;
    book_cover_url?: string | null;
  };
  comment_content?: string;
}

export default function ActivityClient() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLiveBanner, setShowLiveBanner] = useState(false);
  const [newActivitiesCount, setNewActivitiesCount] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousActivityIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchActivities();
      // Marca atividades como lidas ao abrir a página
      fetch('/api/activity', { method: 'PATCH' }).catch(() => {});
    } else {
      setLoading(false);
    }
  }, [user]);

  // Supabase Realtime — escuta inserções nas tabelas de interação
  useEffect(() => {
    if (!user) return;

    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
    const queueRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => fetchActivities(false), 250);
    };

    const channel = supabase
      .channel(`activity:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follows', filter: `following_id=eq.${user.id}` }, queueRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, queueRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, queueRefresh)
      .subscribe();

    const pollId = setInterval(() => fetchActivities(false), 12000);

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchActivities = async (shouldShowLoading = true) => {
    if (!user) return;
    if (shouldShowLoading) setLoading(true);

    try {
      // userId não é enviado — a API extrai do JWT
      const res = await fetch('/api/activity');
      if (!res.ok) throw new Error('Falha ao carregar atividades');
      const data = await res.json();
      const incomingActivities = data.activities || [];

      if (!shouldShowLoading && previousActivityIdsRef.current.length > 0 && incomingActivities.length > 0) {
        const oldIds = new Set(previousActivityIdsRef.current);
        const unseen = incomingActivities.filter((item: ActivityItem) => !oldIds.has(item.id));

        if (unseen.length > 0) {
          setNewActivitiesCount(unseen.length);
          setShowLiveBanner(true);

          if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
          bannerTimeoutRef.current = setTimeout(() => setShowLiveBanner(false), 2600);
        }
      }

      setActivities(incomingActivities);
      previousActivityIdsRef.current = incomingActivities.map((item: ActivityItem) => item.id);
      
      // Atualiza o contador total local para o sidebar sumir com a badge
      fetch('/api/notifications/unread-count')
        .then(r => r.json())
        .then(d => {
          if (d.activity !== undefined) {
            localStorage.setItem(`last-activity-count-${user.id}`, String(d.activity));
            window.dispatchEvent(new Event('activity-read'));
          }
        })
        .catch(() => {});
    } catch (error) {
      console.error('Erro ao buscar atividades:', error);
    } finally {
      if (shouldShowLoading) setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    };
  }, []);

  const formatRelative = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  // Agrupa atividades por dia para exibição
  const groupByDay = (items: ActivityItem[]) => {
    const groups: Record<string, ActivityItem[]> = {};
    items.forEach((item) => {
      const day = new Date(item.created_at).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      });
      if (!groups[day]) groups[day] = [];
      groups[day].push(item);
    });
    return groups;
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto w-full border-x border-[var(--border)] min-h-screen bg-[var(--surface)] p-8 text-center">
        <h1 className="text-2xl font-serif font-bold text-[var(--text-main)] mb-4">Atividade</h1>
        <p className="text-[var(--text-main)]/60 mb-6">Faça login para ver quem interagiu com você.</p>
        <Link href="/login" className="bg-brand-2 text-white px-6 py-2 rounded-full font-medium hover:opacity-90 transition-colors">
          Entrar / Cadastrar
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Banner de nova interação em tempo real */}
      <div className="hidden lg:block fixed top-4 right-4 z-[9999] pointer-events-none">
        <div
          className={`bg-brand-2 text-white px-4 py-3 rounded-xl shadow-lg border border-white/10 transition-all duration-500 ${
            showLiveBanner ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
          }`}
        >
          {newActivitiesCount > 1 ? `${newActivitiesCount} novas interações` : 'Nova interação recebida'}
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full border-x border-[var(--border)] min-h-screen bg-[var(--surface)]">
        <header className="sticky top-0 z-10 bg-[var(--surface)]/80 backdrop-blur-md border-b border-[var(--border)] p-4">
          <h1 className="text-xl font-bold text-[var(--text-main)] font-serif">Atividade</h1>
        </header>

        <div className="divide-y divide-[var(--border)]">
          {loading ? (
            <div className="divide-y divide-[var(--border)] animate-pulse">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-4 flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-[var(--border)]/20 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[var(--border)]/20 flex-shrink-0" />
                      <div className="w-48 h-4 rounded-full bg-[var(--border)]/20" />
                    </div>
                    <div className="w-3/4 h-3 rounded-full bg-[var(--border)]/20 mt-3" />
                    <div className="w-16 h-3 rounded-full bg-[var(--border)]/20 mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            Object.entries(groupByDay(activities)).map(([day, items]) => (
              <div key={day}>
                {/* Separador de dia */}
                <div className="px-4 py-2 bg-[var(--muted)] border-b border-[var(--border)]/50">
                  <span className="text-xs font-semibold text-[var(--text-main)]/50 uppercase tracking-wide capitalize">
                    {day}
                  </span>
                </div>

                {items.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-[var(--muted)]/50 transition-colors flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {activity.type === 'like' && <Heart className="w-6 h-6 text-brand-2 fill-current" />}
                      {activity.type === 'comment' && <MessageCircle className="w-6 h-6 text-brand-3 fill-current" />}
                      {activity.type === 'follow' && <UserPlus className="w-6 h-6 text-brand-4" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/profile/${activity.user.handle}`}>
                          <div className="relative w-8 h-8 flex-shrink-0">
                            <Image
                              src={resolveAvatarUrl(activity.user.avatar_url, activity.user.handle, 100)}
                              alt={activity.user.name}
                              fill
                              className="rounded-full object-cover"
                              referrerPolicy="no-referrer"
                              sizes="32px"
                            />
                          </div>
                        </Link>
                        <p className="text-[var(--text-main)] text-sm">
                          <Link href={`/profile/${activity.user.handle}`} className="font-bold hover:underline">
                            {activity.user.name}
                          </Link>
                          {' '}
                          {activity.type === 'like' && 'curtiu sua resenha.'}
                          {activity.type === 'comment' && 'comentou na sua resenha:'}
                          {activity.type === 'follow' && 'começou a seguir você.'}
                        </p>
                      </div>

                      {activity.type === 'comment' && activity.comment_content && (
                        <p className="text-[var(--text-main)] text-sm mt-2 bg-[var(--muted)]/50 p-3 rounded-lg">
                          &ldquo;{activity.comment_content}&rdquo;
                        </p>
                      )}

                      {(activity.type === 'like' || activity.type === 'comment') && activity.post && (
                        <Link href={`/post/${activity.post.id}`} className="mt-2 block">
                          <div className="flex items-start gap-3 border-l-2 border-[var(--border)] pl-3">
                            {activity.post.book_cover_url && (
                              <div className="relative w-[58px] h-[58px] rounded-md overflow-hidden border border-[var(--border)] flex-shrink-0 bg-[var(--muted)] flex items-center justify-center">
                                {imageErrors[activity.id] ? (
                                  <span className="text-[10px] font-bold text-[var(--text-main)]/50 tracking-tighter text-center leading-tight px-1">DELETADO</span>
                                ) : (
                                  <Image
                                    src={activity.post.book_cover_url}
                                    alt="Miniatura do post"
                                    fill
                                    className="object-cover"
                                    referrerPolicy="no-referrer"
                                    sizes="58px"
                                    onError={() => setImageErrors(prev => ({ ...prev, [activity.id]: true }))}
                                  />
                                )}
                              </div>
                            )}
                            <p className="text-[var(--text-main)]/60 text-sm line-clamp-2 hover:text-[var(--text-main)] transition-colors flex-1">
                              {activity.post.content}
                            </p>
                          </div>
                        </Link>
                      )}

                      <span className="text-xs text-[var(--text-main)]/60 mt-2 block">
                        {formatRelative(activity.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-[var(--text-main)]/60">Nenhuma atividade recente.</div>
          )}
        </div>
      </div>
    </>
  );
}
