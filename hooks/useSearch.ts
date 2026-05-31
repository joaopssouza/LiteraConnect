'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type SearchFilter = {
  period?: '7d' | '30d' | '90d' | 'all';
  sort?: 'recent' | 'popular';
};

export interface SearchPost {
  id: string;
  user_id: string;
  content: string;
  book_title: string | null;
  book_cover_url: string | null;
  video_url: string | null;
  media?: Array<{ url: string; type: 'image' | 'video' }>;
  created_at: string;
  likes_count: number;
  comments_count: number;
  views?: number;
  shares?: number;
  author: {
    name: string;
    handle: string;
    avatar_url: string | null;
  } | null;
}

export interface TrendingPost {
  id: string;
  user_id: string;
  content: string;
  book_title: string | null;
  book_cover_url: string | null;
  video_url: string | null;
  media?: Array<{ url: string; type: 'image' | 'video' }>;
  created_at: string;
  likes_count: number;
  views?: number;
  shares?: number;
  author: {
    name: string;
    handle: string;
    avatar_url: string | null;
  } | null;
}

interface UseSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  filters: SearchFilter;
  setFilters: (f: SearchFilter) => void;
  results: SearchPost[];
  trending: TrendingPost[];
  isSearching: boolean;
  error: string | null;
  search: (q?: string) => void;
}

const DEBOUNCE_MS = 400;

export function useSearch(): UseSearchReturn {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilter>({ period: 'all', sort: 'recent' });
  const [results, setResults] = useState<SearchPost[]>([]);
  const [trending, setTrending] = useState<TrendingPost[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(async (q?: string) => {
    const term = q !== undefined ? q : query;
    setIsSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (term.trim()) params.set('q', term.trim());
      if (filters.period && filters.period !== 'all') params.set('period', filters.period);
      if (filters.sort) params.set('sort', filters.sort);

      const res = await fetch(`/api/search?${params.toString()}`);

      if (res.status === 401) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }
      if (!res.ok) throw new Error('Falha ao buscar');

      const data = await res.json();
      setResults(data.results || []);
      setTrending(data.trending || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar');
    } finally {
      setIsSearching(false);
    }
  }, [query, filters]);

  // Debounce automático ao digitar
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      search(query);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carrega trending inicial
  useEffect(() => {
    search('');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { query, setQuery, filters, setFilters, results, trending, isSearching, error, search };
}
