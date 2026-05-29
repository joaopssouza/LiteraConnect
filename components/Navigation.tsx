'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, MessageSquare, Bell, User, LogOut, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function Navigation() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [activityUnreadCount, setActivityUnreadCount] = useState(0);
  const unreadChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const activityChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const previousPathRef = useRef(pathname);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navItems = [
    { href: '/', icon: Home, label: 'Início' },
    { href: '/explore', icon: Search, label: 'Explorar' },
    { href: '/chat', icon: MessageSquare, label: 'Chat' },
    { href: '/activity', icon: Bell, label: 'Atividade' },
    { href: '/profile', icon: User, label: 'Perfil' },
  ];

  const refreshNotifications = async () => {
    if (!user) {
      setChatUnreadCount(0);
      setActivityUnreadCount(0);
      return;
    }

    try {
      const res = await fetch('/api/notifications/unread-count');
      if (!res.ok) return;
      const data = await res.json();
      
      setChatUnreadCount(data.chat || 0);

      // Lógica de atividade (mantida a comparação com localStorage se desejado, 
      // ou apenas mostramos o valor da API diretamente)
      const lastSeen = Number(localStorage.getItem(`last-activity-count-${user.id}`) || 0);
      const currentCount = data.activity || 0;
      
      if (pathname === '/activity') {
        localStorage.setItem(`last-activity-count-${user.id}`, String(currentCount));
        setActivityUnreadCount(0);
      } else {
        setActivityUnreadCount(Math.max(0, currentCount - lastSeen));
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
      refreshTimeoutRef.current = setTimeout(refreshNotifications, 450);
    } else {
      refreshNotifications();
    }

    previousPathRef.current = pathname;
  }, [user, pathname]);

  useEffect(() => {
    if (!user) return;

    // Chat Realtime
    if (unreadChannelRef.current) supabase.removeChannel(unreadChannelRef.current);
    unreadChannelRef.current = supabase
      .channel(`chat-unread:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refreshNotifications)
      .subscribe();

    // Activity Realtime
    if (activityChannelRef.current) supabase.removeChannel(activityChannelRef.current);
    activityChannelRef.current = supabase
      .channel(`activity-unread:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, refreshNotifications)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, refreshNotifications)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follows', filter: `following_id=eq.${user.id}` }, refreshNotifications)
      .subscribe();

    const intervalId = setInterval(refreshNotifications, 30000); // Polling mais lento (30s) pois temos Realtime

    return () => {
      clearInterval(intervalId);
      if (unreadChannelRef.current) supabase.removeChannel(unreadChannelRef.current);
      if (activityChannelRef.current) supabase.removeChannel(activityChannelRef.current);
    };
  }, [user]);

  const isChatRoute = useMemo(() => pathname === '/chat', [pathname]);
  const isActivityRoute = useMemo(() => pathname === '/activity', [pathname]);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[var(--border)] bg-[var(--surface)] h-screen fixed left-0 top-0 p-4 z-50">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 bg-brand-2 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            L
          </div>
          <span className="text-xl font-bold text-[var(--text-main)]">LiteraConnect</span>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const hasUnreadChat = item.href === '/chat' && chatUnreadCount > 0 && !isChatRoute;
            const hasUnreadActivity = item.href === '/activity' && activityUnreadCount > 0 && !isActivityRoute;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl transition-colors',
                  isActive
                    ? 'bg-[var(--border)] text-[var(--text-main)] font-semibold'
                    : 'text-[var(--text-main)]/60 hover:bg-[var(--border)]/50 hover:text-[var(--text-main)]'
                )}
              >
                <span className="relative inline-flex">
                  <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                  {hasUnreadChat && (
                    <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-brand-2 text-white text-[10px] font-bold inline-flex items-center justify-center border-2 border-[var(--surface)]">
                      {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                    </span>
                  )}
                  {hasUnreadActivity && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brand-2 border-2 border-[var(--surface)] shadow-sm animate-pulse" />
                  )}
                </span>
                <span className="text-lg">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="mt-auto flex flex-col gap-4">
          {user ? (
            <>
              <button 
                onClick={signOut}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-[var(--text-main)]/60 hover:bg-[var(--border)]/50 hover:text-[var(--text-main)] transition-colors"
              >
                <LogOut className="w-6 h-6" strokeWidth={2} />
                <span className="text-lg">Sair</span>
              </button>
              <Link href="/post" className="bg-brand-2 text-white text-center rounded-full py-3 font-bold hover:opacity-90 transition-all shadow-lg active:scale-95">
                Nova Resenha
              </Link>
            </>
          ) : (
            <Link 
              href="/login"
              className="flex items-center justify-center gap-2 bg-brand-2 text-white rounded-full py-3 font-bold hover:opacity-90 transition-all shadow-lg"
            >
              <LogIn className="w-5 h-5" />
              <span>Entrar</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-around p-3 pb-safe z-50">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const hasUnreadChat = item.href === '/chat' && chatUnreadCount > 0 && !isChatRoute;
          const hasUnreadActivity = item.href === '/activity' && activityUnreadCount > 0 && !isActivityRoute;

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
                <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                {hasUnreadChat && (
                  <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-brand-2 text-white text-[10px] font-bold inline-flex items-center justify-center border-2 border-[var(--surface)]">
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  </span>
                )}
                {hasUnreadActivity && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand-2 border-2 border-[var(--surface)]" />
                )}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
