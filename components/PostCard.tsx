'use client';

import Image from 'next/image';
import { Bell, BellOff, Bookmark, Check, Eye, EyeOff, Heart, Link2, MessageCircle, Pencil, Repeat2, Share, Shield, Trash2, X, Play } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { resolveAvatarUrl } from '@/lib/avatar';
import { queueView } from '@/lib/view-buffer';
import { usePreferences } from '@/hooks/usePreferences';
import { MediaViewerModal } from './MediaViewerModal';

async function incrementPostShares(postId: string) {
  try {
    await supabase.rpc('increment_post_shares', { post_id: postId });
  } catch (e) {
    // Silencioso
  }
}

type RepostPreview = {
  originalHandle: string;
  originalContent: string;
  comment: string;
};

type ModalState = {
  open: boolean;
  title: string;
  message: string;
};

const REPOST_MARKER = '🔁 Repost de @';

const parseRepostPreview = (postContent: string): RepostPreview | null => {
  const markerIndex = postContent.indexOf(REPOST_MARKER);
  if (markerIndex === -1) return null;

  const repostBlock = postContent.slice(markerIndex);
  const commentBlock = postContent.slice(0, markerIndex).trim();
  const cleanedComment = commentBlock.endsWith('---')
    ? commentBlock.slice(0, -3).trim()
    : commentBlock;
  const match = repostBlock.match(/^🔁 Repost de @([a-zA-Z0-9_]+):\n\n([\s\S]+)$/);
  if (!match) return null;

  const [, originalHandle, originalContent] = match;
  return {
    originalHandle,
    originalContent,
    comment: cleanedComment,
  };
};

const getRepostDepth = (postContent: string) => {
  const matches = postContent.match(/🔁 Repost de @/g);
  return matches ? matches.length : 0;
};

interface PostProps {
  id: string;
  authorId?: string;
  author: {
    name: string;
    avatar: string;
    handle: string;
  };
  content: string;
  bookTitle?: string;
  bookCover?: string;
  media?: Array<{ url: string; type: 'image' | 'video' }>;
  likes: number;
  comments: number;
  reposts: number;
  views?: number;
  shares?: number;
  timeAgo: string;
  skipFetchCounts?: boolean;
  imagePriority?: boolean;
  onLocalPostPreferenceChange?: () => void;
  recent_comments?: any[];
  hideCommentInput?: boolean;
}

