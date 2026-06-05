'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeToggle';
import { usePreferences } from '@/hooks/usePreferences';
import { PushNotificationToggle } from '@/components/PushNotificationToggle';

const GENRES = [
  'Fiction', 'Romance', 'Fantasy', 'Science Fiction', 
  'Thriller', 'Mystery', 'Young Adult', 'Horror', 
  'Biography', 'Self-Help'
];

export default function PreferencesClient() {
  const { preferences, updatePreferences, mounted } = usePreferences();
  
  // Estados para edição das preferências de Onboarding
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [userPrefs, setUserPrefs] = useState<{ categories: string[], bookIds: string[], favoriteBooks: any[] }>({
    categories: [],
    bookIds: [],
    favoriteBooks: []
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [booksList, setBooksList] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadOnboardingPrefs() {
      try {
        const res = await fetch('/api/onboarding');
        if (res.ok) {
          const data = await res.json();
          setUserPrefs({
            categories: data.categories || [],
            bookIds: data.bookIds || [],
            favoriteBooks: data.favoriteBooks || []
          });
        }
      } catch (err) {
        console.error('Erro ao buscar preferências de onboarding:', err);
      } finally {
        setLoadingPrefs(false);
      }
    }
    loadOnboardingPrefs();
  }, []);

  const openEditModal = () => {
    setSelectedGenres(userPrefs.categories);
    setSelectedBooks(userPrefs.bookIds);
    setBooksList(userPrefs.favoriteBooks);
    setModalStep(1);
    setIsEditing(true);
  };

  const toggleGenre = (g: string) => {
    if (selectedGenres.includes(g)) {
      setSelectedGenres(prev => prev.filter(x => x !== g));
    } else if (selectedGenres.length < 5) {
      setSelectedGenres(prev => [...prev, g]);
    }
  };

  const toggleBook = (id: string) => {
    if (selectedBooks.includes(id)) {
      setSelectedBooks(prev => prev.filter(x => x !== id));
    } else if (selectedBooks.length < 5) {
      setSelectedBooks(prev => [...prev, id]);
    }
  };

  const handleNextStep = async () => {
    if (selectedGenres.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(selectedGenres[0])}`);
      if (res.ok) {
        const data = await res.json();
        const searched = data.results || [];
        const mergedBooks = [...userPrefs.favoriteBooks];
        const existingIds = new Set(mergedBooks.map(b => b._id));
        
        for (const book of searched) {
          if (!existingIds.has(book._id)) {
            mergedBooks.push(book);
          }
        }
        setBooksList(mergedBooks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
      setModalStep(2);
    }
  };

  const handleSaveInterests = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: selectedGenres, bookIds: selectedBooks })
      });
      if (res.ok) {
        const resPrefs = await fetch('/api/onboarding');
        if (resPrefs.ok) {
          const data = await resPrefs.json();
          setUserPrefs({
            categories: data.categories || [],
            bookIds: data.bookIds || [],
            favoriteBooks: data.favoriteBooks || []
          });
        }
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-8 max-w-xl animate-pulse">
        <div className="h-8 bg-[var(--border)] rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-[var(--border)] rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Preferências</h2>
        <p className="text-[var(--text-main)]/60">Customize a sua experiência no LiteraConnect.</p>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-main)]">Tema do Aplicativo</h3>
            <p className="text-sm text-[var(--text-main)]/60">Alterne entre o modo claro, escuro ou siga o sistema.</p>
          </div>
          <ThemeToggle />
        </div>

        <hr className="border-[var(--border)]" />

        <PushNotificationToggle />

        <hr className="border-[var(--border)]" />

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-[var(--text-main)]">Sons do Aplicativo</h3>
            </div>
            <p className="text-sm text-[var(--text-main)]/60">Tocar um som leve quando receber novas mensagens ou interações.</p>
          </div>
          <button
            onClick={() => updatePreferences({ soundsEnabled: !preferences.soundsEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              preferences.soundsEnabled ? 'bg-brand-1' : 'bg-[var(--border)]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.soundsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <hr className="border-[var(--border)]" />

        {/* Seção de Preferências Literárias do Onboarding */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-main)]">Preferências Literárias</h3>
              <p className="text-sm text-[var(--text-main)]/60">Seus interesses selecionados no cadastro para sugestões e feed personalizado.</p>
            </div>
            <button
              onClick={openEditModal}
              disabled={loadingPrefs}
              className="px-4 py-2 bg-brand-2 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex-shrink-0"
            >
              Editar Interesses
            </button>
          </div>

          {loadingPrefs ? (
            <div className="h-6 w-2/3 bg-[var(--border)] rounded animate-pulse"></div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {userPrefs.categories.map(cat => (
                  <span key={cat} className="px-3 py-1 bg-brand-2/10 text-brand-2 text-xs font-semibold rounded-full border border-brand-2/20">
                    {cat}
                  </span>
                ))}
                {userPrefs.categories.length === 0 && (
                  <span className="text-xs text-[var(--text-main)]/40 italic">Nenhum gênero selecionado.</span>
                )}
              </div>
              {userPrefs.favoriteBooks.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-1">
                  {userPrefs.favoriteBooks.map(b => (
                    <div key={b._id} className="relative w-12 h-18 flex-shrink-0 group" title={b.title}>
                      {b.thumbnail ? (
                        <Image src={b.thumbnail} alt={b.title} width={48} height={72} className="w-12 h-18 object-cover rounded shadow-sm border border-[var(--border)]" unoptimized />
                      ) : (
                        <div className="w-12 h-18 bg-[var(--border)] rounded flex items-center justify-center p-1 text-[8px] text-center line-clamp-3">
                          {b.title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <hr className="border-[var(--border)]" />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-main)]">Tamanho da Fonte (Leitor)</h3>
              <p className="text-sm text-[var(--text-main)]/60">Ajuste o tamanho da fonte padrão nas resenhas.</p>
            </div>
            <span className="font-bold text-[var(--brand-1)]">{preferences.fontSize}px</span>
          </div>
          <input 
            type="range" 
            className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-brand-1" 
            min="12" 
            max="24" 
            step="2" 
            value={preferences.fontSize}
            onChange={(e) => updatePreferences({ fontSize: Number(e.target.value) })}
          />
          <div className="flex justify-between text-xs font-medium text-[var(--text-main)]/50">
            <span>A (12px)</span>
            <span>A (24px)</span>
          </div>
          
          <div className="mt-6 p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border)]">
            <p className="text-[var(--text-main)]/50 text-xs mb-3 uppercase tracking-wider font-bold">Pré-visualização do Leitor</p>
            <p 
              className="text-[var(--text-main)] transition-all duration-200"
              style={{ fontSize: `${preferences.fontSize}px`, lineHeight: 1.6 }}
            >
              &quot;A leitura de um bom livro é um diálogo incessante: o livro fala e a alma responde.&quot; 
              <br/><br/>
              Este é um exemplo de como o conteúdo das resenhas será exibido para você com o tamanho de fonte selecionado.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Edição de Interesses Literários (Onboarding Edit) */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity">
          <div className="relative w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-main)]">Interesses Literários</h3>
                <p className="text-xs text-[var(--text-main)]/60">Passo {modalStep} de 2</p>
              </div>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-[var(--text-main)]/60 hover:text-[var(--text-main)] p-1 rounded-lg hover:bg-[var(--bg-main)] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {modalStep === 1 ? (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--text-main)]/70">Selecione até 5 gêneros favoritos:</p>
                  <div className="flex flex-wrap gap-2 py-2">
                    {GENRES.map(g => {
                      const isSelected = selectedGenres.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleGenre(g)}
                          className={`px-4 py-2 text-sm rounded-full border transition-all ${
                            isSelected 
                              ? 'bg-brand-2 border-brand-2 text-white shadow'
                              : 'border-[var(--border)] hover:border-brand-2/50 text-[var(--text-main)]/80 hover:bg-[var(--bg-main)]'
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-[var(--text-main)]/50">Selecionados: {selectedGenres.length} de 5</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--text-main)]/70">Selecione até 5 obras de referência para a sua estante:</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-2">
                    {booksList.map(b => {
                      const isSelected = selectedBooks.includes(b._id);
                      return (
                        <div 
                          key={b._id} 
                          onClick={() => toggleBook(b._id)}
                          className={`relative cursor-pointer transition-all rounded-lg overflow-hidden group aspect-[2/3] border ${
                            isSelected ? 'ring-4 ring-brand-2 border-brand-2 scale-95 shadow-lg' : 'border-[var(--border)] hover:scale-105'
                          }`}
                          title={b.title}
                        >
                          {b.thumbnail ? (
                            <Image src={b.thumbnail} alt={b.title} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="absolute inset-0 bg-[var(--border)] flex items-center justify-center p-2 text-center text-[10px] line-clamp-4">
                              {b.title}
                            </div>
                          )}
                          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100 bg-brand-2/20' : ''}`}>
                            <span className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded">
                              {isSelected ? '✓' : 'Selecionar'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {booksList.length === 0 && (
                      <p className="col-span-full text-center py-6 text-sm text-[var(--text-main)]/40 italic">Nenhum livro disponível.</p>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-main)]/50">Selecionados: {selectedBooks.length} de 5</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-main)] flex justify-between gap-3">
              {modalStep === 2 ? (
                <button
                  type="button"
                  onClick={() => setModalStep(1)}
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-[var(--border)] text-[var(--text-main)]/80 hover:bg-[var(--surface)] transition-all"
                >
                  Voltar
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl text-[var(--text-main)]/60 hover:text-[var(--text-main)] transition-colors"
                >
                  Cancelar
                </button>
                {modalStep === 1 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={selectedGenres.length === 0 || saving}
                    className="px-5 py-2.5 text-sm font-bold bg-brand-2 text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity shadow"
                  >
                    {saving ? 'Carregando livros...' : 'Avançar'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveInterests}
                    disabled={saving}
                    className="px-5 py-2.5 text-sm font-bold bg-brand-2 text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity shadow"
                  >
                    {saving ? 'Salvando...' : 'Salvar Preferências'}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
