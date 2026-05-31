'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { resolveAvatarUrl } from '@/lib/avatar';
import { X, Heart, Reply, Trash2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ReelCommentsDrawerProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
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

export default function ReelCommentsDrawer({ postId, isOpen, onClose }: ReelCommentsDrawerProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [threadLimits, setThreadLimits] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const replyingComment = replyingTo ? comments.find(c => c.id === replyingTo) : null;

  const toggleThread = (commentId: string, action: 'expand' | 'collapse') => {
    setThreadLimits(prev => ({
      ...prev,
      [commentId]: action === 'collapse' ? 0 : (prev[commentId] || 0) + 20
    }));
  };

  const handleReplyClick = (comment: CommentRecord) => {
    if (replyingTo === comment.id) {
      setReplyingTo(null);
      setNewComment('');
    } else {
      setReplyingTo(comment.id);
      if (comment.author?.handle) {
        setNewComment(`@${comment.author.handle} `);
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  useEffect(() => {
    if (isOpen && postId) {
      fetchComments();
    }
  }, [isOpen, postId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          *,
          author:users!comments_user_id_fkey (
            name,
            handle,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      const commentRows = (commentsData || []) as Omit<CommentRecord, 'likes_count' | 'liked_by_me'>[];
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

      setComments(commentRows.map(c => ({
        ...c,
        likes_count: likesCountMap.get(c.id) || 0,
        liked_by_me: likedByMeSet.has(c.id),
      })));
    } catch (e) {
      console.error('Erro ao buscar comentários:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    setIsPosting(true);
    try {
      const parentId = replyingComment?.parent_id || replyingTo;
      const { data: insertedComment } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content: newComment,
        parent_id: parentId,
      }).select('id').single();

      if (parentId) {
        setThreadLimits(prev => ({
          ...prev,
          [parentId]: Math.max(prev[parentId] || 0, 20)
        }));
      }

      // Notificações (fire-and-forget)
      if (insertedComment) {
        (async () => {
          try {
            const notificationsToInsert: object[] = [];
            const { data: postOwner } = await supabase
              .from('posts').select('user_id').eq('id', postId).single();
            const postOwnerId = postOwner?.user_id;
            if (postOwnerId && postOwnerId !== user.id) {
              notificationsToInsert.push({
                user_id: postOwnerId, actor_id: user.id,
                type: parentId ? 'reply' : 'comment',
                post_id: postId, comment_id: insertedComment.id,
              });
            }
            if (parentId) {
              const { data: parentComment } = await supabase
                .from('comments').select('user_id').eq('id', parentId).single();
              if (parentComment?.user_id && parentComment.user_id !== user.id && parentComment.user_id !== postOwnerId) {
                notificationsToInsert.push({
                  user_id: parentComment.user_id, actor_id: user.id,
                  type: 'reply', post_id: postId, comment_id: insertedComment.id,
                });
              }
            }
            const mentionMatches = newComment.match(/@([a-zA-Z0-9_]+)/g);
            if (mentionMatches?.length) {
              const handles = [...new Set(mentionMatches.map((m: string) => m.slice(1)))];
              const { data: mentionedUsers } = await supabase
                .from('users').select('id').in('handle', handles);
              for (const mu of mentionedUsers || []) {
                const alreadyNotified = notificationsToInsert.some((n: any) => n.user_id === mu.id);
                if (!alreadyNotified && mu.id !== user.id) {
                  notificationsToInsert.push({
                    user_id: mu.id, actor_id: user.id,
                    type: 'mention', post_id: postId, comment_id: insertedComment.id,
                  });
                }
              }
            }
            if (notificationsToInsert.length > 0) {
              await supabase.from('notifications').insert(notificationsToInsert);
            }
          } catch (notifErr) {
            console.error('[Reels] Erro ao criar notificações:', notifErr);
          }
        })();
      }

      setNewComment('');
      setReplyingTo(null);
      await fetchComments();
    } catch (e) {
      console.error('Erro ao comentar:', e);
    } finally {
      setIsPosting(false);
    }
  };


  const handleToggleLike = async (commentId: string) => {
    if (!user) return;
    const target = comments.find(c => c.id === commentId);
    if (!target) return;
    
    const willLike = !target.liked_by_me;
    setComments(prev => prev.map(c => c.id !== commentId ? c : { 
      ...c, 
      liked_by_me: willLike, 
      likes_count: Math.max(0, c.likes_count + (willLike ? 1 : -1)) 
    }));

    try {
      if (willLike) {
        await supabase.from('comment_likes').insert([{ comment_id: commentId, user_id: user.id }]);
      } else {
        await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
      }
    } catch (e) {
      // reverte em caso de erro
      setComments(prev => prev.map(c => c.id !== commentId ? c : { 
        ...c, 
        liked_by_me: !willLike, 
        likes_count: Math.max(0, c.likes_count + (willLike ? -1 : 1)) 
      }));
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user) return;
    try {
      await supabase.from('comments').update({ deleted_at: new Date().toISOString() }).eq('id', commentId).eq('user_id', user.id);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (e) {
      console.error('Erro ao deletar:', e);
    }
  };

  const [drawerHeight, setDrawerHeight] = useState(70); // in vh

  const handleDrag = (e: any) => {
    if (e.touches && e.touches.length > 0) {
      const touchY = e.touches[0].clientY;
      const vh = (1 - touchY / window.innerHeight) * 100;
      if (vh > 30 && vh < 95) {
        setDrawerHeight(vh);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm md:hidden" onClick={onClose} />
      <div 
        className="fixed bottom-0 left-0 right-0 md:left-auto md:right-0 md:top-0 z-[110] w-full md:w-96 md:h-full bg-zinc-950 border-t md:border-t-0 md:border-l border-zinc-800 rounded-t-3xl md:rounded-none flex flex-col shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-300"
        style={{ height: window.innerWidth < 768 ? `${drawerHeight}vh` : '100%' }}
      >
        
        {/* Drag Handle (Mobile only) */}
        <div 
          className="md:hidden w-full h-8 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
          onTouchMove={handleDrag}
        >
          <div className="w-12 h-1.5 bg-zinc-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 pt-2 md:pt-4 border-b border-zinc-800">
          <h3 className="text-white font-bold text-center flex-1">Comentários</h3>
          <button onClick={onClose} className="p-2 -mr-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Comentários */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 rounded-full border-2 border-brand-2/20 border-t-brand-2 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-zinc-500 py-10 text-sm">
              Nenhum comentário por enquanto. <br/> Seja o primeiro a comentar!
            </div>
          ) : (
            <div className="space-y-4">
              {comments.filter(c => !c.parent_id).map(comment => {
                const childComments = comments.filter(c => c.parent_id === comment.id);
                
                const renderCommentItem = (c: CommentRecord, isChild = false) => (
                  <div key={c.id} className={cn("flex gap-3 animate-in fade-in duration-300", isChild && "mt-3")}>
                    <Link href={`/profile/${c.author?.handle}`}>
                      <div className={cn("rounded-full overflow-hidden relative border border-white/10 shrink-0", isChild ? "w-6 h-6 mt-1" : "w-8 h-8")}>
                        <Image src={resolveAvatarUrl(c.author?.avatar_url, c.user_id, 80)} alt="" fill className="object-cover" />
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <Link href={`/profile/${c.author?.handle}`} className="font-semibold text-white/90 text-[13px] hover:underline">
                          {c.author?.name}
                        </Link>
                        <span className="text-zinc-500 text-[11px]">{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <p className="text-white/80 text-sm mt-0.5 whitespace-pre-wrap">{c.content}</p>
                      
                      <div className="flex items-center gap-4 mt-2">
                        <button onClick={() => handleToggleLike(c.id)} className={cn("flex items-center gap-1.5 text-xs transition-colors", c.liked_by_me ? "text-brand-2" : "text-zinc-500 hover:text-white")}>
                          <Heart className={cn("w-3.5 h-3.5", c.liked_by_me && "fill-current")} />
                          <span>{c.likes_count}</span>
                        </button>
                        <button onClick={() => handleReplyClick(c)} className="text-zinc-500 hover:text-white text-[11px] font-medium transition-colors">
                          Responder
                        </button>
                        {user?.id === c.user_id && (
                          <button onClick={() => handleDelete(c.id)} className="text-zinc-500 hover:text-red-500 text-[11px] font-medium transition-colors">
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );

                const limit = threadLimits[comment.id] || 0;
                const visibleChildren = childComments.slice(0, limit);
                const isExpanded = limit > 0;
                const hasMore = visibleChildren.length < childComments.length;

                return (
                  <div key={comment.id} className="flex flex-col">
                    {renderCommentItem(comment)}
                    {childComments.length > 0 && (
                      <div className="ml-10 flex flex-col mt-1">
                        {!isExpanded && (
                          <button 
                            onClick={() => toggleThread(comment.id, 'expand')} 
                            className="flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-white transition-colors py-1 w-fit"
                          >
                            <div className="w-6 h-px bg-zinc-700" />
                            Ver {childComments.length} resposta{childComments.length > 1 ? 's' : ''}
                          </button>
                        )}
                        
                        {isExpanded && (
                          <div className="pl-3 border-l border-zinc-800 flex flex-col mt-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            {visibleChildren.map(child => renderCommentItem(child, true))}
                            
                            <div className="flex items-center justify-between mt-2 max-w-full">
                              {hasMore ? (
                                <button 
                                  onClick={() => toggleThread(comment.id, 'expand')} 
                                  className="flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-white transition-colors py-1"
                                >
                                  <div className="w-6 h-px bg-zinc-700" />
                                  Ver mais respostas ({childComments.length - visibleChildren.length} restantes)
                                </button>
                              ) : <span/>}
                              <button 
                                onClick={() => toggleThread(comment.id, 'collapse')} 
                                className="text-xs font-semibold text-zinc-500 hover:text-white transition-colors py-1 ml-auto shrink-0"
                              >
                                Ocultar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Composer de Comentários */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 pb-safe">
          {user ? (
            <form onSubmit={handleSubmit} className="relative">
              {replyingComment && (
                <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 p-2.5 px-4 rounded-t-2xl text-xs text-zinc-400 mb-[-12px] pb-4 backdrop-blur-md">
                  <span className="flex items-center gap-1.5">
                    <Reply className="w-3.5 h-3.5" />
                    Respondendo a <span className="font-semibold text-white">@{replyingComment.author?.handle}</span>
                  </span>
                  <button type="button" onClick={() => { setReplyingTo(null); setNewComment(''); }} className="text-zinc-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full p-1 pl-4 z-10 relative shadow-lg">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Adicione um comentário..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isPosting}
                  className="w-8 h-8 rounded-full bg-brand-2 flex items-center justify-center text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center p-3 bg-zinc-900 rounded-xl">
              <Link href="/login" className="text-brand-2 text-sm font-bold hover:underline">
                Entre para comentar
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
