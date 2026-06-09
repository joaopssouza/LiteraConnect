'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import ConsentCheckboxes, { ConsentState } from '@/components/ConsentCheckboxes';
import { GENRE_HIERARCHY, getSubgenresForMainGenres } from '@/lib/genres';

export default function OnboardingClient({ requireConsent = false }: { requireConsent?: boolean }) {
  const [step, setStep] = useState(requireConsent ? 0 : 1);
  const [consents, setConsents] = useState<ConsentState>({ terms: false, privacy: false, age: false, marketing: false });
  const [selectedMainGenres, setSelectedMainGenres] = useState<string[]>([]);
  const [selectedSubgenres, setSelectedSubgenres] = useState<string[]>([]);
  const [readingGoal, setReadingGoal] = useState<number>(12);
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const router = useRouter();

  const toggleMainGenre = (g: string) => {
    setSelectedSubgenres([]); // Reseta subgêneros e livros
    setSelectedBooks([]);
    if (selectedMainGenres.includes(g)) {
      setSelectedMainGenres(prev => prev.filter(x => x !== g));
    } else if (selectedMainGenres.length < 5) {
      setSelectedMainGenres(prev => [...prev, g]);
    }
  };

  const toggleSubgenre = (g: string) => {
    if (selectedSubgenres.includes(g)) setSelectedSubgenres(prev => prev.filter(x => x !== g));
    else if (selectedSubgenres.length < 8) setSelectedSubgenres(prev => [...prev, g]);
  };

  const toggleBook = (id: string) => {
    if (selectedBooks.includes(id)) setSelectedBooks(prev => prev.filter(x => x !== id));
    else if (selectedBooks.length < 5) setSelectedBooks(prev => [...prev, id]);
  };

  const handleConsentSubmit = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('users').update({
        consent_terms_accepted_at: consents.terms ? new Date().toISOString() : null,
        consent_privacy_accepted_at: consents.privacy ? new Date().toISOString() : null,
        consent_age_declared_at: consents.age ? new Date().toISOString() : null,
        consent_marketing_accepted_at: consents.marketing ? new Date().toISOString() : null,
        consent_version: '1.0'
      }).eq('id', user.id);
    }
    setLoading(false);
    setStep(1);
  };

  const handleGoToSubgenres = () => {
    if (selectedMainGenres.length === 0) return;
    setStep(2);
  };

  const handleFetchBooks = async () => {
    if (selectedSubgenres.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/books/suggested?categories=${encodeURIComponent(selectedSubgenres.join(','))}&attempt=0`);
      const data = await res.json();
      setBooks(data.results || []);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
    setStep(3);
  };

  const fetchMoreBooks = async () => {
    if (attemptCount >= 10 || selectedSubgenres.length === 0) return;
    setLoading(true);
    const nextAttempt = attemptCount + 1;
    try {
      const res = await fetch(`/api/books/suggested?categories=${encodeURIComponent(selectedSubgenres.join(','))}&attempt=${nextAttempt}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setBooks(data.results);
      }
      setAttemptCount(nextAttempt);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: selectedSubgenres, bookIds: selectedBooks })
      });

      await fetch('/api/profile/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetBooks: readingGoal })
      });

      router.push('/');
      router.refresh();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const mainGenresList = Object.keys(GENRE_HIERARCHY);
  const availableSubgenres = getSubgenresForMainGenres(selectedMainGenres);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-[var(--surface)] p-8 rounded-2xl shadow-xl border border-[var(--border)] transition-all duration-500">
        
        {step === 0 ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-serif font-bold mb-2">Concluir Cadastro</h1>
            <p className="text-[var(--text-main)]/60 mb-8">Como você se conectou por meio de uma plataforma externa, precisamos que confirme sua leitura das nossas políticas para continuar.</p>
            <ConsentCheckboxes value={consents} onChange={setConsents} />
            <button 
              onClick={handleConsentSubmit}
              disabled={!consents.terms || !consents.privacy || !consents.age || loading}
              className="w-full py-4 mt-8 bg-brand-2 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg"
            >
              {loading ? 'Salvando...' : 'Aceitar e Continuar'}
            </button>
          </div>
        ) : step === 1 ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-serif font-bold mb-2">O que você gosta de ler?</h1>
            <p className="text-[var(--text-main)]/60 mb-8">Passo 1 de 3: Selecione os grandes gêneros literários que mais te atraem.</p>
            
            <div className="flex flex-wrap gap-3 mb-8">
              {mainGenresList.map(g => (
                <button
                  key={g}
                  onClick={() => toggleMainGenre(g)}
                  className={`px-5 py-2 rounded-full border transition-all ${
                    selectedMainGenres.includes(g) 
                    ? 'bg-brand-2 border-brand-2 text-white shadow-md scale-105' 
                    : 'border-[var(--border)] hover:border-brand-2/50 hover:bg-[var(--bg-main)]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="pt-6 border-t border-[var(--border)] mb-8">
              <h2 className="text-xl font-serif font-bold mb-2">Qual é a sua meta de leitura para este ano?</h2>
              <p className="text-[var(--text-main)]/60 text-sm mb-4">Defina quantos livros você deseja ler em {new Date().getFullYear()}.</p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setReadingGoal(prev => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-full border border-[var(--border)] flex items-center justify-center hover:border-brand-2 hover:text-brand-2 text-lg font-bold transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  value={readingGoal}
                  onChange={(e) => setReadingGoal(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-20 text-center py-2 border border-[var(--border)] bg-[var(--bg-main)] rounded-lg text-lg font-bold focus:outline-none focus:border-brand-2"
                />
                <button
                  type="button"
                  onClick={() => setReadingGoal(prev => prev + 1)}
                  className="w-10 h-10 rounded-full border border-[var(--border)] flex items-center justify-center hover:border-brand-2 hover:text-brand-2 text-lg font-bold transition-colors"
                >
                  +
                </button>
                <span className="text-[var(--text-main)]/70 font-medium">livros</span>
              </div>
            </div>

            <button 
              onClick={handleGoToSubgenres}
              disabled={selectedMainGenres.length === 0}
              className="w-full py-4 bg-[var(--text-main)] text-[var(--bg-main)] font-bold rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              Continuar
            </button>
          </div>
        ) : step === 2 ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <button onClick={() => { setSelectedSubgenres([]); setSelectedBooks([]); setStep(1); }} className="text-sm font-bold text-[var(--text-main)]/60 hover:text-[var(--text-main)] mb-4 block">← Voltar para Gêneros</button>
            <h1 className="text-3xl font-serif font-bold mb-2">Especifique seus gostos</h1>
            <p className="text-[var(--text-main)]/60 mb-8">Passo 2 de 3: Selecione até 8 subgêneros mais específicos para personalizarmos seu feed.</p>
            
            <div className="flex flex-wrap gap-2 mb-8 max-h-[50vh] overflow-y-auto p-1">
              {availableSubgenres.map(g => (
                <button
                  key={g}
                  onClick={() => toggleSubgenre(g)}
                  className={`px-4 py-2 text-sm rounded-full border transition-all ${
                    selectedSubgenres.includes(g) 
                    ? 'bg-brand-2 border-brand-2 text-white shadow' 
                    : 'border-[var(--border)] hover:border-brand-2/50 hover:bg-[var(--bg-main)] text-[var(--text-main)]/80'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            <p className="text-xs text-[var(--text-main)]/50 mb-4 text-center">Selecionados: {selectedSubgenres.length} de 8</p>

            <button 
              onClick={handleFetchBooks}
              disabled={selectedSubgenres.length === 0 || loading}
              className="w-full py-4 bg-[var(--text-main)] text-[var(--bg-main)] font-bold rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {loading ? 'Buscando livros...' : 'Continuar'}
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <button onClick={() => { setSelectedBooks([]); setStep(2); }} className="text-sm font-bold text-[var(--text-main)]/60 hover:text-[var(--text-main)] mb-4 block">← Voltar para Subgêneros</button>
            <div className="flex justify-between items-end mb-8 border-b border-[var(--border)] pb-4">
              <div>
                <h1 className="text-3xl font-serif font-bold mb-2">Escolha algumas referências</h1>
                <p className="text-[var(--text-main)]/60">Passo 3 de 3: Selecione até 5 obras para povoar sua Identidade Literária.</p>
              </div>
              {attemptCount < 10 && (
                <button
                  onClick={fetchMoreBooks}
                  disabled={loading}
                  className="text-sm font-bold px-4 py-2 bg-[var(--bg-main)] border border-[var(--border)] rounded-full hover:border-brand-2 hover:text-brand-2 transition-colors disabled:opacity-50"
                  title="Buscar novas opções baseadas nos seus gêneros"
                >
                  {loading ? 'Buscando...' : `Novas buscas (${10 - attemptCount})`}
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-8 max-h-[50vh] overflow-y-auto p-2">
              {books.map(b => (
                <div 
                  key={b._id} 
                  onClick={() => toggleBook(b._id)}
                  className={`flex flex-col gap-1 cursor-pointer transition-transform ${
                    selectedBooks.includes(b._id) ? 'scale-95 ring-4 ring-brand-2 rounded-lg p-1 bg-brand-2/10' : 'hover:scale-105'
                  }`}
                  title={b.title}
                >
                  <p className="text-[10px] font-semibold text-center line-clamp-1 truncate w-full">{b.title}</p>
                  <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden shadow-sm border border-[var(--border)]">
                    {b.thumbnail ? (
                      <Image src={b.thumbnail} alt={b.title} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="absolute inset-0 bg-[var(--border)] flex items-center justify-center p-2 text-center text-[10px] line-clamp-4">
                        {b.title}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {books.length === 0 && <p className="col-span-full text-center py-10 opacity-50">Nenhum livro encontrado.</p>}
            </div>

            <p className="text-xs text-[var(--text-main)]/50 mb-4 text-center">Selecionados: {selectedBooks.length} de 5</p>

            <button 
              onClick={handleFinish}
              disabled={loading || selectedBooks.length === 0}
              className="w-full py-4 bg-brand-2 text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg"
            >
              {loading ? 'Salvando Perfil...' : 'Construir Minha Estante'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
