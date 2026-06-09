'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Send, CheckCheck, Check, X, UserPlus, Loader2,
  Pencil, Trash2, Smile, Settings, Phone, Video, Info,
  ImageIcon, Paperclip, PlusCircle, Lock, Bell
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { resolveAvatarUrl } from '@/lib/avatar';
import { useOfflineMessages } from '@/hooks/useOfflineMessages';

/* ─── Helper: avatar com fallback robusto e proporção garantida ─── */
function AvatarImg({
  src, seed, size = 40, className = ''
}: { src?: string | null; seed: string; size?: number; className?: string }) {
  const resolved = resolveAvatarUrl(src, seed, size);
  return (
    // Wrapper com dimensões fixas garante aspecto quadrado independente da imagem nativa
    <div
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      className={cn('overflow-hidden flex-shrink-0 aspect-square rounded-full', className)}
    >
      <Image
        src={resolved}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="object-cover w-full h-full"
        onError={e => {
          const img = e.target as HTMLImageElement;
          const fallback = `/api/avatar?seed=${encodeURIComponent(seed)}&size=${size}`;
          if (img.src !== fallback) img.src = fallback;
        }}
      />
    </div>
  );
}

const EMOJI_OPTIONS = ['❤️', '😂', '👍', '😢', '😮', '🔥'];

const SkeletonChatList = () => (
  <div className="flex flex-col w-full">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-l-2 border-transparent">
        <div className="w-[46px] h-[46px] rounded-full bg-[var(--border)]/20 animate-pulse shrink-0"></div>
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-[var(--border)]/20 rounded w-1/3 animate-pulse"></div>
          <div className="h-2.5 bg-[var(--border)]/20 rounded w-2/3 animate-pulse"></div>
        </div>
      </div>
    ))}
  </div>
);

const SkeletonMessages = () => (
  <div className="flex flex-col gap-6 py-6 px-4 w-full">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
        <div className={`w-2/3 h-12 rounded-[18px] bg-[var(--border)]/10 animate-pulse ${i % 2 === 0 ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'}`}></div>
      </div>
    ))}
  </div>
);

type FilterTab = 'all' | 'unread' | 'groups';

interface Conversation {
  id: string;
  is_group: boolean;
  participants: Array<{ id: string; name: string; handle: string; avatar_url: string }>;
  other: { id: string; name: string; handle: string; avatar_url: string } | null;
  last_message: { id: string; content: string; user_id: string; created_at: string } | null;
  unread_count?: number;
  other_last_read_at?: string | null;
  other_last_seen_at?: string | null;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  attachment_url?: string | null;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  reactions?: Record<string, string[]>;
}

