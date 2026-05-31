'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Tag, X, Loader2, BookOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookTag {
  tag: string;
  category: 'book' | 'author';
  count?: number;
}

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
}

/**
 * TagInput — componente de entrada de tags inteligentes para livros/autores.
 * Usa a API /api/tags/suggest com debounce de 300ms.
 * Suporta navegação por teclado nas sugestões.
 */
export default function TagInput({
  tags,
  onChange,
  maxTags = 5,
  placeholder = 'Adicionar livro ou autor...',
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<BookTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Buscar sugestões com debounce ─────────────────────────────────────────
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/tags/suggest?q=${encodeURIComponent(query)}&limit=8`);
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(data.tags || []);
      setIsOpen(true);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value.trim()), 300);
  };

  // ── Adicionar tag ─────────────────────────────────────────────────────────
  const addTag = useCallback(
    (tagValue: string, category?: 'book' | 'author') => {
      const normalized = tagValue.trim();
      if (!normalized || tags.includes(normalized) || tags.length >= maxTags) return;

      onChange([...tags, normalized]);
      setInputValue('');
      setSuggestions([]);
      setIsOpen(false);
      inputRef.current?.focus();

      // Registra uso da tag no background (fire-and-forget)
      if (category) {
        fetch('/api/tags/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: normalized, category }),
        }).catch(() => {});
      }
    },
    [tags, onChange, maxTags]
  );

  // ── Remover tag ───────────────────────────────────────────────────────────
  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  // ── Navegação por teclado ─────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        addTag(suggestions[activeIndex].tag, suggestions[activeIndex].category);
      } else if (inputValue.trim()) {
        addTag(inputValue.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  // ── Fechar ao clicar fora ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const categoryIcon = (category: 'book' | 'author') =>
    category === 'book' ? (
      <BookOpen size={12} className="text-brand-2 shrink-0" />
    ) : (
      <User size={12} className="text-amber-500 shrink-0" />
    );

  const categoryLabel = (category: 'book' | 'author') =>
    category === 'book' ? 'Livro' : 'Autor';

  return (
    <div ref={containerRef} className="relative">
      {/* Tags + Input */}
      <div
        className={cn(
          'flex flex-wrap gap-1.5 min-h-[44px] items-center rounded-xl border border-[var(--border)] px-3 py-2 bg-[var(--bg-main)] transition-all focus-within:ring-2 focus-within:ring-brand-2/30 focus-within:border-brand-2 cursor-text',
          tags.length >= maxTags && 'opacity-60'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <Tag size={14} className="text-[var(--text-main)]/30 shrink-0 mr-0.5" />

        {/* Tags existentes */}
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 bg-brand-2/10 text-brand-2 text-xs font-bold px-2.5 py-1 rounded-lg border border-brand-2/20 max-w-[160px]"
          >
            <span className="truncate">{tag}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(i); }}
              className="text-brand-2/60 hover:text-brand-2 transition-colors shrink-0 ml-0.5"
              aria-label={`Remover tag ${tag}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {/* Input */}
        {tags.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.length >= 2 && setIsOpen(true)}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-[var(--text-main)] placeholder:text-[var(--text-main)]/30"
          />
        )}

        {isLoading && (
          <Loader2 size={14} className="animate-spin text-brand-2 shrink-0" />
        )}
      </div>

      {/* Contador */}
      <p className="text-[10px] text-[var(--text-main)]/30 text-right mt-1 font-medium">
        {tags.length}/{maxTags} tags
      </p>

      {/* Dropdown de sugestões */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-1">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(suggestion.tag, suggestion.category);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-colors',
                  i === activeIndex
                    ? 'bg-brand-2/10 text-[var(--text-main)]'
                    : 'text-[var(--text-main)]/80 hover:bg-[var(--border)]/40'
                )}
              >
                {categoryIcon(suggestion.category)}
                <span className="flex-1 truncate font-medium">{suggestion.tag}</span>
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                    suggestion.category === 'book'
                      ? 'bg-brand-2/10 text-brand-2'
                      : 'bg-amber-500/10 text-amber-500'
                  )}
                >
                  {categoryLabel(suggestion.category)}
                </span>
                {suggestion.count !== undefined && suggestion.count > 0 && (
                  <span className="text-[10px] text-[var(--text-main)]/30 font-medium shrink-0">
                    {suggestion.count}×
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Opção de criar nova tag */}
          {inputValue.trim() && !suggestions.some((s) => s.tag === inputValue.trim().toLowerCase()) && (
            <div className="border-t border-[var(--border)] p-1">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(inputValue.trim());
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm text-[var(--text-main)]/60 hover:bg-[var(--border)]/40 transition-colors"
              >
                <Tag size={12} className="text-[var(--text-main)]/30" />
                <span>Adicionar &ldquo;<strong className="text-[var(--text-main)]">{inputValue.trim()}</strong>&rdquo; como nova tag</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