export function PostCard({ id, authorId, author, content, bookTitle, bookCover, media: initialMedia, likes: initialLikes, comments: initialComments, recent_comments, hideCommentInput = false, reposts, views, shares, timeAgo, skipFetchCounts = false, imagePriority = false, onLocalPostPreferenceChange }: PostProps) {
  const { user, profile } = useAuth();
  const { preferences } = usePreferences();
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const repostPreview = useMemo(() => parseRepostPreview(content), [content]);
  const isOwner = !!user && (authorId ? user.id === authorId : user.user_metadata?.handle === author.handle);

  const [likesCount, setLikesCount] = useState(initialLikes);
  const [commentsCount, setCommentsCount] = useState(initialComments);
  const [repostsCount, setRepostsCount] = useState(reposts);
  const [isLiked, setIsLiked] = useState(false);
  const [viewsCount, setViewsCount] = useState<number | null>(views ?? null);
  const [sharesCount, setSharesCount] = useState<number | null>(shares ?? null);
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [isRepostModalOpen, setIsRepostModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isEditPostModalOpen, setIsEditPostModalOpen] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [editRepostComment, setEditRepostComment] = useState('');
  const [editBookTitle, setEditBookTitle] = useState(bookTitle || '');
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  const [feedComments, setFeedComments] = useState<any[]>(recent_comments || []);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [feedCommentLikeLoading, setFeedCommentLikeLoading] = useState<Record<string, boolean>>({});
  const [editingFeedCommentId, setEditingFeedCommentId] = useState<string | null>(null);
  const [editingFeedCommentValue, setEditingFeedCommentValue] = useState('');
  const [isSavingFeedComment, setIsSavingFeedComment] = useState(false);
  const [isDeletingFeedCommentId, setIsDeletingFeedCommentId] = useState<string | null>(null);

  const handleToggleFeedCommentLike = async (e: React.MouseEvent, commentId: string, currentLiked: boolean, currentCount: number) => {
    e.stopPropagation();
    if (!user || feedCommentLikeLoading[commentId]) return;

    setFeedCommentLikeLoading(prev => ({ ...prev, [commentId]: true }));
    setFeedComments(prev => prev.map(c => c.id === commentId ? {
      ...c,
      liked_by_me: !currentLiked,
      likes_count: Math.max(0, currentCount + (currentLiked ? -1 : 1))
    } : c));

    try {
      if (currentLiked) {
        await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
      } else {
        await supabase.from('comment_likes').insert([{ comment_id: commentId, user_id: user.id }]);
      }
    } catch (err) {
      // Revertse der erro
      setFeedComments(prev => prev.map(c => c.id === commentId ? {
        ...c,
        liked_by_me: currentLiked,
        likes_count: currentCount
      } : c));
    } finally {
      setFeedCommentLikeLoading(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const startEditingFeedComment = (e: React.MouseEvent, cmt: any) => {
    e.stopPropagation();
    setEditingFeedCommentId(cmt.id);
    setEditingFeedCommentValue(cmt.content);
  };

  const saveFeedCommentEdit = async (e: React.MouseEvent, commentId: string) => {
    e.stopPropagation();
    if (!user || !editingFeedCommentValue.trim() || isSavingFeedComment) return;
    setIsSavingFeedComment(true);
    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: editingFeedCommentValue.trim(), updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_id', user.id);
      if (error) throw error;
      setFeedComments(prev =>
        prev.map(c => c.id === commentId
          ? { ...c, content: editingFeedCommentValue.trim(), updated_at: new Date().toISOString() }
          : c
        )
      );
      setEditingFeedCommentId(null);
    } catch (err: any) {
      openModal('Erro ao editar', err.message || 'Não foi possível salvar.');
    } finally {
      setIsSavingFeedComment(false);
    }
  };

  const cancelFeedCommentEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFeedCommentId(null);
    setEditingFeedCommentValue('');
  };

  const deleteFeedComment = async (e: React.MouseEvent, commentId: string) => {
    e.stopPropagation();
    if (!user || isDeletingFeedCommentId) return;
    setIsDeletingFeedCommentId(commentId);
    try {
      const { error } = await supabase
        .from('comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_id', user.id);
      if (error) throw error;
      setFeedComments(prev => prev.filter(c => c.id !== commentId));
      setCommentsCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      openModal('Erro ao excluir', err.message || 'Não foi possível remover.');
    } finally {
      setIsDeletingFeedCommentId(null);
    }
  };

  const handleFeedCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id, content: newComment.trim() })
      });
      if (!res.ok) throw new Error('Erro ao comentar');
      const data = await res.json();
      
      const newCmt = {
        id: data.comment?.id || Date.now().toString(),
        content: newComment.trim(),
        created_at: new Date().toISOString(),
        author: {
          name: profile?.name || user.user_metadata?.full_name || user.user_metadata?.name || 'Você',
          handle: profile?.handle || user.user_metadata?.handle || 'voce',
          avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || ''
        }
      };
      setFeedComments(prev => [newCmt, ...prev].slice(0, 3));
      setCommentsCount(prev => prev + 1);
      setNewComment('');
    } catch (err: any) {
      openModal('Erro', err.message || 'Não foi possível enviar o comentário.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const mediaList = useMemo(() => {
    if (initialMedia && initialMedia.length > 0) return initialMedia;
    if (bookCover) {
      const isVideo = bookCover.match(/\.(mp4|webm|ogg|mov)$/i) || bookCover.includes('video/');
      const url = isVideo ? (bookCover.includes('#t=') ? bookCover : `${bookCover}#t=2.0`) : bookCover;
      return [{ url, type: isVideo ? 'video' : 'image' } as const];
    }
    return [];
  }, [initialMedia, bookCover]);

  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    title: '',
    message: '',
  });
  const [originalAuthor, setOriginalAuthor] = useState<{ name: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (user && authorId && user.id !== authorId) {
      queueView(id);
    }
    if (views === undefined || shares === undefined) {
      fetchAnalytics();
    } else {
      setViewsCount(views);
      setSharesCount(shares);
    }
  }, [id, user?.id, authorId, views, shares]);

  async function fetchAnalytics() {
    const { data: postData } = await supabase
      .from('posts')
      .select('views, shares')
      .eq('id', id)
      .maybeSingle();
    if (postData) {
      setViewsCount(postData.views ?? 0);
      setSharesCount(postData.shares ?? 0);
    }
  }

  useEffect(() => {
    if (user) {
      checkIfLiked();
    } else {
      setIsLiked(false);
    }
  }, [user?.id, id]);

  useEffect(() => {
    if (!skipFetchCounts) {
      fetchCounts();
    }
  }, [id, skipFetchCounts]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!user) return;
    const savedPosts = JSON.parse(localStorage.getItem('saved-posts') || '[]') as string[];
    const disabledNotifications = JSON.parse(localStorage.getItem('disabled-post-notifications') || '[]') as string[];
    setIsSaved(savedPosts.includes(id));
    setNotificationsEnabled(!disabledNotifications.includes(id));
  }, [user, id]);

  useEffect(() => {
    if (repostPreview) {
      setEditContent(repostPreview.originalContent);
      setEditRepostComment(repostPreview.comment || '');
    } else {
      setEditContent(content);
      setEditRepostComment('');
    }
    setEditBookTitle(bookTitle || '');
  }, [content, bookTitle, repostPreview]);

  useEffect(() => {
    if (!repostPreview) {
      setOriginalAuthor(null);
      return;
    }
    const fetchOriginalAuthor = async () => {
      const { data } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('handle', repostPreview.originalHandle)
        .maybeSingle();
      if (data) setOriginalAuthor(data);
    };
    fetchOriginalAuthor();
  }, [repostPreview]);

  const openModal = (title: string, message: string) => {
    setModalState({ open: true, title, message });
  };

  const toggleArrayPreference = (key: string, itemId: string) => {
    const current = JSON.parse(localStorage.getItem(key) || '[]') as string[];
    const exists = current.includes(itemId);
    const updated = exists ? current.filter((currentId) => currentId !== itemId) : [...current, itemId];
    localStorage.setItem(key, JSON.stringify(updated));
    return !exists;
  };

  const checkIfLiked = async () => {
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', user?.id)
      .maybeSingle();
    setIsLiked(!!data);
  };

  const fetchCounts = async () => {
    const { count: lCount } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', id);
    if (lCount !== null) setLikesCount(lCount);

    const { count: cCount } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', id).is('deleted_at', null);
    if (cCount !== null) setCommentsCount(cCount);

    const repostContent = `🔁 Repost de @${author.handle}:\n\n${content}`;
    const { count: rCount } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('content', repostContent);
    if (rCount !== null) setRepostsCount(rCount);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || isLiking) return;
    setIsLiking(true);
    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('post_id', id).eq('user_id', user.id);
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase.from('likes').insert([{ post_id: id, user_id: user.id }]);
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } finally {
      setIsLiking(false);
    }
  };

  const handleRepost = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || isReposting) return;
    setIsRepostModalOpen(true);
  };

  const confirmRepost = async () => {
    if (!user || isReposting) return;
    const repostContent = `🔁 Repost de @${author.handle}:\n\n${content}`;
    setIsReposting(true);
    try {
      const { error } = await supabase.from('posts').insert([{
        user_id: user.id,
        content: repostContent,
        book_title: bookTitle || null,
        book_cover_url: bookCover || null,
      }]);
      if (error) throw error;
      setIsRepostModalOpen(false);
      setRepostsCount(prev => prev + 1);
      openModal('Repost publicado', 'A resenha foi repostada com sucesso.');
    } catch (err: any) {
      openModal('Erro ao repostar', err.message);
    } finally {
      setIsReposting(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const postUrl = `${window.location.origin}/post/${id}`;
    try {
      await incrementPostShares(id);
      fetchAnalytics();
      if (navigator.share) {
        await navigator.share({
          title: `Resenha de ${author.name} no LiteraConnect`,
          text: content.substring(0, 100) + '...',
          url: postUrl,
        });
      } else {
        await navigator.clipboard.writeText(postUrl);
        openModal('Link copiado', 'O link foi copiado.');
      }
    } catch (e) { }
  };

  const handleCardClick = () => {
    if (isMenuOpen || modalState.open || isRepostModalOpen || isTrashModalOpen || isEditPostModalOpen) return;
    router.push(`/post/${id}`);
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/profile/${author.handle}`);
  };

  const handleSavePostEdit = async () => {
    if (!user || !isOwner) return;

    let contentToSave = editContent.trim();
    if (repostPreview) {
      const repostBaseContent = `🔁 Repost de @${repostPreview.originalHandle}:\n\n${repostPreview.originalContent}`;
      const trimmedComment = editRepostComment.trim();
      contentToSave = trimmedComment
        ? `${trimmedComment}\n\n---\n\n${repostBaseContent}`
        : repostBaseContent;
    }

    if (!contentToSave) return;

    setIsSavingPost(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          content: contentToSave,
          book_title: editBookTitle.trim() ? editBookTitle.trim() : null,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setIsEditPostModalOpen(false);
      openModal('Post atualizado', 'As alterações foram salvas.');
      router.refresh();
    } catch (error: any) {
      openModal('Erro ao editar post', error.message || 'Não foi possível salvar.');
    } finally {
      setIsSavingPost(false);
    }
  };

  const confirmMoveToTrash = async () => {
    if (!user || !isOwner || isDeletingPost) return;

    setIsDeletingPost(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao excluir o post');
      }

      setIsTrashModalOpen(false);
      if (pathname === `/post/${id}`) {
        router.push('/');
      } else {
        setIsHidden(true);
      }
      openModal('Excluído', 'A postagem foi removida com sucesso.');
    } catch (error: any) {
      openModal('Erro', error.message || 'Não foi possível remover.');
    } finally {
      setIsDeletingPost(false);
    }
  };

  if (isHidden) return null;

  return (
    <article
      className="p-4 border-b border-[var(--border)] bg-[var(--surface)] hover:opacity-95 transition-opacity"
    >
      <div className="flex gap-3">
        <div
          className="relative w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={handleProfileClick}
        >
          <Image
            src={resolveAvatarUrl(author.avatar, author.handle, 100)}
            alt={author.name}
            fill
            className="rounded-full object-cover bg-[var(--border)]/20"
            referrerPolicy="no-referrer"
            sizes="48px"
            unoptimized
          />
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--text-main)] hover:underline" onClick={handleProfileClick}>
                  {author.name}
                </span>
                <span className="text-[var(--text-main)]/60 text-sm" onClick={handleProfileClick}>
                  @{author.handle}
                </span>
                <span className="text-[var(--text-main)]/60 text-sm">· {timeAgo}</span>
              </div>
              {bookTitle && (
                <div className="inline-flex items-center self-start gap-1 bg-brand-2/10 px-2 py-0.5 mt-0.5 rounded-full text-xs font-medium text-brand-2 border border-brand-2/20">
                  📚 Lendo: {bookTitle}
                </div>
              )}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                className="text-[var(--text-main)]/60 hover:text-[var(--text-main)] p-1 rounded-full hover:bg-[var(--border)]/30 transition-colors"
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
              >
                •••
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl z-30 py-1 overflow-hidden">
                  <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); window.open(`/post/${id}`, '_blank'); }} className="w-full px-4 py-2 text-left text-sm text-[var(--text-main)] hover:bg-[var(--border)]/20 flex items-center gap-2">
                    <Link2 className="w-4 h-4" /> Abrir post em nova guia
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); const now = toggleArrayPreference('saved-posts', id); setIsSaved(now); setIsMenuOpen(false); }} className="w-full px-4 py-2 text-left text-sm text-[var(--text-main)] hover:bg-[var(--border)]/20 flex items-center gap-2">
                    <Bookmark className="w-4 h-4" /> {isSaved ? 'Remover dos salvos' : 'Salvar post'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); toggleArrayPreference('hidden-posts', id); setIsHidden(true); setIsMenuOpen(false); }} className="w-full px-4 py-2 text-left text-sm text-[var(--text-main)] hover:bg-[var(--border)]/20 flex items-center gap-2">
                    <EyeOff className="w-4 h-4" /> Ocultar post
                  </button>
                  {isOwner && (
                    <>
                      <div className="my-1 border-t border-[var(--border)]" />
                      <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); setIsEditPostModalOpen(true); }} className="w-full px-4 py-2 text-left text-sm text-[var(--text-main)] hover:bg-[var(--border)]/20 flex items-center gap-2">
                        <Pencil className="w-4 h-4" /> Editar post
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); setIsTrashModalOpen(true); }} className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Excluir post
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2">
          <div
            className="mt-2 text-[var(--text-main)] whitespace-pre-wrap leading-relaxed transition-all relative"
            style={{ fontSize: preferences?.fontSize ? `${preferences.fontSize}px` : '16px' }}
          >
            {repostPreview ? (
              <>
                {repostPreview.comment && <p className="mb-2">{repostPreview.comment}</p>}
                <div className="border border-[var(--border)] rounded-2xl p-3 bg-[var(--border)]/5 mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 relative rounded-full overflow-hidden bg-[var(--border)]/20">
                      <Image src={resolveAvatarUrl(originalAuthor?.avatar_url, repostPreview.originalHandle, 50)} alt="" fill unoptimized className="object-cover" />
                    </div>
                    <span className="text-sm font-bold">@{repostPreview.originalHandle}</span>
                  </div>
                  <p className="text-sm opacity-90">{repostPreview.originalContent}</p>
                </div>
              </>
            ) : content}
          </div>

          {mediaList.length > 0 && !repostPreview && (
            <div 
              className={cn(
                "mt-3 rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--border)]/5 grid gap-1",
                mediaList.length === 1 ? "grid-cols-1" : "grid-cols-2"
              )}
            >
              {mediaList.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={(e) => { e.stopPropagation(); setSelectedMediaIndex(idx); }}
                  className={cn(
                    "relative cursor-pointer bg-black flex items-center justify-center overflow-hidden",
                    mediaList.length === 1 ? "aspect-auto max-h-[500px]" : "aspect-square",
                    mediaList.length === 3 && idx === 0 ? "row-span-2 h-full" : ""
                  )}
                >
                  {item.type === 'video' ? (
                    <div className="relative w-full h-full group">
                      <video
                        src={item.url.includes('#t=') ? item.url : `${item.url}#t=2.0`}
                        className="w-full h-full object-contain opacity-80"
                        controls={mediaList.length === 1}
                        controlsList="nodownload"
                        playsInline
                        preload="metadata"
                      />
                      {mediaList.length > 1 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:bg-black/20 transition-colors">
                          <div className="bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/20">
                            <Play className="w-8 h-8 text-white fill-current" />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <img 
                      src={item.url} 
                      alt="" 
                      className="w-full h-full object-contain transition-transform duration-500" 
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 text-[var(--text-main)]/60 max-w-md">
            <button onClick={handleLike} className={cn("flex items-center gap-2 transition-colors hover:text-brand-2", isLiked && "text-brand-2")}>
              <div className={cn("p-2 rounded-full", isLiked ? "bg-brand-2/10" : "hover:bg-brand-2/10")}>
                <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
              </div>
              <span className="text-sm">{likesCount}</span>
            </button>
            <span className="flex items-center gap-1.5 text-[var(--text-main)]/40 select-none">
              <Eye className="w-4 h-4" />
              <span className="text-sm">
                {((v) => v >= 1000000
                  ? `${(v / 1000000).toFixed(1)}M`
                  : v >= 1000
                  ? `${(v / 1000).toFixed(1)}K`
                  : v)(views ?? 0)}
              </span>
            </span>
            <button className="flex items-center gap-2 hover:text-brand-2 transition-colors">
              <div className="p-2 rounded-full hover:bg-brand-2/10">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-sm">{commentsCount}</span>
            </button>
            <button onClick={handleRepost} className="flex items-center gap-2 hover:text-brand-2 transition-colors">
              <div className="p-2 rounded-full hover:bg-brand-2/10">
                <Repeat2 className="w-5 h-5" />
              </div>
              <span className="text-sm">{repostsCount}</span>
            </button>
            <button onClick={handleShare} className="flex items-center gap-2 hover:text-brand-2 transition-colors">
              <div className="p-2 rounded-full hover:bg-brand-2/10">
                <Share className="w-5 h-5" />
              </div>
            </button>
          </div>

          {/* Comentários compactos e campo de input para todos os posts */}
          <div className="mt-4 border-t border-[var(--border)] pt-3">
              {feedComments && feedComments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {feedComments.map(cmt => {
                    const isOwnerCmt = user?.id === cmt.user_id;
                    const isEditingThis = editingFeedCommentId === cmt.id;
                    const wasEdited = !!cmt.updated_at;
                    return (
                      <div key={cmt.id} className="flex flex-col gap-1 group/cmt">
                        <div className="flex gap-2 text-sm items-start">
                          <div
                            className="w-6 h-6 relative flex-shrink-0 mt-0.5 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); window.open(`/post/${id}`, '_blank'); }}
                          >
                            <Image
                              src={resolveAvatarUrl(cmt.author?.avatar_url, cmt.author?.handle, 50)}
                              alt=""
                              fill
                              className="rounded-full object-cover"
                              unoptimized
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            {isEditingThis ? (
                              <div
                                className="bg-[var(--text-main)]/10 rounded-xl px-3 py-1.5"
                                onClick={e => e.stopPropagation()}
                              >
                                <span className="font-bold text-[var(--text-main)] mr-2 text-xs">{cmt.author?.handle}</span>
                                <input
                                  autoFocus
                                  value={editingFeedCommentValue}
                                  onChange={e => setEditingFeedCommentValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Escape') cancelFeedCommentEdit(e as any); }}
                                  className="w-full bg-transparent outline-none text-sm text-[var(--text-main)] mt-0.5"
                                />
                                <div className="flex items-center gap-2 mt-1.5">
                                  <button
                                    onClick={e => saveFeedCommentEdit(e, cmt.id)}
                                    disabled={isSavingFeedComment || !editingFeedCommentValue.trim()}
                                    className="flex items-center gap-1 text-xs font-bold text-brand-2 hover:opacity-80 disabled:opacity-40 transition-opacity"
                                  >
                                    <Check className="w-3 h-3" /> Salvar
                                  </button>
                                  <button
                                    onClick={cancelFeedCommentEdit}
                                    className="text-xs text-[var(--text-main)]/50 hover:text-[var(--text-main)] transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="bg-[var(--text-main)]/10 rounded-xl px-3 py-1.5 cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); window.open(`/post/${id}`, '_blank'); }}
                              >
                                <span className="font-bold text-[var(--text-main)] mr-1.5">{cmt.author?.handle}</span>
                                {wasEdited && (
                                  <span className="text-[0.65rem] text-[var(--text-main)]/40 font-medium mr-1.5 align-middle">· editado</span>
                                )}
                                <span className="text-[var(--text-main)]/80">{cmt.content}</span>
                              </div>
                            )}
                          </div>

                          {/* Ações: like + editar/deletar */}
                          <div className="flex items-center gap-0.5 ml-1 mt-0.5 flex-shrink-0">
                            <div className="flex flex-col items-center">
                              <button
                                onClick={(e) => handleToggleFeedCommentLike(e, cmt.id, cmt.liked_by_me, cmt.likes_count)}
                                className="p-1.5 rounded-full hover:bg-[var(--border)]/20 transition-colors"
                              >
                                <Heart className={cn("w-4 h-4", cmt.liked_by_me ? "fill-brand-2 text-brand-2" : "text-[var(--text-main)]/60")} />
                              </button>
                              {cmt.likes_count > 0 && (
                                <span className="text-xs text-[var(--text-main)]/60 -mt-1 font-medium">{cmt.likes_count}</span>
                              )}
                            </div>
                            {isOwnerCmt && !isEditingThis && (
                              <>
                                <button
                                  title="Editar"
                                  onClick={e => startEditingFeedComment(e, cmt)}
                                  className="p-1.5 rounded-full hover:bg-[var(--border)]/20 transition-colors opacity-0 group-hover/cmt:opacity-100"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-[var(--text-main)]/50 hover:text-brand-2" />
                                </button>
                                <button
                                  title="Excluir"
                                  onClick={e => deleteFeedComment(e, cmt.id)}
                                  disabled={isDeletingFeedCommentId === cmt.id}
                                  className="p-1.5 rounded-full hover:bg-red-500/10 transition-colors opacity-0 group-hover/cmt:opacity-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-[var(--text-main)]/50 hover:text-red-500" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {cmt.replies_count > 0 && (
                          <div className="pl-9 -mt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(`/post/${id}`, '_blank'); }}
                              className="text-xs text-[var(--text-main)]/50 font-medium hover:underline flex items-center gap-1"
                            >
                              <div className="w-4 border-t border-[var(--text-main)]/30 inline-block mr-1"></div>
                              {cmt.replies_count === 1 ? '1 resposta' : `${cmt.replies_count} respostas`}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {commentsCount > feedComments.length && (
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/post/${id}`); }}
                      className="text-xs text-brand-2 hover:underline pl-9 font-medium"
                    >
                      Ver todos os {commentsCount} comentários
                    </button>
                  )}
                </div>
              )}
              {!hideCommentInput && user && (
                <form onSubmit={handleFeedCommentSubmit} onClick={e => e.stopPropagation()} className="flex items-center gap-2">
                  <div className="w-6 h-6 relative flex-shrink-0 bg-[var(--border)]/20 rounded-full overflow-hidden">
                    <Image
                      src={resolveAvatarUrl(profile?.avatar_url || user.user_metadata?.avatar_url, profile?.handle || user.user_metadata?.handle, 50)}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <input 
                    type="text" 
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Escreva um comentário..."
                    className="flex-1 bg-[var(--text-main)]/10 rounded-full px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-brand-2/50 placeholder:text-[var(--text-main)]/40 text-[var(--text-main)]"
                    disabled={isSubmittingComment}
                  />
                  <button 
                    type="submit"
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="text-brand-2 font-bold text-sm disabled:opacity-40 pr-1"
                  >
                    Enviar
                  </button>
                </form>
              )}
            </div>
        </div>

      {/* Modais com o novo design */}
      {(isRepostModalOpen || isEditPostModalOpen || isTrashModalOpen || modalState.open) && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-md bg-[var(--surface)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">
                {isRepostModalOpen ? 'Repostar resenha?' : isTrashModalOpen ? 'Excluir post?' : isEditPostModalOpen ? 'Editar post' : modalState.title}
              </h3>
              <p className="text-[var(--text-main)]/70">
                {isRepostModalOpen ? 'Deseja compartilhar esta leitura no seu perfil?' : isTrashModalOpen ? 'Esta ação não pode ser desfeita.' : isEditPostModalOpen ? '' : modalState.message}
              </p>

              {isEditPostModalOpen && (
                <div className="mt-4 space-y-4">
                  <input
                    value={editBookTitle}
                    onChange={(e) => setEditBookTitle(e.target.value)}
                    placeholder="Título do livro"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-2 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-2/30"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-2 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-2/30 resize-none"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-[var(--border)]/5 border-t border-[var(--border)] flex justify-end gap-3">
              <button
                onClick={() => { setIsRepostModalOpen(false); setIsTrashModalOpen(false); setIsEditPostModalOpen(false); setModalState(prev => ({ ...prev, open: false })); }}
                className="px-6 py-2 rounded-full font-medium text-[var(--text-main)]/60 hover:bg-[var(--text-main)]/10 transition-colors"
              >
                {modalState.open ? 'Fechar' : 'Cancelar'}
              </button>
              {!modalState.open && (
                <button
                  onClick={isRepostModalOpen ? confirmRepost : isTrashModalOpen ? confirmMoveToTrash : handleSavePostEdit}
                  className={cn(
                    "px-6 py-2 rounded-full font-bold text-white transition-transform active:scale-95",
                    isTrashModalOpen ? "bg-red-500 hover:bg-red-600" : "bg-brand-2 hover:opacity-90"
                  )}
                  disabled={isDeletingPost || isSavingPost || isReposting}
                >
                  {isDeletingPost || isSavingPost || isReposting ? 'Aguarde...' : 'Confirmar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedMediaIndex !== null && mediaList.length > 0 && (
        <MediaViewerModal
          postId={id}
          mediaList={mediaList as any} // we cast as any since the type definitions are slightly different but compatible
          initialIndex={selectedMediaIndex}
          onClose={() => setSelectedMediaIndex(null)}
          author={author}
          content={content}
          timeAgo={timeAgo}
          likesCount={likesCount}
          commentsCount={commentsCount}
          sharesCount={sharesCount ?? 0}
          isLiked={isLiked}
          onLikeToggle={handleLike}
          onShare={handleShare}
        />
      )}
    </article>
  );
}
