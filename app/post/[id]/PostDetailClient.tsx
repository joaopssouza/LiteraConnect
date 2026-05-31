'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PostCard } from '@/components/PostCard';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { ArrowLeft, Bold, Heart, Italic, MessageCircle, Pencil, Reply, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { resolveAvatarUrl } from '@/lib/avatar';
import { cn } from '@/lib/utils';

type CommentRecord = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
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

type ModalState = {
  open: boolean;
  title: string;
  message: string;
};

const wrapWithMarker = (value: string, marker: '**' | '*') => {
  if (!value.trim()) return `${marker}${marker}`;
  return `${marker}${value}${marker}`;
};

const renderMentionText = (text: string) => {
  return text.split(/(@[a-zA-Z0-9_]+)/g).map((part, index) => {
    if (/^@[a-zA-Z0-9_]+$/.test(part)) {
      return (
        <span key={`${part}-${index}`} className="text-brand-2 font-bold">
          {part}
        </span>
      );
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
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

export default function PostDetailClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const router = useRouter();
  const { user, profile } = useAuth();

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingMainHandle, setReplyingMainHandle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyValues, setReplyValues] = useState<Record<string, string>>({});
  const [isReplyPostingFor, setIsReplyPostingFor] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentValue, setEditCommentValue] = useState('');
  const [isSavingCommentId, setIsSavingCommentId] = useState<string | null>(null);
  const [isDeletingCommentId, setIsDeletingCommentId] = useState<string | null>(null);
  const [likeLoadingMap, setLikeLoadingMap] = useState<Record<string, boolean>>({});
  const [threadLimits, setThreadLimits] = useState<Record<string, number>>({});
  const [modalState, setModalState] = useState<ModalState>({ open: false, title: '', message: '' });
  const mainCommentInputRef = useRef<HTMLTextAreaElement | null>(null);

  const threadComments = useMemo(() => buildCommentTree(comments), [comments]);

  const toggleThread = (commentId: string, action: 'expand' | 'collapse') => {
    setThreadLimits(prev => ({
      ...prev,
      [commentId]: action === 'collapse' ? 0 : (prev[commentId] || 0) + 20
    }));
  };

  const openModal = (title: string, message: string) => {
    setModalState({ open: true, title, message });
  };

  const redirectReplyToMainComposer = (handle?: string) => {
    if (!handle) return;

    setReplyingTo(null);
    setReplyingMainHandle(handle);
    setNewComment((prev) => {
      const mention = `@${handle}`;
      if (!prev.trim()) {
        return `${mention} `;
      }
      return prev.includes(mention) ? prev : `${mention} ${prev}`;
    });

    requestAnimationFrame(() => {
      mainCommentInputRef.current?.focus();
      const length = mainCommentInputRef.current?.value.length || 0;
      mainCommentInputRef.current?.setSelectionRange(length, length);
      mainCommentInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  useEffect(() => {
    if (id) {
      fetchPostAndComments();
    }
  }, [id]);

  useEffect(() => {
    if (searchParams.get('success') === 'tip') {
      openModal('Obrigado pelo seu apoio! 💖', 'Sua gorjeta foi enviada com sucesso ao autor.');
      
      // Remove o parâmetro da URL de forma silenciosa para não recarregar
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  const fetchPostAndComments = async () => {
    setLoading(true);
    try {
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          author:users!posts_user_id_fkey (
            name,
            handle,
            avatar_url
          ),
          likes(count),
          comments(count)
        `)
        .eq('id', id)
        .single();

      if (postError) {
        console.error('Erro Supabase Post:', postError);
        throw postError;
      }

      // Mescla views do Redis (tempo real) com views_count do banco
      let mergedPost = postData;
      try {
        const viewsRes = await fetch(`/api/posts/${id}/views`);
        if (viewsRes.ok) {
          const { views } = await viewsRes.json();
          mergedPost = {
            ...postData,
            views: Math.max(postData?.views_count ?? 0, views ?? 0),
          };
        } else {
          mergedPost = { ...postData, views: postData?.views_count ?? 0 };
        }
      } catch {
        mergedPost = { ...postData, views: postData?.views_count ?? 0 };
      }
      setPost(mergedPost);


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
        .eq('post_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Erro Supabase Comments:', commentsError);
        throw commentsError;
      }

      const commentRows = (commentsData || []) as Omit<CommentRecord, 'likes_count' | 'liked_by_me'>[];
      const commentIds = commentRows.map((comment) => comment.id);

      let likesCountMap = new Map<string, number>();
      let likedByMeSet = new Set<string>();

      if (commentIds.length > 0) {
        const { data: likesRows, error: likesError } = await supabase
          .from('comment_likes')
          .select('comment_id, user_id')
          .in('comment_id', commentIds);

        if (!likesError) {
          (likesRows || []).forEach((row: any) => {
            likesCountMap.set(row.comment_id, (likesCountMap.get(row.comment_id) || 0) + 1);
            if (user && row.user_id === user.id) {
              likedByMeSet.add(row.comment_id);
            }
          });
        }
      }

      const enrichedComments: CommentRecord[] = commentRows.map((comment) => ({
        ...comment,
        likes_count: likesCountMap.get(comment.id) || 0,
        liked_by_me: likedByMeSet.has(comment.id),
      }));

      setComments(enrichedComments);
    } catch (error) {
      console.error('Erro ao buscar post:', error);
    } finally {
      setLoading(false);
    }
  };

  const createComment = async (content: string, parentId: string | null = null) => {
    if (!user || !content.trim()) return;
    const { error } = await supabase.from('comments').insert([
      {
        post_id: id,
        user_id: user.id,
        parent_id: parentId,
        content,
      },
    ]);
    if (error) throw error;
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    setIsPosting(true);
    try {
      await createComment(newComment, null);
      setNewComment('');
      setReplyingMainHandle(null);
      await fetchPostAndComments();
    } catch (error: any) {
      openModal('Erro ao comentar', error.message);
    } finally {
      setIsPosting(false);
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    const replyValue = (replyValues[parentId] || '').trim();
    if (!replyValue || !user) return;
    setIsReplyPostingFor(parentId);
    try {
      await createComment(replyValue, parentId);
      setReplyValues((prev) => ({ ...prev, [parentId]: '' }));
      setReplyingTo(null);
      await fetchPostAndComments();
    } catch (error: any) {
      openModal('Erro ao responder', error.message);
    } finally {
      setIsReplyPostingFor(null);
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (!user || likeLoadingMap[commentId]) return;
    const target = comments.find((c) => c.id === commentId);
    if (!target) return;
    const willLike = !target.liked_by_me;
    setLikeLoadingMap((prev) => ({ ...prev, [commentId]: true }));
    setComments((prev) =>
      prev.map((c) => (c.id !== commentId ? c : { ...c, liked_by_me: willLike, likes_count: Math.max(0, c.likes_count + (willLike ? 1 : -1)) }))
    );
    try {
      if (willLike) {
        await supabase.from('comment_likes').insert([{ comment_id: commentId, user_id: user.id }]);
      } else {
        await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
      }
    } catch (error: any) {
      setComments((prev) =>
        prev.map((c) => (c.id !== commentId ? c : { ...c, liked_by_me: !willLike, likes_count: Math.max(0, c.likes_count + (willLike ? -1 : 1)) }))
      );
    } finally {
      setLikeLoadingMap((prev) => ({ ...prev, [commentId]: false }));
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
      openModal('Erro ao editar', error.message);
    } finally {
      setIsSavingCommentId(null);
    }
  };

  const softDeleteComment = async (commentId: string) => {
    if (!user || isDeletingCommentId) return;
    setIsDeletingCommentId(commentId);
    try {
      const now = new Date().toISOString();
      await supabase.from('comments').update({ deleted_at: now }).eq('id', commentId).eq('user_id', user.id);
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, deleted_at: now } : c)));
    } catch (error: any) {
      openModal('Erro ao excluir', error.message);
    } finally {
      setIsDeletingCommentId(null);
    }
  };

  const formatRelative = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const renderCommentNode = (comment: ThreadComment, depth = 0): React.ReactNode => {
    const isOwnerComment = user?.id === comment.user_id;
    const isDeleted = !!comment.deleted_at;
    const isEditing = editingCommentId === comment.id;
    const replyValue = replyValues[comment.id] || '';
    const canInlineReply = depth === 0;
    const showReplyComposer = canInlineReply && replyingTo === comment.id && !!user && !isDeleted;

    const limit = threadLimits[comment.id] || 0;
    const isExpanded = limit > 0;
    const visibleChildren = comment.children.slice(0, limit);
    const hasMore = visibleChildren.length < comment.children.length;

    return (
      <div key={comment.id} className={depth > 0 ? 'ml-6 md:ml-10 pl-4 border-l border-[var(--border)] mt-4' : ''}>
        <div className="p-4 bg-[var(--bg-main)] hover:bg-[var(--surface)] transition-colors rounded-2xl group">
          <div className="flex gap-3">
            <Link href={`/profile/${comment.author?.handle}`}>
              <div className="relative w-10 h-10 flex-shrink-0">
                <Image src={resolveAvatarUrl(comment.author?.avatar_url, comment.user_id, 100)} alt="" fill className="rounded-full object-cover border border-[var(--border)]" />
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link href={`/profile/${comment.author?.handle}`} className="font-bold text-[var(--text-main)] hover:underline text-sm">
                  {comment.author?.name}
                </Link>
                <span className="text-[var(--text-main)]/40 text-xs">@{comment.author?.handle}</span>
                <span className="text-[var(--text-main)]/40 text-xs">· {formatRelative(comment.created_at)}</span>
              </div>

              {isEditing && !isDeleted ? (
                <div className="mt-2 space-y-3">
                  <textarea
                    value={editCommentValue}
                    onChange={(e) => setEditCommentValue(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-2/30 min-h-24 resize-none transition-all"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingCommentId(null)} className="px-4 py-1.5 rounded-full text-xs font-bold text-[var(--text-main)]/60 hover:bg-[var(--surface)] transition-colors">Cancelar</button>
                    <button onClick={() => saveCommentEdit(comment.id)} className="px-4 py-1.5 rounded-full text-xs font-bold bg-brand-2 text-white hover:opacity-90">Salvar</button>
                  </div>
                </div>
              ) : (
                <p className={cn("mt-1.5 text-sm leading-relaxed", isDeleted ? "text-[var(--text-main)]/30 italic" : "text-[var(--text-main)]")}>
                  {isDeleted ? 'Comentário removido.' : renderMentionText(comment.content)}
                </p>
              )}

              {!isDeleted && (
                <div className="mt-3 flex items-center gap-5 text-[var(--text-main)]/40">
                  <button onClick={() => handleToggleCommentLike(comment.id)} className={cn("flex items-center gap-1.5 text-xs hover:text-brand-2 transition-colors", comment.liked_by_me && "text-brand-2")}>
                    <Heart className={cn("w-4 h-4", comment.liked_by_me && "fill-current")} />
                    <span>{comment.likes_count}</span>
                  </button>
                  {canInlineReply && (
                    <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="flex items-center gap-1.5 text-xs hover:text-brand-2 transition-colors">
                      <Reply className="w-4 h-4" /> <span>Responder</span>
                    </button>
                  )}
                  {isOwnerComment && (
                    <button onClick={() => startCommentEdit(comment)} className="flex items-center gap-1.5 text-xs hover:text-brand-2 transition-colors">
                      <Pencil className="w-4 h-4" /> <span>Editar</span>
                    </button>
                  )}
                  {isOwnerComment && (
                    <button onClick={() => softDeleteComment(comment.id)} className="flex items-center gap-1.5 text-xs hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" /> <span>Lixeira</span>
                    </button>
                  )}
                </div>
              )}

              {showReplyComposer && (
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                  <textarea
                    value={replyValue}
                    onChange={(e) => setReplyValues((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                    placeholder="Escreva sua resposta..."
                    className="w-full bg-transparent resize-none outline-none text-sm text-[var(--text-main)] min-h-[80px] placeholder:text-[var(--text-main)]/20"
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <button onClick={() => setReplyingTo(null)} className="px-4 py-1.5 rounded-full text-xs font-bold text-[var(--text-main)]/60 hover:bg-[var(--bg-main)]">Cancelar</button>
                    <button onClick={() => handleReplySubmit(comment.id)} className="px-6 py-1.5 rounded-full text-xs font-bold bg-brand-2 text-white hover:opacity-90">Enviar</button>
                  </div>
                </div>
              )}

              {comment.children.length > 0 && depth === 0 && (
                <div className="mt-2">
                  {!isExpanded ? (
                    <button 
                      onClick={() => toggleThread(comment.id, 'expand')} 
                      className="flex items-center gap-2 text-xs font-semibold text-brand-2 hover:opacity-80 transition-colors py-2"
                    >
                      <div className="w-8 h-px bg-brand-2/30" />
                      Ver {comment.children.length} resposta{comment.children.length > 1 ? 's' : ''}
                    </button>
                  ) : (
                    <div className="flex flex-col">
                      {visibleChildren.map((child) => renderCommentNode(child, depth + 1))}
                      
                      <div className="flex items-center justify-between mt-2 pl-6 md:ml-10">
                        {hasMore ? (
                          <button 
                            onClick={() => toggleThread(comment.id, 'expand')} 
                            className="text-xs font-semibold text-brand-2 hover:opacity-80 transition-colors"
                          >
                            Ver mais respostas
                          </button>
                        ) : <span/>}
                        <button 
                          onClick={() => toggleThread(comment.id, 'collapse')} 
                          className="text-xs font-semibold text-[var(--text-main)]/40 hover:text-[var(--text-main)] transition-colors"
                        >
                          Ocultar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="max-w-2xl mx-auto w-full border-x border-[var(--border)] min-h-screen bg-[var(--bg-main)] p-12 text-center text-[var(--text-main)]/40 italic">Carregando resenha...</div>;
  }

  if (!post) {
    return <div className="max-w-2xl mx-auto w-full border-x border-[var(--border)] min-h-screen bg-[var(--bg-main)] p-12 text-center text-[var(--text-main)]/40">Resenha não encontrada.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto w-full border-x border-[var(--border)] min-h-screen bg-[var(--bg-main)]">
      <header className="sticky top-0 z-10 bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-[var(--border)] p-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-[var(--surface)] rounded-full transition-colors text-[var(--text-main)]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-[var(--text-main)]">Resenha</h1>
      </header>

      <PostCard 
        id={post.id}
        authorId={post.user_id}
        author={{
          name: post.author?.name || 'Usuário',
          handle: post.author?.handle || 'usuario',
          avatar: resolveAvatarUrl(post.author?.avatar_url, post.user_id, 100)
        }}
        content={post.content}
        bookTitle={post.book_title}
        bookCover={post.book_cover_url ?? post.video_url}
        media={post.media}
        timeAgo={new Date(post.created_at).toLocaleDateString('pt-BR')}
        likes={post.likes?.[0]?.count ?? 0}
        comments={comments.length}
        reposts={0}
        views={post.views ?? 0}
        shares={post.shares ?? 0}
        hideCommentInput={true}
      />

      {user ? (
        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden border border-[var(--border)] relative bg-[var(--border)]/20">
              <Image
                src={resolveAvatarUrl(profile?.avatar_url || user.user_metadata?.avatar_url, profile?.handle || user.user_metadata?.handle, 100)}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <form onSubmit={handleCommentSubmit} className="flex-1 flex flex-col items-end">
              <textarea 
                ref={mainCommentInputRef}
                placeholder={replyingMainHandle ? `Respondendo @${replyingMainHandle}...` : 'O que você achou dessa leitura?'}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                required
                className="w-full bg-transparent resize-none outline-none text-sm text-[var(--text-main)] placeholder:text-[var(--text-main)]/20 min-h-[80px] leading-relaxed"
              />
              <div className="mt-2 flex items-center gap-2">
                {replyingMainHandle && (
                  <button type="button" onClick={() => { setReplyingMainHandle(null); setNewComment(''); }} className="px-4 py-1.5 rounded-full border border-[var(--border)] text-xs font-bold text-[var(--text-main)]/60 hover:bg-[var(--bg-main)]">Cancelar</button>
                )}
                <button type="submit" disabled={isPosting || !newComment.trim()} className="bg-brand-2 text-white px-6 py-1.5 rounded-full text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-all active:scale-95 shadow-md">Comentar</button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="p-10 border-b border-[var(--border)] bg-[var(--surface)] text-center">
          <Link href="/login" className="bg-brand-2 text-white px-8 py-2.5 rounded-full text-sm font-bold hover:opacity-90 shadow-lg">Entrar para comentar</Link>
        </div>
      )}

      <div className="divide-y divide-[var(--border)] bg-[var(--bg-main)]">
        {threadComments.length > 0 ? (
          threadComments.map((comment) => renderCommentNode(comment))
        ) : (
          <div className="p-20 text-center text-[var(--text-main)]/30 font-medium italic">Nenhum comentário por aqui ainda.</div>
        )}
      </div>

      {modalState.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--surface)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">{modalState.title}</h3>
              <p className="text-[var(--text-main)]/60 text-sm">{modalState.message}</p>
            </div>
            <div className="p-4 bg-[var(--border)]/5 border-t border-[var(--border)] flex justify-end">
              <button onClick={() => setModalState(prev => ({ ...prev, open: false }))} className="px-8 py-2 rounded-full bg-brand-2 text-white font-bold hover:opacity-90">Entendi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
