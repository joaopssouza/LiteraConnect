'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Heart, MessageCircle, Share2, Plus, Volume2, VolumeX, Pause, Play, BookOpen, Bookmark, MoreVertical, Maximize2, ArrowDown, Eye } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { resolveAvatarUrl } from '@/lib/avatar';
import ReelCommentsDrawer from './ReelCommentsDrawer';
import { cn } from '@/lib/utils';
import { queueView } from '@/lib/view-buffer';

interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  content: string;
  created_at: string;
  likes: number;
  comments: number;
  views: number;
  book_title?: string | null;
  user: {
    id: string;
    name: string;
    handle: string;
    avatar_url?: string | null;
  };
}

/**
 * Função utilitária para garantir compatibilidade da URL do vídeo.
 * Como o LiteraConnect agora utiliza Supabase Storage, os vídeos são 
 * servidos diretamente. Esta função permanece como um placeholder para 
 * futuras transformações se necessário.
 */
function getCompatibleVideoUrl(url: string): string {
  return url;
}

export default function ReelsClient() {
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const [openCommentsReelId, setOpenCommentsReelId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(false);
  const [isGlobalUiHidden, setIsGlobalUiHidden] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchReels = useCallback(async (cursor?: string) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);

    try {
      const url = cursor ? `/api/reels?cursor=${encodeURIComponent(cursor)}` : '/api/reels';
      const res = await fetch(url);
      const data = await res.json();

      if (data.reels) {
        setReels(prev => cursor ? [...prev, ...data.reels] : data.reels);
        setNextCursor(data.nextCursor ?? null);
        if (!cursor && data.reels.length > 0) setActiveReelId(data.reels[0].id);
      }
    } catch (e) {
      console.error('Erro ao buscar reels:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  // Infinite Scroll: sentinela no final da lista
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) {
          fetchReels(nextCursor);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, fetchReels]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <p className="text-white/50 text-sm font-medium">Carregando Reels...</p>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 bottom-[64px] md:bottom-0 md:left-64 bg-black overflow-hidden flex">
      {/* Offset bottom-[83px] no mobile para garantir visibilidade da barra de progresso */}
      <div className={cn(
        "flex-1 flex justify-center transition-all duration-300 ease-in-out",
        openCommentsReelId ? "md:mr-96" : "md:mr-0"
      )}>
        <div className="w-full max-w-md h-full snap-y snap-mandatory overflow-y-scroll hide-scrollbar relative" style={{ scrollSnapType: 'y mandatory' }}>
          {reels.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white p-8 text-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-2">
                <Play className="w-10 h-10 text-white/60" />
              </div>
              <h2 className="text-2xl font-black">Nenhum Reel ainda</h2>
              <p className="text-white/60 text-sm max-w-xs">Seja o primeiro a compartilhar sua resenha em vídeo com a comunidade!</p>
              <Link
                href="/post/create-reel"
                className="mt-4 bg-brand-2 text-white px-8 py-3 rounded-full font-bold shadow-xl hover:opacity-90 transition-opacity"
              >
                Criar Reel
              </Link>
            </div>
          ) : (
            <>
              {reels.map((reel) => (
                <ReelItem
                  key={reel.id}
                  reel={reel}
                  isActive={activeReelId === reel.id}
                  isMuted={isMuted}
                  toggleMute={() => setIsMuted(prev => !prev)}
                  onVisible={() => setActiveReelId(reel.id)}
                  onOpenComments={() => setOpenCommentsReelId(reel.id)}
                  currentUserId={user?.id}
                  isAutoScrollEnabled={isAutoScrollEnabled}
                  setIsAutoScrollEnabled={setIsAutoScrollEnabled}
                  onUiHiddenChange={setIsGlobalUiHidden}
                />
              ))}

              {/* Sentinela de paginação */}
              <div ref={sentinelRef} className="w-full h-4 flex items-center justify-center">
                {loadingMore && (
                  <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* FAB: Criar novo Reel — oculto quando UI está minimizada */}
      {!isGlobalUiHidden && (
        <Link
          href="/post/create-reel"
          className="absolute top-5 right-5 z-40 p-3 bg-black/50 backdrop-blur-sm rounded-full text-white border border-white/10 hover:bg-white/20 transition-all duration-300"
          title="Novo Reel"
        >
          <Plus className="w-5 h-5" />
        </Link>
      )}

      {/* Drawer de comentários lateral/inferior */}
      <ReelCommentsDrawer
        postId={openCommentsReelId || ''}
        isOpen={!!openCommentsReelId}
        onClose={() => setOpenCommentsReelId(null)}
      />
    </div>
  );
}

// ─── Componente  de item ───────────────────────────────────────────────────────
function ReelItem({
  reel, isActive, isMuted, toggleMute, onVisible, onOpenComments, currentUserId, isAutoScrollEnabled, setIsAutoScrollEnabled, onUiHiddenChange
}: {
  reel: Reel;
  isActive: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  onVisible: () => void;
  onOpenComments: () => void;
  currentUserId?: string;
  isAutoScrollEnabled: boolean;
  setIsAutoScrollEnabled: (val: boolean) => void;
  onUiHiddenChange?: (hidden: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likes);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [heartBurst, setHeartBurst] = useState<{ x: number; y: number } | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUiHidden, setIsUiHiddenLocal] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const setIsUiHidden = (val: boolean) => {
    setIsUiHiddenLocal(val);
    onUiHiddenChange?.(val);
  };

  const handleSeek = (clientX: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const video = videoRef.current;
    if (video) {
      video.currentTime = ratio * video.duration;
      setProgress(ratio * 100);
    }
  };

  // Sincronização suave da barra de progresso (60fps)
  useEffect(() => {
    if (!isActive || isScrubbing || !isPlaying) return;

    let rafId: number;
    const updateProgress = () => {
      const video = videoRef.current;
      if (video && video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
      rafId = requestAnimationFrame(updateProgress);
    };

    rafId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(rafId);
  }, [isActive, isPlaying, isScrubbing]);

  // Verificar se o usuário já curtiu
  useEffect(() => {
    if (!currentUserId) return;
    supabase
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', reel.id)
      .eq('user_id', currentUserId)
      .then(({ count }) => {
        if ((count ?? 0) > 0) setIsLiked(true);
      });

    supabase
      .from('post_bookmarks')
      .select('post_id', { count: 'exact', head: true })
      .eq('post_id', reel.id)
      .eq('user_id', currentUserId)
      .then(({ count }) => {
        if ((count ?? 0) > 0) setIsSaved(true);
      });

    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', reel.user_id)
      .eq('follower_id', currentUserId)
      .then(({ count }) => {
        if ((count ?? 0) > 0) setIsFollowing(true);
      });
  }, [reel.id, reel.user_id, currentUserId]);

  // Intersection Observer para autoplay + registro de view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && entries[0].intersectionRatio >= 0.6) {
          onVisible();
          queueView(reel.id);
        }
      },
      { threshold: 0.6 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [onVisible, reel.id]);

  // Play/pause ao mudar de reel ativo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().then(() => setIsPlaying(true)).catch(() => { });
    } else {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive]);

  // Sincronizar muted
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      setShowPauseIcon(true);
      setTimeout(() => setShowPauseIcon(false), 900);
    } else {
      video.play().then(() => setIsPlaying(true)).catch(() => { });
      setShowPauseIcon(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || isScrubbing) return;
    setProgress((video.currentTime / video.duration) * 100);
  };

  const handleVideoEnded = () => {
    if (isAutoScrollEnabled && containerRef.current) {
      containerRef.current.nextElementSibling?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const downloadVideo = async () => {
    setIsMenuOpen(false);
    try {
      const response = await fetch(reel.video_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `reel-${reel.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download video', err);
      alert('Erro ao baixar vídeo.');
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId || currentUserId === reel.user_id) return;
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    try {
      if (wasFollowing) {
        await supabase.from('follows').delete().eq('following_id', reel.user_id).eq('follower_id', currentUserId);
      } else {
        await supabase.from('follows').insert({ following_id: reel.user_id, follower_id: currentUserId });
      }
    } catch {
      setIsFollowing(wasFollowing);
    }
  };

  const handleLike = useCallback(async () => {
    if (!currentUserId || isLiking) return;
    setIsLiking(true);
    const wasLiked = isLiked;
    // Optimistic update
    setIsLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);
    try {
      if (wasLiked) {
        await supabase.from('likes').delete().eq('post_id', reel.id).eq('user_id', currentUserId);
      } else {
        await supabase.from('likes').insert({ post_id: reel.id, user_id: currentUserId });
      }
    } catch {
      // Reverter em caso de erro
      setIsLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1));
    } finally {
      setIsLiking(false);
    }
  }, [currentUserId, isLiked, isLiking, reel.id]);

  const handleSave = useCallback(async () => {
    if (!currentUserId || isSaving) return;
    setIsSaving(true);
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);
    try {
      if (wasSaved) {
        await supabase.from('post_bookmarks').delete().eq('post_id', reel.id).eq('user_id', currentUserId);
      } else {
        await supabase.from('post_bookmarks').insert({ post_id: reel.id, user_id: currentUserId });
      }
    } catch {
      setIsSaved(wasSaved);
    } finally {
      setIsSaving(false);
    }
  }, [currentUserId, isSaved, isSaving, reel.id]);

  const handleShare = async () => {
    const url = `${window.location.origin}/reels/${reel.id}`;
    const shareData = {
      title: `Reel de ${reel.user.name} no LiteraConnect`,
      text: reel.content,
      url,
    };
    if (navigator.share && navigator.canShare(shareData)) {
      await navigator.share(shareData).catch(() => { });
    } else {
      await navigator.clipboard.writeText(shareData.url).catch(() => { });
    }
  };

  // Double-tap para curtir
  const handleVideoTap = (e: React.MouseEvent<HTMLVideoElement>) => {
    const now = Date.now();
    const delta = now - lastTapRef.current;
    if (delta < 350) {
      // Double tap
      const rect = e.currentTarget.getBoundingClientRect();
      setHeartBurst({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setTimeout(() => setHeartBurst(null), 700);
      if (!isLiked) handleLike();
    } else {
      togglePlay();
    }
    lastTapRef.current = now;
  };

  const renderHashtags = (text: string) => {
    return text.split(/(#\w+)/g).map((part, index) => {
      if (/^#\w+$/.test(part)) {
        const tag = part.substring(1);
        return (
          <Link href={`/explore?q=%23${tag}`} key={index} className="text-brand-2 font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  return (
    <div ref={containerRef} className="w-full h-full min-h-full snap-start snap-always relative bg-zinc-950 select-none overflow-hidden">
      <video
        ref={videoRef}
        loop={!isAutoScrollEnabled}
        playsInline
        muted={isMuted}
        onClick={handleVideoTap}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnded}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full object-contain cursor-pointer bg-black"
        preload="auto"
        crossOrigin="anonymous"
      >
        <source src={reel.video_url} type="video/mp4" />
        Seu navegador não suporta vídeos.
      </video>

      {/* Indicador de pausa centralizado */}
      {showPauseIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="p-5 bg-black/50 rounded-full backdrop-blur-sm animate-ping-once">
            <Pause className="w-10 h-10 text-white" fill="white" />
          </div>
        </div>
      )}

      {/* Heart burst no double-tap */}
      {heartBurst && (
        <div
          className="absolute pointer-events-none"
          style={{ left: heartBurst.x - 36, top: heartBurst.y - 36 }}
        >
          <Heart className="w-18 h-18 text-brand-2 reel-heart-burst" style={{ width: 72, height: 72 }} fill="currentColor" />
        </div>
      )}

      {/* Botão mute — canto superior esquerdo (oculto com UI) */}
      {!isUiHidden && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleMute(); }}
          className="absolute top-5 left-5 p-2.5 rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-all duration-300 z-40"
          aria-label={isMuted ? 'Ativar som' : 'Silenciar'}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      )}

      {/* Faixa inferior com gradiente e UI principal */}
      <div className={`absolute bottom-0 left-0 right-0 pt-20 pb-6 pl-4 pr-1 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none transition-opacity duration-300 ${isUiHidden ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex items-end justify-between gap-1 mb-2">

          {/* Metadados do Reel */}
          <div className="flex-1 pointer-events-auto min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <Link href={`/profile/${reel.user.handle}`} className="flex items-center gap-2.5 w-max max-w-[80%]">
                <div className="w-10 h-10 rounded-full overflow-hidden relative border-2 border-white/30 shrink-0">
                  <Image
                    src={resolveAvatarUrl(reel.user.avatar_url, reel.user.handle)}
                    alt={reel.user.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-white/95 text-sm drop-shadow-md">@{reel.user.handle}</span>
                </div>
              </Link>
              {currentUserId && currentUserId !== reel.user_id && (
                <button
                  onClick={handleFollow}
                  className={`px-3 py-1 text-xs font-bold rounded-full border border-white/40 transition-colors ${isFollowing ? 'bg-white/10 text-white' : 'bg-white text-black'}`}
                >
                  {isFollowing ? 'Seguindo' : 'Seguir'}
                </button>
              )}
            </div>

            {reel.book_title && (
              <div className="flex items-center gap-1.5 mb-2 text-white/80 text-xs bg-white/10 backdrop-blur-sm w-fit px-2.5 py-1 rounded-full">
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[180px]">{reel.book_title}</span>
              </div>
            )}

            <div
              className="cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setIsDescriptionExpanded(!isDescriptionExpanded); }}
            >
              <p className={cn("text-white text-sm leading-snug drop-shadow-md transition-all", isDescriptionExpanded ? "overflow-y-auto max-h-32 pr-2 hide-scrollbar" : "line-clamp-1")}>
                {renderHashtags(reel.content)}
              </p>
              {isDescriptionExpanded && (
                <div className="mt-2 text-[10px] text-white/80 flex flex-wrap gap-x-3 gap-y-1">
                  <span>{formatCount(likesCount)} curtidas</span>
                  <span>{formatCount(reel.comments)} comentários</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatCount(reel.views ?? 0)} visualizações
                  </span>
                  <span>{new Date(reel.created_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Ações laterais */}
          <div className="flex flex-col items-center gap-4 pointer-events-auto">
            {/* Like */}
            <button
              onClick={(e) => { e.stopPropagation(); handleLike(); }}
              disabled={!currentUserId}
              className="flex flex-col items-center gap-1 group"
              aria-label="Curtir"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-all active:scale-90 ${isLiked ? 'bg-brand-2/30' : 'bg-black/40 hover:bg-white/20'}`}>
                <Heart
                  className={`w-5 h-5 transition-all ${isLiked ? 'text-brand-2 scale-110' : 'text-white'}`}
                  fill={isLiked ? 'currentColor' : 'transparent'}
                  strokeWidth={isLiked ? 0 : 2}
                />
              </div>
              <span className="text-white font-semibold text-[10px] drop-shadow-md">{formatCount(likesCount)}</span>
            </button>

            {/* Comentários */}
            <button
              onClick={(e) => { e.stopPropagation(); onOpenComments(); }}
              className="flex flex-col items-center gap-1 group"
              aria-label="Comentários"
            >
              <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors active:scale-90">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold text-[10px] drop-shadow-md">{formatCount(reel.comments)}</span>
            </button>

            {/* Salvar */}
            <button
              onClick={(e) => { e.stopPropagation(); handleSave(); }}
              disabled={!currentUserId}
              className="flex flex-col items-center gap-1 group"
              aria-label={isSaved ? "Remover dos salvos" : "Salvar"}
            >
              <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors active:scale-90">
                <Bookmark
                  className={`w-5 h-5 transition-colors ${isSaved ? 'text-brand-2' : 'text-white'}`}
                  fill={isSaved ? 'currentColor' : 'transparent'}
                />
              </div>
              <span className="text-white font-semibold text-[10px] drop-shadow-md">Salvar</span>
            </button>

            {/* Compartilhar */}
            <button
              onClick={(e) => { e.stopPropagation(); handleShare(); }}
              className="flex flex-col items-center gap-1 group"
              aria-label="Compartilhar"
            >
              <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors active:scale-90">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold text-[10px] drop-shadow-md">Compartilhar</span>
            </button>

            {/* Menu Extra */}
            <div className="relative flex flex-col items-center">
              <button
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                className="flex flex-col items-center gap-1 group"
                aria-label="Mais opções"
              >
                <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors active:scale-90">
                  <MoreVertical className="w-5 h-5 text-white" />
                </div>
              </button>

              {isMenuOpen && (
                <div className="absolute bottom-12 right-0 bg-zinc-900/95 backdrop-blur-md rounded-xl p-2 w-52 shadow-xl border border-white/10 z-50 flex flex-col gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsUiHidden(true); setIsMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Maximize2 className="w-4 h-4" />
                    Ocultar Interface
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsAutoScrollEnabled(!isAutoScrollEnabled); setIsMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowDown className="w-4 h-4" />
                      Rolagem auto.
                    </div>
                    {isAutoScrollEnabled && <div className="w-2 h-2 rounded-full bg-brand-2" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadVideo(); }}
                    className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <ArrowDown className="w-4 h-4" />
                    Baixar Vídeo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de progresso interativa — fica acima do nav, sempre visível */}
      <div
        className="absolute bottom-0 left-0 right-0 z-40 px-0 group cursor-pointer h-8 flex items-end touch-none"
        onMouseDown={(e) => {
          setIsScrubbing(true);
          handleSeek(e.clientX, e.currentTarget);
        }}
        onMouseMove={(e) => {
          if (isScrubbing) handleSeek(e.clientX, e.currentTarget);
        }}
        onMouseUp={() => setIsScrubbing(false)}
        onMouseLeave={() => setIsScrubbing(false)}
        onTouchStart={(e) => {
          setIsScrubbing(true);
          handleSeek(e.touches[0].clientX, e.currentTarget);
        }}
        onTouchMove={(e) => {
          if (isScrubbing) {
            handleSeek(e.touches[0].clientX, e.currentTarget);
          }
        }}
        onTouchEnd={() => setIsScrubbing(false)}
        onClick={(e) => {
          e.stopPropagation();
          handleSeek(e.clientX, e.currentTarget);
        }}
      >
        <div className="relative w-full h-1 group-hover:h-2 bg-white/40 transition-all duration-150 rounded-full mb-1">
          <div
            className="absolute top-0 left-0 h-full bg-white rounded-full"
            style={{ width: `${progress}%` }}
          />
          {/* Thumb (bolinha de seek) */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transition-opacity duration-150 ${isScrubbing ? 'opacity-100 scale-125' : 'opacity-0 group-hover:opacity-100'}`}
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
      </div>

      {/* Botão para restaurar Interface se estiver oculta */}
      {isUiHidden && (
        <button
          onClick={(e) => { e.stopPropagation(); setIsUiHidden(false); }}
          className="absolute top-5 right-5 z-50 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-bold border border-white/20"
        >
          Mostrar Interface
        </button>
      )}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
