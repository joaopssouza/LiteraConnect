'use client';

import { useRef, useState } from 'react';
import { PostCard } from '@/components/PostCard';
import { PenSquare, Book, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { uploadToStorage } from '@/lib/storage';
import { UserSuggestions } from '@/components/UserSuggestions';
import { resolveAvatarUrl } from '@/lib/avatar';
import { useFeed } from '@/hooks/useFeed';

export default function HomeClient() {
  const { user } = useAuth();
  const { posts, loading, isLoadingMore, hasMore, error, loadInitial, sentinelRef } = useFeed();

  const [content, setContent] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
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
          uploadedImageUrl = await uploadToStorage(imageFile, 'post-images');
        } catch {
          alert('Erro ao fazer upload da imagem. Verifique as configurações do Storage.');
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
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao postar');
      }

      setContent('');
      setBookTitle('');
      removeImage();
      loadInitial();
    } catch (error: any) {
      alert('Erro ao postar: ' + error.message);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full border-x border-[var(--border)] min-h-screen bg-[var(--bg-main)]">
      <header className="sticky top-0 z-10 bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-[var(--border)] p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-main)]">Feed de Resenhas</h1>
        <button className="md:hidden bg-brand-2 text-white p-2 rounded-full shadow-lg">
          <PenSquare className="w-5 h-5" />
        </button>
      </header>

      {/* Create Post */}
      {user ? (
        <div className="hidden md:flex gap-4 p-4 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="w-12 h-12 rounded-full bg-brand-2 flex-shrink-0 flex items-center justify-center text-white font-bold overflow-hidden border border-[var(--border)]">
            {user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}</span>
            )}
          </div>
          <form onSubmit={handleCreatePost} className="flex-1">
            <input
              type="text"
              placeholder="Título do livro (opcional)"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-medium text-[var(--text-main)] mb-2 placeholder:text-[var(--text-main)]/20"
            />
            <textarea
              placeholder="O que você está lendo hoje?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="w-full bg-transparent resize-none outline-none text-lg text-[var(--text-main)] placeholder:text-[var(--text-main)]/20 min-h-[80px]"
            />
            {imagePreview && (
              <div className="relative mb-4 inline-block">
                <img src={imagePreview} alt="Preview" className="max-h-64 rounded-xl border border-[var(--border)] object-contain bg-black/5" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
            <div className="flex justify-between items-center mt-2 pt-3 border-t border-[var(--border)]">
              <div className="flex gap-1 text-brand-2">
                <button type="button" className="p-2 hover:bg-[var(--border)]/50 rounded-full transition-colors">
                  <Book className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-[var(--border)]/50 rounded-full transition-colors"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
              </div>
              <button
                type="submit"
                disabled={isPosting || !content.trim()}
                className="bg-brand-2 text-white px-6 py-2 rounded-full font-bold hover:opacity-90 transition-all disabled:opacity-40 shadow-md active:scale-95"
              >
                {isPosting ? 'Postando...' : 'Postar'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-col items-center justify-center p-10 border-b border-[var(--border)] bg-[var(--surface)] text-center">
          <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">Junte-se à conversa</h2>
          <p className="text-[var(--text-main)]/60 mb-6 max-w-sm">Crie uma conta para compartilhar suas resenhas e interagir com outros leitores.</p>
          <Link href="/login" className="bg-brand-2 text-white px-8 py-3 rounded-full font-bold hover:opacity-90 transition-all shadow-lg active:scale-95">
            Começar agora
          </Link>
        </div>
      )}

      <div className="hidden md:block p-4 border-b border-[var(--border)] bg-[var(--surface)]/50">
        <UserSuggestions title="Sugestões para você" />
      </div>

      {/* Lista de Posts */}
      <div className="divide-y divide-[var(--border)]">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4 text-[var(--text-main)]/40">
            <Loader2 className="w-8 h-8 animate-spin text-brand-2" />
            <span className="font-medium">Sincronizando feed...</span>
          </div>
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
                bookCover={post.book_cover_url ?? undefined}
                timeAgo={new Date(post.created_at).toLocaleDateString('pt-BR')}
                likes={post.likes_count ?? 0}
                comments={post.comments_count ?? 0}
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
    </div>
  );
}
