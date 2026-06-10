'use client';

import { useRef, useState } from 'react';
import { PostCard } from '@/components/PostCard';
import { PenSquare, Book, Image as ImageIcon, X, Loader2, Globe, Users, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { uploadMedia } from '@/lib/supabase-storage';
import { UserSuggestions } from '@/components/UserSuggestions';
import { resolveAvatarUrl } from '@/lib/avatar';
import { useFeed } from '@/hooks/useFeed';

const SkeletonPostCard = () => (
  <div className="p-4 border-b border-[var(--border)] animate-pulse flex gap-3">
    <div className="w-10 h-10 rounded-full bg-[var(--border)]/20 shrink-0"></div>
    <div className="flex-1 space-y-3">
      <div className="flex gap-2">
        <div className="h-4 bg-[var(--border)]/20 rounded w-24"></div>
        <div className="h-4 bg-[var(--border)]/20 rounded w-16"></div>
      </div>
      <div className="h-3 bg-[var(--border)]/20 rounded w-full"></div>
      <div className="h-3 bg-[var(--border)]/20 rounded w-5/6"></div>
      <div className="h-48 bg-[var(--border)]/20 rounded w-full mt-2"></div>
    </div>
  </div>
);

const SkeletonPosts = () => (
  <div>
    {[1, 2, 3].map(i => <SkeletonPostCard key={i} />)}
  </div>
);

export default function HomeClient() {
  const { user, profile, signOut } = useAuth();
  const { posts, loading, isLoadingMore, hasMore, error, loadInitial, sentinelRef } = useFeed();

  const [content, setContent] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    setIsPosting(true);
    try {
      let uploadedImageUrl: string | null = null;

      if (imageFile) {
        try {
          uploadedImageUrl = await uploadMedia(imageFile);
        } catch {
          alert('Erro ao fazer upload da imagem no Supabase.');
          return;
        }
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          book_title: bookTitle.trim() || null,
          book_cover_url: uploadedImageUrl,
          visibility,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao postar');
      }

      setContent('');
      setBookTitle('');
      setVisibility('public');
      removeImage();
      loadInitial();
    } catch (error: any) {
      alert('Erro ao postar: ' + error.message);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto w-full min-h-screen bg-[var(--bg-main)] pb-24 lg:flex lg:gap-8 lg:px-4">
      {/* Coluna Principal (Esquerda) */}
      <div className="flex-1 w-full max-w-2xl mx-auto lg:mx-0">
        <header className="sticky top-0 z-10 bg-[var(--bg-main)]/85 backdrop-blur-xl border-b border-[var(--border)]/10 pt-6 pb-4 px-4 sm:px-6 flex items-center justify-between">
          <h1 className="text-[22px] font-black tracking-tight text-[var(--text-main)]">Feed de Resenhas</h1>
        </header>

      {/* Create Post */}
      {user ? (
        <div className="flex gap-4 md:gap-5 px-4 sm:px-6 py-6 border-b border-[var(--border)]/10 bg-[var(--surface)]/30 transition-colors focus-within:bg-[var(--surface)]/60">
          <div className="w-12 h-12 rounded-full bg-brand-2 flex-shrink-0 flex items-center justify-center text-white font-bold overflow-hidden shadow-sm">
            {user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}</span>
            )}
          </div>
          <form onSubmit={handleCreatePost} className="flex-1 mt-1">
            <input
              type="text"
              placeholder="Título do livro (opcional)"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              className="w-full bg-transparent outline-none text-xl font-bold text-[var(--text-main)] mb-3 placeholder:text-[var(--text-main)]/30 tracking-tight"
            />
            <textarea
              placeholder="O que você está lendo hoje?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="w-full bg-transparent resize-none outline-none text-[1.1rem] leading-relaxed text-[var(--text-main)] placeholder:text-[var(--text-main)]/40 min-h-[100px]"
            />
            {imagePreview && (
              <div className="relative mb-4 inline-block w-full">
                {imageFile?.type.startsWith('video/') ? (
                  <video src={imagePreview} controls className="max-h-64 w-full rounded-xl border border-[var(--border)] object-contain bg-black/5" />
                ) : (
                  <img src={imagePreview} alt="Preview" className="max-h-64 rounded-xl border border-[var(--border)] object-contain bg-black/5" />
                )}
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <input type="file" accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-[var(--border)]/30">
              <div className="flex gap-2 text-[var(--text-main)]/50">
                <button type="button" className="p-2.5 hover:bg-brand-2/10 hover:text-brand-2 rounded-full transition-colors group">
                  <Book className="w-5 h-5 group-active:scale-95 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 hover:bg-brand-2/10 hover:text-brand-2 rounded-full transition-colors group"
                >
                  <ImageIcon className="w-5 h-5 group-active:scale-95 transition-transform" />
                </button>
              </div>

              <div className="flex gap-4 items-center">
                <div className="hidden sm:grid grid-cols-3 relative rounded-full border border-[var(--border)]/40 bg-[var(--surface)]/50 shadow-sm p-1 w-[290px] select-none">
                  {/* Sliding background indicator */}
                  <div 
                    className="absolute top-1 bottom-1 left-1 rounded-full bg-brand-2 shadow-md transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-0"
                    style={{
                      width: 'calc(33.333% - 2.666px)',
                      transform: `translateX(${visibility === 'public' ? '0%' : visibility === 'followers' ? '100%' : '200%'})`
                    }}
                  />
                  
                  <button
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`relative z-10 inline-flex items-center justify-center px-4 py-1.5 text-xs font-bold rounded-full transition-colors duration-300 cursor-pointer ${
                      visibility === 'public' ? 'text-white' : 'text-[var(--text-main)]/50 hover:text-[var(--text-main)]'
                    }`}
                  >
                    <Globe size={14} className="mr-1.5" /> Público
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility('followers')}
                    className={`relative z-10 inline-flex items-center justify-center px-4 py-1.5 text-xs font-bold rounded-full transition-colors duration-300 cursor-pointer ${
                      visibility === 'followers' ? 'text-white' : 'text-[var(--text-main)]/50 hover:text-[var(--text-main)]'
                    }`}
                  >
                    <Users size={14} className="mr-1.5" /> Seguidores
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`relative z-10 inline-flex items-center justify-center px-4 py-1.5 text-xs font-bold rounded-full transition-colors duration-300 cursor-pointer ${
                      visibility === 'private' ? 'text-white' : 'text-[var(--text-main)]/50 hover:text-[var(--text-main)]'
                    }`}
                  >
                    <Lock size={14} className="mr-1.5" /> Privado
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isPosting || !content.trim()}
                  className="bg-brand-2 text-white px-7 py-2.5 rounded-full font-bold hover:opacity-90 hover:scale-[1.02] transition-all disabled:opacity-40 disabled:hover:scale-100 shadow-[0_4px_14px_0_rgba(184,28,46,0.39)] active:scale-95 text-sm"
                >
                  {isPosting ? 'Postando...' : 'Publicar'}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 border-b border-[var(--border)]/40 bg-[var(--surface)]/30 text-center">
          <h2 className="text-2xl font-black text-[var(--text-main)] mb-3 tracking-tight">Participe da conversa</h2>
          <p className="text-[var(--text-main)]/50 mb-8 max-w-sm text-[1.05rem] leading-relaxed">Crie uma conta para compartilhar suas resenhas literárias e interagir com outros leitores apaixonados.</p>
          <Link href="/login" className="bg-brand-2 text-white px-10 py-3.5 rounded-full font-bold hover:opacity-90 hover:scale-[1.02] transition-all shadow-[0_8px_20px_-8px_var(--color-brand-2)] active:scale-95 text-[1.05rem]">
            Começar agora
          </Link>
        </div>
      )}

      {/* Sugestões Mobile/Tablet (Escondido no Desktop onde aparece a sidebar) */}
      <div className="hidden md:block lg:hidden p-4 border-b border-[var(--border)]/10 bg-[var(--surface)]/50">
        <UserSuggestions title="Sugestões para você" />
      </div>

      {/* Lista de Posts */}
      <div className="flex flex-col">
        {loading ? (
          <SkeletonPosts />
        ) : error ? (
          <div className="p-12 text-center text-red-500 font-medium">{error}</div>
        ) : posts.length > 0 ? (
          <>
            {posts.map((post, index) => (
              <PostCard
                key={post.id}
                id={post.id}
                authorId={post.user_id}
                author={{
                  name: post.author?.name || 'Usuário',
                  handle: post.author?.handle || 'usuario',
                  avatar: resolveAvatarUrl(post.author?.avatar_url, post.user_id, 100),
                }}
                content={post.content}
                bookTitle={post.book_title ?? undefined}
                bookCover={post.book_cover_url ?? post.video_url ?? undefined}
                media={post.media}
                createdAt={post.created_at}
                likes={post.likes_count ?? 0}
                comments={post.comments_count ?? 0}
                recent_comments={post.recent_comments}
                reposts={0}
                views={post.views ?? 0}
                shares={post.shares ?? 0}
                imagePriority={index === 0}
              />
            ))}

            <div ref={sentinelRef} className="py-10 flex justify-center text-[var(--text-main)]/30 text-sm font-medium">
              {isLoadingMore ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-2" /> Carregando mais...
                </span>
              ) : hasMore ? (
                <span>Deslize para ver mais</span>
              ) : (
                <span className="bg-[var(--surface)] px-4 py-1.5 rounded-full border border-[var(--border)]">Você chegou ao fim do feed ✨</span>
              )}
            </div>
          </>
        ) : (
          <div className="p-20 text-center text-[var(--text-main)]/40 font-medium">Nenhuma resenha encontrada. Seja o primeiro a postar!</div>
        )}
      </div>
      {/* Fim da Coluna Principal */}
      </div>

      {/* Sidebar (Direita - Desktop) */}
      <div className="hidden lg:block w-[320px] shrink-0 pt-8">
        <div className="sticky top-[88px]">
          {/* Opcional: Perfil do usuário reduzido como no Instagram */}
          {user && (
            <div className="flex items-center gap-4 mb-6 px-2">
              <Link href={`/profile/${profile?.handle || user.user_metadata?.handle || ''}`} className="w-14 h-14 rounded-full bg-[var(--border)]/20 relative overflow-hidden flex-shrink-0 cursor-pointer">
                {profile?.avatar_url || user.user_metadata?.avatar_url ? (
                  <img src={resolveAvatarUrl(profile?.avatar_url || user.user_metadata.avatar_url, profile?.handle || user.user_metadata?.handle || '', 100)} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-[var(--text-main)]">
                    {profile?.name?.charAt(0) || user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/profile/${profile?.handle || user.user_metadata?.handle || ''}`} className="font-bold text-sm text-[var(--text-main)] hover:underline block truncate cursor-pointer">
                  {profile?.handle || user.user_metadata?.handle || 'usuario'}
                </Link>
                <div className="text-sm text-[var(--text-main)]/50 truncate">
                  {(profile?.name || user.user_metadata?.full_name || '').trim().split(/\s+/).slice(0, 2).join(' ')}
                </div>
              </div>
              <button onClick={() => signOut()} className="text-xs font-bold text-red-500 hover:underline cursor-pointer">
                Sair da conta
              </button>
            </div>
          )}
          <UserSuggestions title="Sugestões para você" />
          
          {/* Footer Sidebar */}
          <div className="mt-8 px-2 text-xs text-[var(--text-main)]/40 font-medium leading-relaxed">
            <div className="flex flex-wrap gap-x-2 gap-y-1 mb-4">
              <Link href="/settings/ajuda" className="hover:underline">Ajuda</Link>
              <span>·</span>
              <Link href="/settings/central-privacidade" className="hover:underline">Privacidade</Link>
              <span>·</span>
              <Link href="/termos" className="hover:underline">Termos</Link>
            </div>
            <div className="uppercase tracking-wide">
              © {new Date().getFullYear()} LITERACONNECT
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
