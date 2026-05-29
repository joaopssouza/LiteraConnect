'use client';

import Image from 'next/image';
import { Bell, BellOff, Bookmark, EyeOff, Heart, Link2, MessageCircle, Pencil, Repeat2, Share, Shield, Trash2 } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { resolveAvatarUrl } from '@/lib/avatar';
import { queueView } from '@/lib/view-buffer';

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
  likes: number;
  comments: number;
  reposts: number;
  views?: number;
  shares?: number;
  timeAgo: string;
  skipFetchCounts?: boolean;
  imagePriority?: boolean;
  onLocalPostPreferenceChange?: () => void;
}

export function PostCard({ id, authorId, author, content, bookTitle, bookCover, likes: initialLikes, comments: initialComments, reposts, views, shares, timeAgo, skipFetchCounts = false, imagePriority = false, onLocalPostPreferenceChange }: PostProps) {
  const { user } = useAuth();
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
    } catch (e) {}
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
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

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
      onClick={handleCardClick}
      className="p-4 border-b border-[var(--border)] bg-[var(--surface)] hover:opacity-95 transition-opacity cursor-pointer"
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
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--text-main)] hover:underline" onClick={handleProfileClick}>
                {author.name}
              </span>
              <span className="text-[var(--text-main)]/60 text-sm" onClick={handleProfileClick}>
                @{author.handle}
              </span>
              <span className="text-[var(--text-main)]/60 text-sm">· {timeAgo}</span>
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
          
          {bookTitle && (
            <div className="mt-1 mb-2 inline-flex items-center gap-2 bg-brand-2/10 px-3 py-1 rounded-full text-sm font-medium text-brand-2 border border-brand-2/20">
              📚 Lendo: {bookTitle}
            </div>
          )}

          <div className="mt-2 text-[var(--text-main)] whitespace-pre-wrap leading-relaxed">
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

          {bookCover && !repostPreview && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-[var(--border)] relative w-full aspect-[16/9] bg-[var(--border)]/10">
              <Image src={bookCover} alt="Capa" fill className="object-cover" unoptimized priority={imagePriority} />
            </div>
          )}

          <div className="flex items-center justify-between mt-4 text-[var(--text-main)]/60 max-w-md">
            <button onClick={handleLike} className={cn("flex items-center gap-2 transition-colors hover:text-brand-2", isLiked && "text-brand-2")}>
              <div className={cn("p-2 rounded-full", isLiked ? "bg-brand-2/10" : "hover:bg-brand-2/10")}>
                <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
              </div>
              <span className="text-sm">{likesCount}</span>
            </button>
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
                className="px-6 py-2 rounded-full font-medium text-[var(--text-main)]/60 hover:bg-[var(--border)]/10 transition-colors"
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
    </article>
  );
}
