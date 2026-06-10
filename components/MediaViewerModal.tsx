'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Heart, MessageCircle, Share, Send, Smile, Play } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { resolveAvatarUrl } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { createPortal } from 'react-dom';

interface MediaViewerModalProps {
  postId: string;
  mediaList: Array<{ url: string; type: 'image' | 'video' }>;
  initialIndex: number;
  onClose: () => void;
  author: {
    name: string;
    handle: string;
    avatar: string;
  };
  content: string;
  timeAgo: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  onLikeToggle: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
}

type CommentRecord = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  likes_count: number;
  liked_by_me: boolean;
  author?: {
    name: string;
    handle: string;
    avatar_url: string | null;
  };
};

type ThreadComment = CommentRecord & {
  children: ThreadComment[];
};

const buildCommentTree = (flatComments: CommentRecord[]): ThreadComment[] => {
  const nodeMap = new Map<string, ThreadComment>();
  const roots: ThreadComment[] = [];

  flatComments.forEach((comment) => {
    nodeMap.set(comment.id, { ...comment, children: [] });
  });

  nodeMap.forEach((node) => {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: ThreadComment[]) => {
    nodes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);
  return roots;
};

const EMOJIS = ["😀", "😂", "🥰", "😎", "🤔", "😢", "🔥", "❤️", "👍", "✨", "🙌", "👏", "😮", "😍"];

export function MediaViewerModal({
  postId,
  mediaList,
  initialIndex,
  onClose,
  author,
  content,
  timeAgo,
  likesCount,
  commentsCount,
  sharesCount,
  isLiked,
  onLikeToggle,
  onShare,
}: MediaViewerModalProps) {
  const { user, profile } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyValues, setReplyValues] = useState<Record<string, string>>({});
  const [isPosting, setIsPosting] = useState(false);
  const [isReplyPostingFor, setIsReplyPostingFor] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentValue, setEditCommentValue] = useState('');
  const [isSavingCommentId, setIsSavingCommentId] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [likeLoadingMap, setLikeLoadingMap] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const threadComments = useMemo(() => buildCommentTree(comments), [comments]);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    fetchComments();
  }, [postId, user?.id]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showEmojiPicker]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id, post_id, user_id, content, created_at, parent_id,
          author:users!comments_user_id_fkey (
            name, handle, avatar_url
          )
        `)
        .eq('post_id', postId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const commentRows = (data || []).map((item: any) => ({
        ...item,
        author: Array.isArray(item.author) ? item.author[0] : item.author
      }));

      const commentIds = commentRows.map(c => c.id);
      let likesCountMap = new Map<string, number>();
      let likedByMeSet = new Set<string>();

      if (commentIds.length > 0) {
        const { data: likesRows } = await supabase
          .from('comment_likes')
          .select('comment_id, user_id')
          .in('comment_id', commentIds);

        (likesRows || []).forEach((row: any) => {
          likesCountMap.set(row.comment_id, (likesCountMap.get(row.comment_id) || 0) + 1);
          if (user && row.user_id === user.id) {
            likedByMeSet.add(row.comment_id);
          }
        });
      }

      const enriched: CommentRecord[] = commentRows.map(c => ({
        ...c,
        likes_count: likesCountMap.get(c.id) || 0,
        liked_by_me: likedByMeSet.has(c.id)
      }));
      
      setComments(enriched);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (!user || likeLoadingMap[commentId]) return;
    const target = comments.find(c => c.id === commentId);
    if (!target) return;

    const willLike = !target.liked_by_me;
    setLikeLoadingMap(prev => ({ ...prev, [commentId]: true }));
    setComments(prev => prev.map(c => c.id === commentId ? {
      ...c,
      liked_by_me: willLike,
      likes_count: Math.max(0, c.likes_count + (willLike ? 1 : -1))
    } : c));

    try {
      if (willLike) {
        await supabase.from('comment_likes').insert([{ comment_id: commentId, user_id: user.id }]);
      } else {
        await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
      }
    } catch (err) {
      setComments(prev => prev.map(c => c.id === commentId ? {
        ...c,
        liked_by_me: !willLike,
        likes_count: Math.max(0, c.likes_count + (willLike ? -1 : 1))
      } : c));
    } finally {
      setLikeLoadingMap(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(1);
    setCurrentIndex((prev) => (prev + 1) % mediaList.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(1);
    setCurrentIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    setIsPosting(true);
    try {
      const { error } = await supabase.from('comments').insert([
        {
          post_id: postId,
          user_id: user.id,
          content: newComment,
        },
      ]);
      if (error) throw error;
      setNewComment('');
      fetchComments();
    } catch (error: any) {
      console.error('Error posting comment:', error.message);
    } finally {
      setIsPosting(false);
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    const replyContent = (replyValues[parentId] || '').trim();
    if (!replyContent || !user) return;
    setIsReplyPostingFor(parentId);
    try {
      const { error } = await supabase.from('comments').insert([
        {
          post_id: postId,
          user_id: user.id,
          parent_id: parentId,
          content: replyContent,
        },
      ]);
      if (error) throw error;
      setReplyValues((prev) => ({ ...prev, [parentId]: '' }));
      setReplyingTo(null);
      fetchComments();
    } catch (error: any) {
      console.error('Error posting reply:', error.message);
    } finally {
      setIsReplyPostingFor(null);
    }
  };

  const startCommentEdit = (comment: CommentRecord) => {
    setEditingCommentId(comment.id);
    setEditCommentValue(comment.content);
  };

  const saveCommentEdit = async (commentId: string) => {
    if (!user || !editCommentValue.trim()) return;
    setIsSavingCommentId(commentId);
    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: editCommentValue, updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_id', user.id);
      if (error) throw error;
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: editCommentValue, updated_at: new Date().toISOString() } : c))
      );
      setEditingCommentId(null);
    } catch (error: any) {
      console.error('Erro ao editar comentário:', error.message);
    } finally {
      setIsSavingCommentId(null);
    }
  };

  const addEmoji = (emoji: string) => {
    setNewComment(prev => prev + emoji);
    setShowEmojiPicker(false);
    document.getElementById('comment-input')?.focus();
  };

  const currentMedia = mediaList[currentIndex];

  const formatRelative = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (!mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex flex-col md:flex-row bg-black/95 backdrop-blur-md" 
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Left Side: Media Viewer (70% on desktop, 45% on mobile) */}
      <div className="h-[45%] md:h-full w-full md:w-auto md:flex-[7] relative flex flex-col items-center justify-center overflow-hidden bg-black" onClick={(e) => { e.stopPropagation(); onClose(); }}>
        
        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-colors pointer-events-auto"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex gap-3 pointer-events-auto">
            <button onClick={(e) => { e.stopPropagation(); handleZoomOut(e); }} className="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-colors cursor-pointer" disabled={zoomLevel <= 1}>
              <ZoomOut className="w-5 h-5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleZoomIn(e); }} className="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-colors cursor-pointer" disabled={zoomLevel >= 3}>
              <ZoomIn className="w-5 h-5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(e); }} className="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-colors cursor-pointer">
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Arrows */}
        {mediaList.length > 1 && (
          <>
            <button 
              onClick={handlePrev}
              className="absolute left-4 p-2 md:p-4 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-all hover:scale-110 z-10"
            >
              <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
            </button>
            <button 
              onClick={handleNext}
              className="absolute right-4 p-2 md:p-4 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-all hover:scale-110 z-10"
            >
              <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          </>
        )}

        {/* Media Content */}
        <div 
          className="relative flex items-center justify-center w-full h-full p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="transition-transform duration-300 ease-out flex items-center justify-center w-full h-full"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {currentMedia.type === 'video' ? (
              <video
                src={currentMedia.url.includes('#t=') ? currentMedia.url : `${currentMedia.url}#t=2.0`}
                className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-lg"
                controls
                controlsList="nodownload"
                playsInline
                autoPlay
              />
            ) : (
              <img 
                src={currentMedia.url} 
                alt="Post media" 
                className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-lg" 
              />
            )}
          </div>
        </div>
      </div>

      {/* Right Side: Interaction Sidebar (30% on desktop, 55% on mobile) */}
      <div className="h-[55%] md:h-full w-full md:w-auto md:flex-[3] md:min-w-[350px] md:max-w-[450px] bg-[var(--bg-main)] border-t md:border-t-0 md:border-l border-[var(--border)] flex flex-col shadow-2xl transition-colors duration-300" onClick={(e) => e.stopPropagation()}>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 custom-scrollbar text-[var(--text-main)]">
          
          {/* Post Header */}
          <div className="flex items-center gap-3 mb-4">
            <Link href={`/profile/${author.handle}`}>
              <div className="relative w-12 h-12 flex-shrink-0">
                <Image 
                  src={resolveAvatarUrl(author.avatar, author.handle, 100)} 
                  alt={author.name} 
                  fill 
                  className="rounded-full object-cover border border-[var(--border)]" 
                  unoptimized
                />
              </div>
            </Link>
            <div className="flex flex-col">
              <Link href={`/profile/${author.handle}`} className="font-bold hover:underline">
                {author.name}
              </Link>
              <span className="text-[var(--text-main)]/50 text-sm">@{author.handle} · {timeAgo}</span>
            </div>
          </div>

          {/* Post Caption */}
          <p className="whitespace-pre-wrap leading-relaxed text-sm mb-6 opacity-90">
            {content}
          </p>

          <div className="h-px w-full bg-[var(--border)] mb-4" />

          {/* Metrics & Actions */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between text-[var(--text-main)]/60 text-sm px-2">
              <div className="flex items-center gap-1.5">
                <div className="bg-brand-2 p-1 rounded-full"><Heart className="w-3 h-3 text-white fill-white" /></div>
                <span>{likesCount}</span>
              </div>
              <div className="flex gap-4">
                <span>{commentsCount} comentários</span>
                <span>{sharesCount ?? 0} compartilhamentos</span>
              </div>
            </div>
            
            <div className="h-px w-full bg-[var(--border)]" />
            
            <div className="flex items-center justify-between px-2">
              <button 
                onClick={onLikeToggle} 
                className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition-colors hover:bg-[var(--text-main)]/5", isLiked ? "text-brand-2" : "text-[var(--text-main)]/70")}
              >
                <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
                Curtir
              </button>
              <button onClick={() => document.getElementById('comment-input')?.focus()} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-[var(--text-main)]/70 hover:bg-[var(--text-main)]/5 transition-colors">
                <MessageCircle className="w-5 h-5" />
                Comentar
              </button>
              <button onClick={onShare} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-[var(--text-main)]/70 hover:bg-[var(--text-main)]/5 transition-colors">
                <Share className="w-5 h-5" />
                Compartilhar
              </button>
            </div>
            
            <div className="h-px w-full bg-[var(--border)]" />
          </div>

          {/* Comments Section */}
          <div className="flex flex-col gap-5 mt-4">
            {loadingComments ? (
              <div className="text-center text-[var(--text-main)]/40 text-sm py-8 italic">Carregando comentários...</div>
            ) : threadComments.length > 0 ? (
              threadComments.map((comment) => (
                <div key={comment.id} className="flex flex-col gap-3">
                  {/* Main Comment Node */}
                  <div className="flex gap-3 group">
                    <Link href={`/profile/${comment.author?.handle}`}>
                      <div className="relative w-8 h-8 flex-shrink-0 mt-1">
                        <Image 
                          src={resolveAvatarUrl(comment.author?.avatar_url, comment.author?.handle || 'user', 100)} 
                          alt="" 
                          fill 
                          className="rounded-full object-cover border border-[var(--border)]" 
                        />
                      </div>
                    </Link>
                    <div className="flex flex-col flex-1">
                      {editingCommentId === comment.id ? (
                        <div className="mt-1 space-y-2 pr-2">
                          <textarea
                            value={editCommentValue}
                            onChange={(e) => setEditCommentValue(e.target.value)}
                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-2/30 min-h-[60px] resize-none transition-all"
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingCommentId(null)} className="px-3 py-1 rounded-full text-xs font-bold text-[var(--text-main)]/60 hover:bg-[var(--text-main)]/5 transition-colors">Cancelar</button>
                            <button onClick={() => saveCommentEdit(comment.id)} disabled={isSavingCommentId === comment.id} className="px-3 py-1 rounded-full text-xs font-bold bg-brand-2 text-white hover:opacity-90 disabled:opacity-50">Salvar</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-[var(--text-main)]/5 rounded-2xl rounded-tl-sm px-4 py-2.5">
                            <Link href={`/profile/${comment.author?.handle}`} className="font-bold text-sm hover:underline">
                              {comment.author?.name}
                            </Link>
                            <p className="text-sm mt-0.5 opacity-90">{comment.content}</p>
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 px-2 text-xs font-semibold text-[var(--text-main)]/40">
                            <span>{formatRelative(comment.created_at)}</span>
                            <button 
                              onClick={() => handleToggleCommentLike(comment.id)}
                              className={cn("hover:text-brand-2 transition-colors flex items-center gap-1", comment.liked_by_me && "text-brand-2")}
                            >
                              {comment.liked_by_me ? <Heart className="w-3 h-3 fill-current" /> : null}
                              {comment.likes_count > 0 ? comment.likes_count : ''} Curtir
                            </button>
                            <button 
                              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} 
                              className={cn("hover:text-[var(--text-main)] transition-colors", replyingTo === comment.id && "text-brand-2")}
                            >
                              Responder
                            </button>
                            {user?.id === comment.user_id && (
                              <button 
                                onClick={() => startCommentEdit(comment)}
                                className="hover:text-[var(--text-main)] transition-colors"
                              >
                                Editar
                              </button>
                            )}
                          </div>
                        </>
                      )}

                      {/* Inline Reply Composer for this comment */}
                      {replyingTo === comment.id && user && (
                        <div className="mt-3 flex items-center gap-2 pr-2">
                          <div className="relative w-6 h-6 flex-shrink-0">
                            <Image 
                              src={resolveAvatarUrl(profile?.avatar_url || user.user_metadata?.avatar_url, profile?.handle || user.user_metadata?.handle, 100)} 
                              alt="" 
                              fill 
                              className="rounded-full object-cover border border-[var(--border)]" 
                            />
                          </div>
                          <div className="flex-1 bg-[var(--text-main)]/5 rounded-full flex items-center px-3 py-1.5 border border-[var(--border)]">
                            <input
                              autoFocus
                              type="text"
                              value={replyValues[comment.id] || ''}
                              onChange={(e) => setReplyValues(prev => ({ ...prev, [comment.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleReplySubmit(comment.id);
                                }
                                if (e.key === 'Escape') setReplyingTo(null);
                              }}
                              placeholder={`Respondendo a ${comment.author?.name}...`}
                              className="w-full bg-transparent outline-none text-[var(--text-main)] text-xs placeholder:text-[var(--text-main)]/30"
                            />
                            <button 
                              onClick={() => handleReplySubmit(comment.id)}
                              disabled={isReplyPostingFor === comment.id || !(replyValues[comment.id] || '').trim()}
                              className="ml-2 text-brand-2 disabled:opacity-30"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Replies (Children) */}
                  {comment.children.length > 0 && (
                    <div className="ml-11 flex flex-col gap-3">
                      {comment.children.map((reply) => (
                        <div key={reply.id} className="flex gap-2.5 group">
                          <Link href={`/profile/${reply.author?.handle}`}>
                            <div className="relative w-6 h-6 flex-shrink-0 mt-0.5">
                              <Image 
                                src={resolveAvatarUrl(reply.author?.avatar_url, reply.author?.handle || 'user', 100)} 
                                alt="" 
                                fill 
                                className="rounded-full object-cover border border-[var(--border)]" 
                              />
                            </div>
                          </Link>
                          <div className="flex flex-col flex-1">
                            {editingCommentId === reply.id ? (
                              <div className="mt-1 space-y-2 pr-2">
                                <textarea
                                  value={editCommentValue}
                                  onChange={(e) => setEditCommentValue(e.target.value)}
                                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-2/30 min-h-[50px] resize-none transition-all"
                                />
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setEditingCommentId(null)} className="px-3 py-1 rounded-full text-[10px] font-bold text-[var(--text-main)]/60 hover:bg-[var(--text-main)]/5 transition-colors">Cancelar</button>
                                  <button onClick={() => saveCommentEdit(reply.id)} disabled={isSavingCommentId === reply.id} className="px-3 py-1 rounded-full text-[10px] font-bold bg-brand-2 text-white hover:opacity-90 disabled:opacity-50">Salvar</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="bg-[var(--text-main)]/5 rounded-2xl rounded-tl-sm px-3.5 py-2">
                                  <Link href={`/profile/${reply.author?.handle}`} className="font-bold text-xs hover:underline">
                                    {reply.author?.name}
                                  </Link>
                                  <p className="text-xs mt-0.5 opacity-90">{reply.content}</p>
                                </div>
                                <div className="flex items-center gap-3 mt-1 px-2 text-[10px] font-semibold text-[var(--text-main)]/40">
                                  <span>{formatRelative(reply.created_at)}</span>
                                  <button 
                                    onClick={() => handleToggleCommentLike(reply.id)}
                                    className={cn("hover:text-brand-2 transition-colors flex items-center gap-1", reply.liked_by_me && "text-brand-2")}
                                  >
                                    {reply.liked_by_me ? <Heart className="w-2.5 h-2.5 fill-current" /> : null}
                                    {reply.likes_count > 0 ? reply.likes_count : ''} Curtir
                                  </button>
                                  {user?.id === reply.user_id && (
                                    <button 
                                      onClick={() => startCommentEdit(reply)}
                                      className="hover:text-[var(--text-main)] transition-colors"
                                    >
                                      Editar
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-[var(--text-main)]/40 text-sm py-8 italic">Nenhum comentário ainda. Seja o primeiro!</div>
            )}
          </div>

        </div>

        {/* Input Field Fixed at Bottom */}
        <div className="p-4 bg-[var(--surface)] border-t border-[var(--border)] relative">
          {/* Emote Picker Popover */}
          {showEmojiPicker && (
            <div 
              ref={emojiPickerRef}
              className="absolute bottom-full left-4 mb-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-3 z-50 grid grid-cols-4 gap-2 animate-in fade-in slide-in-from-bottom-2"
            >
              {EMOJIS.map(emoji => (
                <button 
                  key={emoji} 
                  onClick={() => addEmoji(emoji)}
                  className="w-10 h-10 flex items-center justify-center text-xl hover:bg-[var(--border)]/30 rounded-xl transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {user ? (
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-3">
              <div className="relative w-10 h-10 flex-shrink-0">
                <Image 
                  src={resolveAvatarUrl(profile?.avatar_url || user.user_metadata?.avatar_url, profile?.handle || user.user_metadata?.handle, 100)} 
                  alt="" 
                  fill 
                  className="rounded-full object-cover border border-[var(--border)]" 
                  unoptimized
                />
              </div>
              <div className="flex-1 bg-[var(--text-main)]/5 rounded-full flex items-center px-4 py-2 border border-[var(--border)] focus-within:border-brand-2/30 focus-within:bg-[var(--border)]/20 transition-colors">
                <input
                  id="comment-input"
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escreva um comentário..."
                  className="w-full bg-transparent outline-none text-[var(--text-main)] text-sm placeholder:text-[var(--text-main)]/40"
                />
                <div className="flex items-center gap-2 text-[var(--text-main)]/40 ml-2">
                  <button 
                    type="button" 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={cn("hover:text-brand-2 transition-colors", showEmojiPicker && "text-brand-2")}
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isPosting || !newComment.trim()}
                className="p-2 bg-brand-2 text-white rounded-full hover:opacity-90 disabled:opacity-50 disabled:hover:opacity-50 transition-all shadow-lg"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          ) : (
            <div className="text-center text-[var(--text-main)]/60 text-sm py-2">
              <Link href="/login" className="text-brand-2 font-bold hover:underline">Faça login</Link> para comentar
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
