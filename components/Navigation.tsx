'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, MessageSquare, Bell, User, LogOut, LogIn, Settings, PlaySquare, Radio, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function Navigation() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [activityUnreadCount, setActivityUnreadCount] = useState(0);
  const unreadChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const activityChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const previousPathRef = useRef(pathname);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Referência para o áudio de notificação
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastCountsRef = useRef({ chat: 0, activity: 0 });

  useEffect(() => {
    // Inicializa o áudio apenas no lado do cliente
    if (typeof window !== 'undefined') {
      const audio = new Audio('/Twinkle.ogg');
      audio.volume = 0.8;
      audioRef.current = audio;

      // Desbloqueia o áudio na primeira interação do usuário
      const unlockAudio = () => {
        audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
          window.removeEventListener('click', unlockAudio);
        }).catch(() => { });
      };
      window.addEventListener('click', unlockAudio);
      return () => window.removeEventListener('click', unlockAudio);
    }
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.debug('Som bloqueado pelo navegador. Interaja com a página primeiro.');
      });
    }
  };

  const navItems = [
    { href: '/', icon: Home, label: 'Início' },
    { href: '/explore', icon: Search, label: 'Explorar' },
    { href: '/reels', icon: PlaySquare, label: 'Reels' },
    { href: '/chat', icon: MessageSquare, label: 'Mensagens' },
    { href: '/profile', icon: User, label: 'Perfil' },
  ];

  const refreshNotifications = async (withSound = false) => {
    if (!user) {
      setChatUnreadCount(0);
      setActivityUnreadCount(0);
      return;
    }

    try {
      const res = await fetch('/api/notifications/unread-count');
      if (!res.ok) return;
      const data = await res.json();

      const newChatCount = data.chat || 0;
      const newActivityTotal = data.activity || 0;
      const lastSeenActivity = Number(localStorage.getItem(`last-activity-count-${user.id}`) || 0);
      const newActivityCount = Math.max(0, newActivityTotal - lastSeenActivity);

      // Toca o som se houver aumento real e o áudio estiver desbloqueado
      if (withSound) {
        const hasNewChat = newChatCount > lastCountsRef.current.chat;
        const hasNewActivity = newActivityCount > lastCountsRef.current.activity;

        if (hasNewChat || hasNewActivity) {
          playNotificationSound();
        }
      }

      // Atualiza refs e states
      lastCountsRef.current = { chat: newChatCount, activity: newActivityCount };
      setChatUnreadCount(newChatCount);

      if (pathname === '/activity') {
        localStorage.setItem(`last-activity-count-${user.id}`, String(newActivityTotal));
        setActivityUnreadCount(0);
        lastCountsRef.current.activity = 0;
      } else {
        setActivityUnreadCount(newActivityCount);
      }
    } catch (err) {
      console.error('Erro ao carregar notificações unificadas:', err);
    }
  };

  useEffect(() => {
    if (!user) return;

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    const cameFromChat = previousPathRef.current === '/chat' && pathname !== '/chat';
    if (cameFromChat) {
      refreshTimeoutRef.current = setTimeout(() => refreshNotifications(false), 450);
    } else {
      refreshTimeoutRef.current = setTimeout(() => refreshNotifications(false), 0);
    }

    previousPathRef.current = pathname;
  }, [user, pathname]);

  useEffect(() => {
    if (!user) return;

    const handleRealtimeChange = () => {
      refreshNotifications(true);
    };

    // Chat Realtime
    if (unreadChannelRef.current) supabase.removeChannel(unreadChannelRef.current);
    unreadChannelRef.current = supabase
      .channel(`chat-unread:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, handleRealtimeChange)
      .subscribe();

    // Activity Realtime
    if (activityChannelRef.current) supabase.removeChannel(activityChannelRef.current);
    activityChannelRef.current = supabase
      .channel(`activity-unread:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, handleRealtimeChange)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, handleRealtimeChange)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follows', filter: `following_id=eq.${user.id}` }, handleRealtimeChange)
      .subscribe();

    const intervalId = setInterval(() => refreshNotifications(false), 180000); // Polling mais lento (3min)

    return () => {
      clearInterval(intervalId);
      if (unreadChannelRef.current) supabase.removeChannel(unreadChannelRef.current);
      if (activityChannelRef.current) supabase.removeChannel(activityChannelRef.current);
    };
  }, [user, chatUnreadCount, activityUnreadCount, pathname]);

  const isChatRoute = useMemo(() => pathname === '/chat', [pathname]);
  const isActivityRoute = useMemo(() => pathname === '/activity', [pathname]);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        onMouseLeave={() => setIsExpanded(false)}
        className={cn(
          "hidden md:flex flex-col border-r border-[var(--border)] bg-[var(--surface)] h-screen fixed left-0 top-0 z-50 overflow-x-hidden p-3",
          isExpanded ? "w-64 transition-[width] duration-300 ease-in-out" : "w-[72px]"
        )}
      >
        <div className="flex items-center gap-3 mb-8 px-2 h-8">
          <div className="w-8 h-8 bg-brand-2 rounded-lg flex items-center justify-center text-white font-bold text-xl shrink-0">
            L
          </div>
          <span className={cn(
            "text-xl font-bold text-[var(--text-main)] whitespace-nowrap overflow-hidden",
            isExpanded ? "opacity-100 w-auto transition-all duration-300" : "opacity-0 w-0"
          )}>
            LiteraConnect
          </span>
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/chat' && pathname === '/activity');
            const totalUnread = chatUnreadCount + activityUnreadCount;
            const showBadge = item.href === '/chat' && totalUnread > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center rounded-xl transition-colors w-full px-3 h-12 gap-3',
                  isActive
                    ? 'bg-[var(--border)] text-[var(--text-main)] font-semibold'
                    : 'text-[var(--text-main)]/60 hover:bg-[var(--border)]/50 hover:text-[var(--text-main)]'
                )}
                title={!isExpanded ? item.label : undefined}
              >
                <span className="relative inline-flex shrink-0">
                  <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                  {showBadge && (
                    <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-brand-2 text-white text-[10px] font-bold inline-flex items-center justify-center border-2 border-[var(--surface)]">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </span>

                <span className={cn(
                  "text-lg whitespace-nowrap overflow-hidden",
                  isExpanded ? "opacity-100 w-auto transition-all duration-300" : "opacity-0 w-0"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <button
            onMouseEnter={() => setIsExpanded(true)}
            className="flex items-center rounded-xl text-[var(--text-main)]/60 hover:bg-[var(--border)]/50 hover:text-[var(--text-main)] transition-colors w-full text-left px-3 h-12 gap-3"
            title={!isExpanded ? "Menu" : undefined}
          >
            <span className="relative inline-flex shrink-0">
              <Menu className="w-6 h-6" strokeWidth={2} />
            </span>
            <span className={cn(
              "text-lg whitespace-nowrap overflow-hidden",
              isExpanded ? "opacity-100 w-auto transition-all duration-300" : "opacity-0 w-0"
            )}>
              Menu
            </span>
          </button>

          {user ? (
            <>
              <Link
                href="/settings"
                className="flex items-center rounded-xl text-[var(--text-main)]/60 hover:bg-[var(--border)]/50 hover:text-[var(--text-main)] transition-colors w-full px-3 h-12 gap-3"
                title={!isExpanded ? "Configurações" : undefined}
              >
                <span className="relative inline-flex shrink-0">
                  <Settings className="w-6 h-6" strokeWidth={2} />
                </span>
                <span className={cn(
                  "text-lg whitespace-nowrap overflow-hidden",
                  isExpanded ? "opacity-100 w-auto transition-all duration-300" : "opacity-0 w-0"
                )}>
                  Configurações
                </span>
              </Link>
              <button
                onClick={signOut}
                className="flex items-center rounded-xl text-[var(--text-main)]/60 hover:bg-[var(--border)]/50 text-red-500 hover:text-red-600 transition-colors w-full text-left px-3 h-12 gap-3"
                title={!isExpanded ? "Sair" : undefined}
              >
                <span className="relative inline-flex shrink-0">
                  <LogOut className="w-6 h-6" strokeWidth={2} />
                </span>
                <span className={cn(
                  "text-lg whitespace-nowrap overflow-hidden",
                  isExpanded ? "opacity-100 w-auto transition-all duration-300" : "opacity-0 w-0"
                )}>
                  Sair
                </span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center bg-brand-2 text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg justify-center w-full px-3 h-12 gap-3"
              title={!isExpanded ? "Entrar" : undefined}
            >
              <LogIn className="w-5 h-5 shrink-0" />
              <span className={cn(
                "whitespace-nowrap overflow-hidden",
                isExpanded ? "opacity-100 w-auto transition-all duration-300" : "opacity-0 w-0"
              )}>
                Entrar
              </span>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-around p-0 pb-safe z-50">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/chat' && pathname === '/activity');
          const totalUnread = chatUnreadCount + activityUnreadCount;
          const showBadge = item.href === '/chat' && totalUnread > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
                isActive ? 'text-brand-2' : 'text-[var(--text-main)]/60'
              )}
            >
              <span className="relative inline-flex">
                <item.icon className="w-7 h-7" strokeWidth={isActive ? 2.5 : 2} />
                {showBadge && (
                  <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-brand-2 text-white text-[10px] font-bold inline-flex items-center justify-center border-2 border-[var(--surface)]">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