export default function ChatClient() {
  const { user, profile, onlineUserIds } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [activityUnreadCount, setActivityUnreadCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [activeChannelPresence, setActiveChannelPresence] = useState<Record<string, any>>({});
  const [tick, setTick] = useState(0);
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchUsers, setSearchUsers] = useState<any[]>([]);
  const [modalSearch, setModalSearch] = useState('');
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const { saveMessage, getPending, markSent, markFailed, clearSent } = useOfflineMessages();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const globalPresenceRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedByUserRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isTypingRef = useRef(false); // evita track() redundante quando estado nao muda
  const isChannelSubscribedRef = useRef(false);
  const fileInputMediaRef = useRef<HTMLInputElement | null>(null);
  const fileInputDocRef = useRef<HTMLInputElement | null>(null);

  /* ─── Data loading ─── */
  useEffect(() => { 
    if (user) {
      loadConversations();
      
      const fetchActivityUnread = async () => {
        try {
          const res = await fetch('/api/notifications/unread-count');
          if (!res.ok) return;
          const data = await res.json();
          const newActivityTotal = data.activity || 0;
          const lastSeenActivity = Number(localStorage.getItem(`last-activity-count-${user.id}`) || 0);
          setActivityUnreadCount(Math.max(0, newActivityTotal - lastSeenActivity));
        } catch (err) {}
      };
      
      fetchActivityUnread();
      window.addEventListener('activity-read', fetchActivityUnread);
      
      const activityChannel = supabase
        .channel(`chat-activity-unread:${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, fetchActivityUnread)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, fetchActivityUnread)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follows', filter: `following_id=eq.${user.id}` }, fetchActivityUnread)
        .subscribe();

      return () => {
        window.removeEventListener('activity-read', fetchActivityUnread);
        supabase.removeChannel(activityChannel);
      };
    } 
  }, [user]);

  /* ─── Carrega mensagens e cria subscription quando muda a conversa ─── */
  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);
    subscribeToRealtime(selectedId);
    
    // Polling fallback para garantir a chegada de mensagens mesmo se o CDC / Websocket falhar
    const fallbackPollId = setInterval(() => {
      if (!selectedId || document.hidden || !user) return;
      fetch(`/api/chat/messages?userId=${user.id}&conversationId=${selectedId}`)
        .then(res => res.ok ? res.json() : null)
        .then(d => {
          if (d && d.messages) {
            setMessages(prev => {
              if (prev.length !== d.messages.length || prev[prev.length - 1]?.id !== d.messages[d.messages.length - 1]?.id) {
                return d.messages;
              }
              return prev;
            });
            setOtherLastReadAt(d.other_last_read_at || null);
          }
        }).catch(() => {});
    }, 10000);

    // FIX anti-flicker: marcar como lido apenas na troca de conversa, nao quando o foco muda
    markConversationAsRead(selectedId);
    return () => {
      clearInterval(fallbackPollId);
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }
      setTypingUsers([]);
    };
  }, [selectedId, user]); // <-- isWindowFocused REMOVIDO: evita reconexão Realtime a cada foco

  /* ─── Marca como lido quando janela volta ao foco (effect separado para nao recriar subscription) ─── */
  useEffect(() => {
    if (!selectedId || !isWindowFocused) return;
    markConversationAsRead(selectedId);
  }, [isWindowFocused]); // selectedId omitido intencionalmente: so reage a mudanca de foco

  /* ─── Envio automático de mensagens offline quando volta a conexão ─── */
  useEffect(() => {
    if (!selectedId || !user) return;
    const sendPending = async () => {
      if (!navigator.onLine) return;
      const pending = await getPending(selectedId);
      for (const p of pending) {
        try {
          const res = await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, conversationId: selectedId, content: p.content, attachmentUrl: p.attachmentUrl })
          });
          if (res.ok) {
            await markSent(p.localId);
            const d = await res.json();
            if (d.message) setMessages(prev => [...prev.filter(m => m.id !== p.localId), d.message]);
          } else {
            await markFailed(p.localId);
          }
        } catch {
          await markFailed(p.localId);
        }
      }
      await clearSent();
    };
    
    sendPending();
    window.addEventListener('online', sendPending);
    return () => window.removeEventListener('online', sendPending);
  }, [selectedId, user, getPending, markSent, markFailed, clearSent]);

  useEffect(() => {
    const onFocus = () => setIsWindowFocused(true);
    const onBlur = () => setIsWindowFocused(false);
    const onVis = () => {
      const f = !document.hidden;
      setIsWindowFocused(f);
      if (f && selectedId) markConversationAsRead(selectedId);
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [selectedId]);

  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!selectedId && conversations.length > 0 && !hasInitializedRef.current && window.innerWidth >= 768) {
      setSelectedId(conversations[0].id);
      hasInitializedRef.current = true;
    }
  }, [selectedId, conversations]);

  useEffect(() => {
    if (!user) return;
    const ping = async () => {
      try { await fetch('/api/chat/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) }); }
      catch {}
    };
    ping();
    const id = setInterval(ping, 60000);
    const onVis = () => { if (!document.hidden) ping(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user]);

  // Força re-render a cada 10s para expirar status e atualizar tempos ("visto há 1m", etc)
  useEffect(() => {
    const timer = setInterval(() => setTick((t: number) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  /* ─── Fim polling desnecessário ─── */


  /* ─── Modal search: busca global (todos os usuários) ─── */
  useEffect(() => {
    if (!showNewChatModal) { setSearchUsers([]); setModalSearch(''); return; }
    const t = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const qs = new URLSearchParams();
        if (modalSearch.trim()) {
          // Busca global por @handle ou nome — sem filtro followersOnly
          qs.append('q', modalSearch.trim());
        } else {
          // Sem query: mostra seguidores como sugestão inicial
          qs.append('followersOnly', 'true');
        }
        const res = await fetch(`/api/chat/users?${qs.toString()}`);
        if (res.ok) { const d = await res.json(); setSearchUsers(d.users || []); }
      } catch {} finally { setIsSearchingUsers(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [modalSearch, showNewChatModal]);

  /* ─── Filtered conversations ─── */
  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (filter === 'unread') list = list.filter(c => (c.unread_count || 0) > 0);
    if (filter === 'groups') list = list.filter(c => c.is_group);
    if (sidebarSearch.trim()) {
      const q = sidebarSearch.toLowerCase();
      list = list.filter(c => c.other?.name?.toLowerCase().includes(q) || c.other?.handle?.toLowerCase().includes(q));
    }
    return list;
  }, [conversations, filter, sidebarSearch]);

  /* ─── API helpers ─── */
  const loadConversations = async () => {
    if (!user) return;
    setLoadingConvos(true);
    try {
      const res = await fetch(`/api/chat/conversations?userId=${user.id}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setConversations(d.conversations || []);
    } catch {} finally { setLoadingConvos(false); }
  };

  const markConversationAsRead = async (conversationId: string) => {
    if (!user) return;
    try {
      // Usa o endpoint de messages com action mark_read para emitir broadcast read_receipt em tempo real
      await fetch('/api/chat/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', conversationId })
      });
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c));
    } catch {}
  };

  const loadMessages = async (conversationId: string) => {
    if (!user) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/messages?userId=${user.id}&conversationId=${conversationId}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setMessages(d.messages || []);
      setOtherLastReadAt(d.other_last_read_at || null);
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unread_count: 0, other_last_read_at: d.other_last_read_at || c.other_last_read_at || null } : c));
    } catch {} finally { setLoadingMessages(false); }
  };

  const startChatWithUser = async (other: { id: string; name: string; handle: string; avatar_url: string }) => {
    try {
      const res = await fetch('/api/chat/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId: other.id }) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[startChat] error:', res.status, err);
        throw new Error(err.error || 'Falha ao iniciar conversa');
      }
      const d = await res.json();
      setShowNewChatModal(false);
      setSelectedId(d.conversationId);
      selectedByUserRef.current = true;
      await loadConversations();
    } catch (e) { console.error(e); }
  };

  const syncActiveChannelPresence = (ch: any) => {
    if (!ch || !user) return;
    const state = ch.presenceState() as Record<string, any>;
    setActiveChannelPresence(state);
    
    setTypingUsers(
      Object.values(state)
        .flat()
        .filter((p: any) =>
          p?.typing === true &&
          p?.user_id &&
          p.user_id !== user.id
        )
        .map((p: any) => (p.name || 'Usuário').split(' ')[0])
    );
  };

  const subscribeToRealtime = (conversationId: string) => {
    if (channelRef.current) { 
      supabase.removeChannel(channelRef.current); 
      channelRef.current = null; 
      isChannelSubscribedRef.current = false;
    }
    const ch = supabase
      .channel(`messages:${conversationId}`, { config: { presence: { key: user?.id || 'anon' } } })
      // Escuta os broadcasts da API em vez do postgres_changes para ignorar problemas de subqueries RLS
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        const m = payload.message as Message;
        if (!m) return;
        setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, last_message: { id: m.id, content: m.content, user_id: m.user_id, created_at: m.created_at }, unread_count: 0 } : c));
        if (m.user_id !== user?.id && isWindowFocused && !document.hidden) markConversationAsRead(conversationId);
      })
      .on('broadcast', { event: 'update_message' }, ({ payload }) => {
        const m = payload.message as Message;
        if (!m) return;
        setMessages(prev => prev.map(x => x.id === m.id ? m : x));
      })
      // Recebe confirmacao de leitura do outro usuario => atualiza ticks azuis imediatamente
      .on('broadcast', { event: 'read_receipt' }, (msg: any) => {
        const payload = msg?.payload;
        if (!payload || payload.user_id === user?.id) return;
        const readAt: string = payload.read_at;
        setOtherLastReadAt(readAt);
        setConversations((prev: Conversation[]) => prev.map((c: Conversation) =>
          c.id === conversationId
            ? { ...c, other_last_read_at: readAt }
            : c
        ));
      })
      .on('presence', { event: 'sync' }, () => syncActiveChannelPresence(ch))
      .on('presence', { event: 'join' }, () => syncActiveChannelPresence(ch))
      .on('presence', { event: 'leave' }, () => syncActiveChannelPresence(ch))
      .subscribe(s => {
        if (s === 'SUBSCRIBED') {
          isChannelSubscribedRef.current = true;
          // Forca re-track com estado atual de typing
          ch.track({ user_id: user?.id, name: user?.user_metadata?.full_name || user?.email || 'Usuário', handle: user?.user_metadata?.handle, typing: false });
          syncActiveChannelPresence(ch);
        } else if (s === 'CHANNEL_ERROR' || s === 'CLOSED' || s === 'TIMED_OUT') {
          isChannelSubscribedRef.current = false;
        }
      });
    channelRef.current = ch;
    // Reseta flags de estado ao entrar em nova conversa
    isTypingRef.current = false;
  }; // fim subscribeToRealtime

  const sendTypingState = async (typing: boolean) => {
    // Evita chamar track() se o estado nao mudou (reduz noise no canal de presenca)
    if (isTypingRef.current === typing) return;
    isTypingRef.current = typing;
    
    // So tenta enviar se estiver inscrito no canal ativo
    if (!isChannelSubscribedRef.current || !channelRef.current) return;
    
    try {
      await channelRef.current.track({
        user_id: user?.id,
        name: user?.user_metadata?.full_name || user?.email || 'Usuário',
        handle: user?.user_metadata?.handle,
        typing,
      });
    } catch {}
  };

  useEffect(() => {
    // Limpa o timeout SEMPRE que newMessage muda, seja com texto ou sem
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (newMessage.trim().length > 0) {
      // Usuário está digitando: sinaliza e agenda auto-off de 5s
      sendTypingState(true);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingState(false);
        typingTimeoutRef.current = null;
      }, 5000);
    } else {
      // Campo vazio: para imediatamente
      sendTypingState(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newMessage]);

  const sendMessage = async (overrideContent?: string, attachmentUrl?: string) => {
    const finalContent = overrideContent !== undefined ? overrideContent : newMessage;
    if (!user || !selectedId || (!finalContent.trim() && !attachmentUrl) || sending) return;
    setSending(true);
    
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const opt: Message = { id: localId, conversation_id: selectedId, user_id: user.id, content: finalContent, attachment_url: attachmentUrl, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, opt]);
    
    if (overrideContent === undefined) {
      setNewMessage('');
      if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
      if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }
      sendTypingState(false);
    }
    
    if (!navigator.onLine) {
      await saveMessage({ conversationId: selectedId, content: finalContent, attachmentUrl });
      setSending(false);
      return;
    }

    try {
      const res = await fetch('/api/chat/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, conversationId: selectedId, content: finalContent, attachmentUrl }) });
      if (!res.ok) throw new Error();
      const d = await res.json();
      if (d.message) setMessages(prev => prev.map(m => m.id === opt.id ? d.message : m));
    } catch { 
      await saveMessage({ conversationId: selectedId, content: finalContent, attachmentUrl });
    }
    finally { setSending(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedId) return;
    
    setShowAttachMenu(false);
    setUploadingFile(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Erro no upload');
      }
      
      const { url } = await res.json();
      await sendMessage('', url);
      
    } catch (err: any) {
      alert(err.message || 'Falha ao enviar arquivo.');
    } finally {
      setUploadingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const saveEdit = async (msgId: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch('/api/chat/messages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: msgId, action: 'edit', content: editContent }) });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setMessages(prev => prev.map(m => m.id === msgId ? d.message : m));
    } catch { console.error('Erro ao editar mensagem'); }
    finally { setEditingId(null); setEditContent(''); }
  };

  const deleteMessage = async (msgId: string) => {
    try {
      const res = await fetch('/api/chat/messages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: msgId, action: 'delete' }) });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setMessages(prev => prev.map(m => m.id === msgId ? d.message : m));
    } catch { console.error('Erro ao apagar mensagem'); }
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    setEmojiPickerMsgId(null);
    try {
      const res = await fetch('/api/chat/messages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: msgId, action: 'react', emoji }) });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setMessages(prev => prev.map(m => m.id === msgId ? d.message : m));
    } catch { console.error('Erro ao reagir'); }
  };

  const activeConversation = useMemo(() => conversations.find(c => c.id === selectedId) || null, [conversations, selectedId]);

  useEffect(() => {
    if (activeConversation) setOtherLastReadAt(activeConversation.other_last_read_at || null);
  }, [activeConversation]);

  const isMessageReadByOther = (msg: Message) => {
    if (!otherLastReadAt) return false;
    return new Date(otherLastReadAt).getTime() >= new Date(msg.created_at).getTime();
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Hoje';
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };
  const getIsOnline = (chatOther: any) => {
    if (!chatOther) return false;
    if (onlineUserIds.includes(chatOther.id)) return true;
    if (chatOther.last_seen_at && (Date.now() - new Date(chatOther.last_seen_at).getTime() < 120000)) return true;
    return false;
  };

  const formatLastSeen = (lastSeenAt?: string | null, isOnline?: boolean) => {
    const diff = lastSeenAt ? Date.now() - new Date(lastSeenAt).getTime() : Infinity;
    const isOnlineFallback = isOnline || diff < 120000;
    
    if (isOnlineFallback) return 'Online agora';
    if (!lastSeenAt) return 'Offline';
    const m = Math.max(1, Math.floor(diff / 60000));
    if (m < 60) return `Visto há ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Visto há ${h}h`;
    return `Visto há ${Math.floor(h / 24)}d`;
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: Message[] }[] = [];
    messages.forEach(msg => {
      const label = formatDate(msg.created_at);
      const last = groups[groups.length - 1];
      if (!last || last.date !== label) groups.push({ date: label, msgs: [msg] });
      else last.msgs.push(msg);
    });
    return groups;
  }, [messages]);

  if (!user) return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-main)]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
          <MessageSquareIcon className="w-7 h-7 text-[var(--text-main)]/30" />
        </div>
        <p className="text-[var(--text-main)]/50 font-medium">Faça login para ver suas mensagens.</p>
      </div>
    </div>
  );

  const otherIsOnline = useMemo(() => {
    if (!activeConversation?.other) return false;
    const otherId = activeConversation.other.id;
    
    // 1. Canal de presença ativo da conversa
    const isPresentInActiveChannel = Object.values(activeChannelPresence)
      .flat()
      .some((p: any) => p?.user_id === otherId);
    if (isPresentInActiveChannel) return true;
    
    // 2. Lista de presença global
    if (onlineUserIds.includes(otherId)) return true;
    
    // 3. Fallback de data de última visualização (limite de 1 min)
    if (activeConversation.other_last_seen_at && (Date.now() - new Date(activeConversation.other_last_seen_at).getTime() < 60000)) {
      return true;
    }
    
    return false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation, activeChannelPresence, onlineUserIds, tick]);

  return (
    <div
      className="flex h-screen max-h-screen overflow-hidden bg-[var(--bg-main)]"
      onClick={() => { setEmojiPickerMsgId(null); setShowAttachMenu(false); }}
    >
      {/* ══════════════ SIDEBAR (30%) ══════════════ */}
      <aside
        className={cn(
          'flex flex-col bg-[var(--surface)] border-r border-[var(--border)] transition-all duration-300',
          'w-full md:w-[320px] lg:w-[360px] flex-shrink-0',
          selectedId ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Sidebar header */}
        <div className="px-5 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
          <h1 className="text-xl font-black text-[var(--text-main)] tracking-tight">Inbox</h1>
          <div className="flex items-center gap-1">
            {/* Configurações ocultas conforme solicitado — Sprint 16.1 */}
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 rounded-xl bg-brand-2 text-white hover:opacity-90 transition-all shadow-sm active:scale-95"
              title="Nova mensagem"
            >
              <Plus className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

        {/* Search box */}
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-main)]/30 pointer-events-none" />
            <input
              type="text"
              value={sidebarSearch}
              onChange={e => setSidebarSearch(e.target.value)}
              placeholder="Buscar conversas..."
              className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-full py-2.5 pl-10 pr-4 text-sm text-[var(--text-main)] placeholder:text-[var(--text-main)]/30 outline-none focus:ring-2 focus:ring-brand-2/30 focus:border-brand-2/50 transition-all"
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="px-4 pb-3 flex gap-2 flex-shrink-0">
          {(['all', 'unread', 'groups'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all',
                filter === tab
                  ? 'bg-brand-2 text-white shadow-sm'
                  : 'bg-[var(--bg-main)] text-[var(--text-main)]/50 hover:text-[var(--text-main)]/80 border border-[var(--border)]'
              )}
            >
              {tab === 'all' ? 'Todos' : tab === 'unread' ? 'Não lidos' : 'Grupos'}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filter === 'all' && !sidebarSearch.trim() && (
            <button
              onClick={() => router.push('/activity')}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all relative group border-l-2 border-transparent hover:bg-[var(--bg-main)]/60"
            >
              <div className="relative flex-shrink-0 w-[46px] h-[46px] min-w-[46px] min-h-[46px] aspect-square bg-[var(--surface)] border border-[var(--border)]/60 rounded-full flex items-center justify-center text-[var(--text-main)]">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-1 mb-0.5">
                  <span className="text-sm font-semibold truncate text-[var(--text-main)]">
                    Atividade
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('text-xs truncate leading-relaxed', activityUnreadCount > 0 ? 'text-[var(--text-main)] font-semibold' : 'text-[var(--text-main)]/40')}>
                    Notificações, curtidas e comentários
                  </p>
                  {activityUnreadCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-2 text-white text-[9px] font-black inline-flex items-center justify-center flex-shrink-0">
                      {activityUnreadCount > 99 ? '99+' : activityUnreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )}

          {loadingConvos ? (
            <SkeletonChatList />
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <MessageSquareIcon className="w-8 h-8 text-[var(--text-main)]/15" />
              <p className="text-sm text-[var(--text-main)]/30 font-medium">
                {filter !== 'all' ? 'Nenhuma conversa aqui.' : 'Nenhuma conversa ainda.'}
              </p>
            </div>
          ) : (
            filteredConversations.map(chat => {
              const isActive = selectedId === chat.id;
              const otherOnline = getIsOnline(chat.other);
              return (
                <button
                  key={chat.id}
                  onClick={() => { selectedByUserRef.current = true; setSelectedId(chat.id); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all relative group',
                    isActive
                      ? 'bg-brand-2/8 border-l-2 border-brand-2'
                      : 'border-l-2 border-transparent hover:bg-[var(--bg-main)]/60'
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <AvatarImg
                      src={chat.other?.avatar_url}
                      seed={chat.other?.id || chat.id}
                      size={46}
                      className="rounded-full border border-[var(--border)]/60"
                    />
                    {otherOnline && (
                      <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[var(--surface)]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1 mb-0.5">
                      <span className={cn('text-sm font-semibold truncate', isActive ? 'text-brand-2' : 'text-[var(--text-main)]')}>
                        {chat.other?.name || 'Conversa'}
                      </span>
                      <span className="text-[10px] text-[var(--text-main)]/30 font-medium flex-shrink-0">
                        {chat.last_message ? formatDate(chat.last_message.created_at) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-xs truncate leading-relaxed', (chat.unread_count || 0) > 0 ? 'text-[var(--text-main)] font-semibold' : 'text-[var(--text-main)]/40')}>
                        {chat.last_message?.content || 'Inicie a conversa'}
                      </p>
                      {(chat.unread_count || 0) > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-2 text-white text-[9px] font-black inline-flex items-center justify-center flex-shrink-0">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ══════════════ MAIN CHAT (70%) ══════════════ */}
      <main className={cn('flex-1 flex flex-col min-h-0 overflow-hidden', !selectedId && 'hidden md:flex')}>
        {activeConversation ? (
          <>
            {/* Chat header */}
            <header className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 bg-[var(--surface)]/80 backdrop-blur-md border-b border-[var(--border)] z-10">
              <div className="flex items-center gap-3">
                {/* Mobile back */}
                <button onClick={() => setSelectedId(null)} className="md:hidden mr-1 p-1.5 rounded-full hover:bg-[var(--bg-main)] text-[var(--text-main)]/60">
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <div className="relative">
                  <AvatarImg
                    src={activeConversation.other?.avatar_url}
                    seed={activeConversation.other?.id || activeConversation.id}
                    size={38}
                    className="rounded-full border border-[var(--border)]/60"
                  />
                  {otherIsOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[var(--surface)]" />}
                </div>
                <div>
                  <div className="font-bold text-[var(--text-main)] text-sm leading-tight">{activeConversation.other?.name || 'Conversa'}</div>
                  <div className={cn('text-[10px] font-semibold', otherIsOnline ? 'text-emerald-500' : 'text-[var(--text-main)]/30')}>
                    {formatLastSeen(activeConversation.other_last_seen_at, otherIsOnline)}
                  </div>
                </div>
              </div>
            </header>

            {/* Messages area */}
            <div
              className="flex-1 overflow-y-auto px-4 py-6 space-y-1 scroll-smooth"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, var(--brand-2-rgb, 99 102 241) / 0.03 0%, transparent 50%)' }}
              onClick={() => { setEmojiPickerMsgId(null); setShowAttachMenu(false); }}
            >
              {/* Encryption notice */}
              <div className="flex items-center justify-center gap-1.5 py-2 mb-4">
                <Lock className="w-3 h-3 text-[var(--text-main)]/25" />
                <span className="text-[10px] text-[var(--text-main)]/25 font-medium">Mensagens protegidas com criptografia</span>
              </div>

              {loadingMessages ? (
                <SkeletonMessages />
              ) : (
                groupedMessages.map(({ date, msgs }) => (
                  <div key={date}>
                    {/* Date separator */}
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-[var(--border)]" />
                      <span className="text-[10px] font-bold text-[var(--text-main)]/30 uppercase tracking-wider px-1">{date}</span>
                      <div className="flex-1 h-px bg-[var(--border)]" />
                    </div>

                    {msgs.map(msg => {
                      const isMe = msg.user_id === user.id;
                      const isDeleted = !!msg.deleted_at;
                      const readByOther = isMe ? isMessageReadByOther(msg) : false;
                      const isEditing = editingId === msg.id;
                      const reactionEntries = Object.entries(msg.reactions || {});

                      return (
                        <div
                          key={msg.id}
                          className={cn('group flex items-end gap-2 mb-1', isMe ? 'justify-end' : 'justify-start')}
                          onMouseEnter={() => setHoveredMsgId(msg.id)}
                          onMouseLeave={() => setHoveredMsgId(null)}
                        >
                          {/* Other user avatar — fallback via AvatarImg */}
                          {!isMe && (
                            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mb-0.5 border border-[var(--border)]/50">
                              <AvatarImg
                                src={activeConversation.other?.avatar_url}
                                seed={activeConversation.other?.id || activeConversation.id}
                                size={28}
                                className="rounded-full"
                              />
                            </div>
                          )}

                          <div className={cn('flex flex-col gap-1', isMe ? 'items-end' : 'items-start', 'max-w-[68%]')}>
                            {/* Bubble */}
                            <div className={cn(
                              'relative px-4 py-2.5 text-sm shadow-sm transition-all',
                              isMe
                                ? 'bg-brand-2 text-white rounded-[18px] rounded-br-[4px]'
                                : 'bg-[var(--surface)] text-[var(--text-main)] border border-[var(--border)] rounded-[18px] rounded-bl-[4px]',
                              isDeleted && 'opacity-40'
                            )}>
                              {isEditing ? (
                                <div className="flex flex-col gap-2 min-w-[200px]">
                                  <textarea
                                    autoFocus
                                    value={editContent}
                                    onChange={e => setEditContent(e.target.value)}
                                    className="bg-white/10 rounded-xl px-3 py-1.5 text-sm resize-none outline-none w-full border border-white/20 min-h-[56px]"
                                    rows={2}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg.id); } if (e.key === 'Escape') setEditingId(null); }}
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button onClick={() => setEditingId(null)} className="text-[10px] font-bold text-white/50 hover:text-white/80 transition-colors">Cancelar</button>
                                    <button onClick={() => saveEdit(msg.id)} className="text-[10px] font-bold bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg text-white transition-colors">Salvar</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="whitespace-pre-wrap break-words leading-relaxed flex flex-col gap-2">
                                    {isDeleted ? <span className="italic opacity-60">Mensagem apagada</span> : msg.content}
                                    {msg.attachment_url && !isDeleted && (
                                      msg.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                                        <div className="relative w-full max-w-[240px] rounded-xl overflow-hidden mt-1 border border-black/10">
                                          <Image src={msg.attachment_url} alt="Anexo" width={400} height={400} className="w-full h-auto object-cover" unoptimized />
                                        </div>
                                      ) : msg.attachment_url.match(/\.(mp4|webm|ogg)/i) ? (
                                        <video src={msg.attachment_url} controls className="w-full max-w-[240px] rounded-xl mt-1 border border-black/10" />
                                      ) : msg.attachment_url.match(/\.(mp3|wav)/i) ? (
                                        <audio src={msg.attachment_url} controls className="w-full max-w-[240px] mt-1" />
                                      ) : (
                                        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-black/10 rounded-xl mt-1 hover:bg-black/20 transition-colors">
                                          <Paperclip className="w-4 h-4" />
                                          <span className="text-sm font-medium underline">Visualizar Anexo</span>
                                        </a>
                                      )
                                    )}
                                  </div>
                                  <div className={cn('flex items-center justify-end gap-1 mt-1', isMe ? 'text-white/50' : 'text-[var(--text-main)]/30')}>
                                    <span className="text-[9px] font-medium">{formatTime(msg.created_at)}</span>
                                    {msg.edited_at && !isDeleted && <span className="text-[9px]">· editado</span>}
                                    {/* Read receipts: 3 estados estilo WhatsApp */}
                                    {isMe && !isDeleted && (
                                      msg.id.startsWith('local_')
                                        // ✓ Tick único cinza: enviando (ainda não confirmado pelo servidor)
                                        ? <Check className="w-3 h-3 flex-shrink-0 opacity-60" />
                                        : readByOther
                                          // ✓✓ Ticks azuis: lido pelo outro usuário
                                          ? <CheckCheck className="w-3 h-3 flex-shrink-0 text-sky-300" />
                                          // ✓✓ Ticks brancos/cinzas: entregue mas não lido
                                          : <CheckCheck className="w-3 h-3 flex-shrink-0" />
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Reactions */}
                            {!isDeleted && reactionEntries.length > 0 && (
                              <div className="flex flex-wrap gap-1 px-1">
                                {reactionEntries.map(([emoji, users]) => (
                                  <button
                                    key={emoji}
                                    onClick={() => toggleReaction(msg.id, emoji)}
                                    className={cn(
                                      'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all',
                                      users.includes(user.id)
                                        ? 'bg-brand-2/15 border-brand-2/50 text-brand-2'
                                        : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]/70 hover:border-brand-2/40'
                                    )}
                                  >
                                    <span>{emoji}</span>
                                    <span className="font-bold text-[10px]">{users.length}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Hover actions */}
                          {!isDeleted && hoveredMsgId === msg.id && !isEditing && (
                            <div className={cn(
                              'flex items-center gap-0.5 flex-shrink-0 mb-1',
                              isMe ? 'order-first' : 'order-last'
                            )}>
                              {/* Emoji picker */}
                              <div className="relative">
                                <button
                                  onClick={e => { e.stopPropagation(); setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id); }}
                                  className="p-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-main)]/40 hover:text-brand-2 hover:border-brand-2/40 transition-all shadow-sm"
                                >
                                  <Smile className="w-3.5 h-3.5" />
                                </button>
                                {emojiPickerMsgId === msg.id && (
                                  <div
                                    className={cn('absolute bottom-9 flex gap-0.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-1.5 shadow-2xl z-30', isMe ? 'right-0' : 'left-0')}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    {EMOJI_OPTIONS.map(e => (
                                      <button key={e} onClick={() => toggleReaction(msg.id, e)} className="text-base hover:scale-125 transition-transform p-1 rounded-xl hover:bg-[var(--bg-main)]">{e}</button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {isMe && (
                                <>
                                  <button onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }} className="p-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-main)]/40 hover:text-brand-2 hover:border-brand-2/40 transition-all shadow-sm">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => deleteMessage(msg.id)} className="p-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-main)]/40 hover:text-red-400 hover:border-red-300 transition-all shadow-sm">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="flex items-end gap-2 mt-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-[var(--border)]/50 flex-shrink-0">
                    <AvatarImg
                      src={activeConversation.other?.avatar_url}
                      seed={activeConversation.other?.id || activeConversation.id}
                      size={28}
                      className="rounded-full"
                    />
                  </div>
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[18px] rounded-bl-[4px] px-4 py-3">
                    <div className="flex gap-1 items-center">
                      <div className="w-1.5 h-1.5 bg-[var(--text-main)]/30 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-[var(--text-main)]/30 rounded-full animate-bounce [animation-delay:0.15s]" />
                      <div className="w-1.5 h-1.5 bg-[var(--text-main)]/30 rounded-full animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Input bar ── */}
            <footer className="flex-shrink-0 px-4 py-3 bg-[var(--surface)]/80 backdrop-blur-md border-t border-[var(--border)]">
              {/* FIX: items-center mantém os ícones centralizados mesmo com textarea expandido */}
              <div className="flex items-center gap-2.5 max-w-4xl mx-auto">
                {/* Attach menu */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); setShowAttachMenu(v => !v); }}
                    className="p-2.5 rounded-full bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)]/40 hover:text-brand-2 hover:border-brand-2/40 transition-all"
                  >
                    <PlusCircle className="w-5 h-5" />
                  </button>
                  {showAttachMenu && (
                    <div className="absolute bottom-12 left-0 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-1.5 shadow-2xl z-20 flex flex-col gap-0.5 min-w-[150px]" onClick={e => e.stopPropagation()}>
                      <button onClick={() => fileInputMediaRef.current?.click()} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[var(--text-main)]/70 hover:bg-[var(--bg-main)] hover:text-[var(--text-main)] transition-colors">
                        <ImageIcon className="w-4 h-4 text-brand-2" /> Foto / Vídeo
                      </button>
                      <button onClick={() => fileInputDocRef.current?.click()} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[var(--text-main)]/70 hover:bg-[var(--bg-main)] hover:text-[var(--text-main)] transition-colors">
                        <Paperclip className="w-4 h-4 text-brand-2" /> Arquivo
                      </button>
                      <input type="file" ref={fileInputMediaRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                      <input type="file" ref={fileInputDocRef} className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} />
                    </div>
                  )}
                </div>

                {/* Text input */}
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={newMessage}
                    onChange={e => {
                      setNewMessage(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    placeholder="Escreva uma mensagem..."
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-[20px] px-4 py-2.5 pr-3 text-sm text-[var(--text-main)] placeholder:text-[var(--text-main)]/30 outline-none focus:ring-2 focus:ring-brand-2/25 focus:border-brand-2/50 transition-all resize-none overflow-hidden leading-relaxed"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    style={{ minHeight: '42px', maxHeight: '120px' }}
                  />
                </div>

                {/* Send button */}
                <button
                  onClick={() => sendMessage()}
                  disabled={sending || uploadingFile || (!newMessage.trim())}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-2 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-30 active:scale-90 transition-all shadow-md shadow-brand-2/30"
                >
                  {sending || uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </footer>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12 text-center">
            <div className="w-20 h-20 rounded-3xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shadow-xl">
              <MessageSquareIcon className="w-9 h-9 text-[var(--text-main)]/15" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--text-main)] mb-1">Bem-vindo ao Inbox</h2>
              <p className="text-sm text-[var(--text-main)]/40 max-w-xs leading-relaxed">Selecione uma conversa ou clique em <strong className="text-brand-2">+</strong> para iniciar uma nova.</p>
            </div>
            <button onClick={() => setShowNewChatModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-2 text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-md shadow-brand-2/30">
              <Plus className="w-4 h-4" /> Nova Conversa
            </button>
          </div>
        )}
      </main>

      {/* ══════════════ MODAL NOVA CONVERSA ══════════════ */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowNewChatModal(false)}>
          <div className="w-full max-w-[440px] bg-[var(--bg-main)] border border-[var(--border)] rounded-3xl shadow-2xl flex flex-col max-h-[75vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-2" />
                <h2 className="text-base font-black text-[var(--text-main)]">Nova Conversa</h2>
              </div>
              <button onClick={() => setShowNewChatModal(false)} className="p-1.5 rounded-full hover:bg-[var(--surface)] text-[var(--text-main)]/40 hover:text-[var(--text-main)]/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal search */}
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-main)]/30 pointer-events-none" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  placeholder="Buscar por @handle ou nome..."
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-full py-2.5 pl-10 pr-4 text-sm text-[var(--text-main)] placeholder:text-[var(--text-main)]/30 outline-none focus:ring-2 focus:ring-brand-2/30 focus:border-brand-2/40 transition-all"
                  autoFocus
                />
                {isSearchingUsers && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-2 animate-spin" />}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-2">
              {isSearchingUsers && searchUsers.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-sm text-[var(--text-main)]/40">Buscando seguidores...</div>
              ) : searchUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 gap-1 text-sm text-[var(--text-main)]/40">
                  <p>{modalSearch ? 'Nenhum resultado.' : 'Nenhum seguidor disponível.'}</p>
                </div>
              ) : (
                searchUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => startChatWithUser(u)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[var(--surface)] transition-colors text-left group"
                  >
                    <AvatarImg
                      src={u.avatar_url}
                      seed={u.id}
                      size={40}
                      className="rounded-full border border-[var(--border)]/60 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[var(--text-main)] text-sm truncate group-hover:text-brand-2 transition-colors">{u.name}</div>
                      <div className="text-xs text-[var(--text-main)]/40 truncate">@{u.handle}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── SVG Icons ─── */
function ArrowLeftIcon(p: React.SVGProps<SVGSVGElement>) {
  return <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>;
}
function MessageSquareIcon(p: React.SVGProps<SVGSVGElement>) {
  return <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}
