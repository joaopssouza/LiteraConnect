'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface FeedPost {
  id: string;
  user_id: string;
  content: string;
  book_title?: string | null;
  book_cover_url?: string | null;
  video_url?: string | null;
  media?: Array<{ url: string; type: 'image' | 'video' }>;
  post_type?: string;
  created_at: string;
  status: string;
  visibility: string;
  is_premium?: boolean;
  views?: number;
  shares?: number;
  likes_count: number;
  comments_count: number;
  author: {
    name: string;
    handle: string;
    avatar_url: string | null;
  };
  recent_comments?: any[];
}

interface UseFeedReturn {
  posts: FeedPost[];
  loading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadInitial: () => Promise<void>;
  loadMore: () => Promise<void>;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

const PAGE_SIZE = 10;

export function useFeed(): UseFeedReturn {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref para o elemento sentinela (Intersection Observer)
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Evita múltiplos fetches simultâneos
  const isFetchingRef = useRef(false);

  const fetchPage = useCallback(async (cursor: string | null = null, append = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/feed?${params.toString()}`);

      if (res.status === 401) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      if (!res.ok) throw new Error('Não foi possível carregar o feed');

      const payload = await res.json();
      const items: FeedPost[] = payload.items || [];
      const next = payload.nextCursor || null;

      setPosts((prev) => (append ? [...prev, ...items] : items));
      setNextCursor(next);
      setHasMore(!!next);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido ao carregar o feed.');
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    await fetchPage(null, false);
    setLoading(false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore || isFetchingRef.current) return;
    setIsLoadingMore(true);
    await fetchPage(nextCursor, true);
    setIsLoadingMore(false);
  }, [nextCursor, isLoadingMore, fetchPage]);

  // Carrega o feed inicial ao montar
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Intersection Observer — auto-carrega ao chegar no final da lista
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingRef.current) {
          loadMore();
        }
      },
      {
        rootMargin: '200px', // Começa a carregar 200px antes do fim
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return {
    posts,
    loading,
    isLoadingMore,
    hasMore,
    error,
    loadInitial,
    loadMore,
    sentinelRef,
  };
}
