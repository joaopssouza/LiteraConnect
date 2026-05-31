'use client';

import { Search, Loader2, Clock, TrendingUp, LayoutGrid, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PostCard } from '@/components/PostCard';
import { UserSuggestions } from '@/components/UserSuggestions';
import { resolveAvatarUrl } from '@/lib/avatar';
import { useSearch, SearchFilter } from '@/hooks/useSearch';
import { cn } from '@/lib/utils';

function AutoPlayVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      className="w-full h-full object-cover"
      muted
      loop
      playsInline
      disablePictureInPicture
      controlsList="nodownload"
    />
  );
}

const PERIOD_OPTIONS: { label: string; value: SearchFilter['period'] }[] = [
  { label: 'Qualquer época', value: 'all' },
  { label: 'Esta semana', value: '7d' },
  { label: 'Este mês', value: '30d' },
  { label: 'Últimos 3 meses', value: '90d' },
];

const SORT_OPTIONS: { label: string; value: SearchFilter['sort']; icon: React.ReactNode }[] = [
  { label: 'Mais recentes', value: 'recent', icon: <Clock className="w-4 h-4" /> },
  { label: 'Mais curtidos', value: 'popular', icon: <TrendingUp className="w-4 h-4" /> },
];

export default function ExploreClient() {
  const { query, setQuery, filters, setFilters, results, trending, isSearching, error } = useSearch();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);

  const hasQuery = query.trim().length > 0;

  // Buscar recomendações personalizadas
  useEffect(() => {
    if (hasQuery) return;
    setIsLoadingRecs(true);
    fetch('/api/recommendations?limit=6')
      .then((r) => r.ok ? r.json() : { posts: [] })
      .then((data) => setRecommendations(data.posts || []))
      .catch(() => {})
      .finally(() => setIsLoadingRecs(false));
  }, [hasQuery]);

  return (
    <div className="max-w-2xl mx-auto w-full border-x border-[var(--border)] min-h-screen bg-[var(--bg-main)]">
      {/* Header com campo de busca sticky */}
      <header className="sticky top-0 z-10 bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-[var(--border)] p-4 space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-main)]/30 w-5 h-5 group-focus-within:text-brand-2 transition-colors" />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-2 w-4 h-4 animate-spin" />
          )}
          <input
            type="text"
            placeholder="Buscar resenhas, livros ou autores..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl py-3 pl-12 pr-12 outline-none focus:ring-2 focus:ring-brand-2/30 focus:border-brand-2 transition-all text-[var(--text-main)] placeholder:text-[var(--text-main)]/20 shadow-sm"
          />
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilters({ ...filters, period: opt.value })}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95",
                filters.period === opt.value
                  ? "bg-brand-2 text-white border-brand-2 shadow-md shadow-brand-2/20"
                  : "bg-[var(--surface)] text-[var(--text-main)]/60 border-[var(--border)] hover:bg-[var(--border)]/50"
              )}
            >
              {opt.label}
            </button>
          ))}

          <div className="w-px h-4 bg-[var(--border)] mx-1 shrink-0" />

          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilters({ ...filters, sort: opt.value })}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95",
                filters.sort === opt.value
                  ? "bg-brand-2 text-white border-brand-2 shadow-md shadow-brand-2/20"
                  : "bg-[var(--surface)] text-[var(--text-main)]/60 border-[var(--border)] hover:bg-[var(--border)]/50"
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4 space-y-10">
        {error && (
          <div className="text-sm text-red-500 bg-red-500/10 px-4 py-3 rounded-xl border border-red-500/20 font-medium">
            {error}
          </div>
        )}

        {/* Resultados de busca */}
        {hasQuery && (
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                Resultados
                {results.length > 0 && (
                  <span className="text-sm font-bold text-[var(--text-main)]/30 bg-[var(--surface)] px-2 py-0.5 rounded-lg border border-[var(--border)]">
                    {results.length}
                  </span>
                )}
              </h2>
            </div>
            {results.length === 0 && !isSearching ? (
              <div className="text-center py-20 bg-[var(--surface)] rounded-3xl border border-[var(--border)] border-dashed">
                <LayoutGrid className="w-12 h-12 mx-auto mb-4 text-[var(--text-main)]/10" />
                <p className="text-[var(--text-main)]/60 font-bold">Nenhum resultado para &ldquo;{query}&rdquo;</p>
                <p className="text-xs text-[var(--text-main)]/30 mt-1">Tente termos diferentes ou mude os filtros</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--surface)]">
                {results.map((post) => (
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
                    bookTitle={post.book_title || undefined}
                    bookCover={post.book_cover_url || post.video_url || undefined}
                    media={post.media}
                    timeAgo={new Date(post.created_at).toLocaleDateString('pt-BR')}
                    likes={post.likes_count ?? 0}
                    comments={post.comments_count ?? 0}
                    reposts={0}
                    views={post.views ?? 0}
                    shares={post.shares ?? 0}
                    skipFetchCounts
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Seção: Para Você (Recomendações Personalizadas) */}
        {!hasQuery && (
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-black text-[var(--text-main)] mb-5 flex items-center gap-2 px-1">
              <Sparkles className="w-6 h-6 text-brand-2" />
              Para Você
              <span className="text-xs font-normal text-[var(--text-main)]/40 ml-1">
                personalizado
              </span>
            </h2>
            {isLoadingRecs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-brand-2" />
              </div>
            ) : recommendations.length > 0 ? (
              <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--surface)]">
                {recommendations.map((post: any) => (
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
                    bookTitle={post.book_title || undefined}
                    bookCover={post.book_cover_url || undefined}
                    media={post.media}
                    timeAgo={new Date(post.created_at).toLocaleDateString('pt-BR')}
                    likes={post.likes_count ?? 0}
                    comments={post.comments_count ?? 0}
                    reposts={0}
                    views={0}
                    shares={0}
                    skipFetchCounts
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-[var(--surface)] rounded-3xl border border-[var(--border)] border-dashed">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-[var(--text-main)]/10" />
                <p className="text-sm text-[var(--text-main)]/50 font-medium">
                  Interaja com posts para personalizar suas recomendações
                </p>
              </div>
            )}
          </section>
        )}

        {/* Carousel de Trending */}
        <section>
          <h2 className="text-xl font-black text-[var(--text-main)] mb-5 flex items-center gap-2 px-1">
            <TrendingUp className="w-6 h-6 text-brand-2" />
            Em alta no momento
          </h2>
          {trending.length === 0 ? (
            <div className="p-10 text-center bg-[var(--surface)] rounded-3xl border border-[var(--border)] text-[var(--text-main)]/20 font-bold italic">
              Buscando tendências...
            </div>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-4 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {trending.map((post) => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="flex flex-col gap-3 cursor-pointer group shrink-0 w-[220px]"
                >
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-[var(--border)] shadow-sm group-hover:shadow-2xl group-hover:shadow-brand-2/10 transition-all group-hover:-translate-y-1 bg-[var(--surface)]">
                    {(post.media && post.media.length > 0) ? (
                      post.media[0].type === 'video' ? (
                        <AutoPlayVideo src={post.media[0].url} />
                      ) : (
                        <Image
                          src={post.media[0].url}
                          alt=""
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                          sizes="220px"
                        />
                      )
                    ) : post.video_url ? (
                      <AutoPlayVideo src={post.video_url} />
                    ) : post.book_cover_url ? (
                      <Image
                        src={post.book_cover_url}
                        alt=""
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                        sizes="220px"
                      />
                    ) : (
                      <div className="p-5 h-full flex items-center justify-center text-center text-[var(--text-main)]/40 text-sm leading-relaxed font-medium bg-gradient-to-br from-[var(--surface)] to-[var(--bg-main)]">
                        <span className="line-clamp-6 italic">&ldquo;{post.content}&rdquo;</span>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] font-black px-2 py-1 rounded-lg backdrop-blur-md border border-white/10 flex items-center gap-1">
                      ❤️ {post.likes_count ?? 0}
                    </div>
                  </div>
                  <div className="px-1">
                    <h3 className="font-bold text-[var(--text-main)] text-sm line-clamp-1 group-hover:text-brand-2 transition-colors">
                      {post.book_title || 'Resenha'}
                    </h3>
                    <p className="text-[var(--text-main)]/40 text-xs font-medium">
                      @{post.author?.handle || 'usuario'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Sugestões de autores para descobrir */}
        <section className="bg-[var(--surface)] rounded-3xl p-1 border border-[var(--border)] shadow-sm">
          <UserSuggestions title="Explorar novos autores" />
        </section>
      </div>
    </div>
  );
}
