'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import ConsentCheckboxes, { ConsentState } from '@/components/ConsentCheckboxes';

const GENRES = [
  'Fiction', 'Romance', 'Fantasy', 'Science Fiction', 
  'Thriller', 'Mystery', 'Young Adult', 'Horror', 
  'Biography', 'Self-Help'
];

export default function OnboardingClient({ requireConsent = false }: { requireConsent?: boolean }) {
  const [step, setStep] = useState(requireConsent ? 0 : 1);
  const [consents, setConsents] = useState<ConsentState>({ terms: false, privacy: false, age: false, marketing: false });
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const router = useRouter();

  const toggleGenre = (g: string) => {
    if (selectedGenres.includes(g)) setSelectedGenres(prev => prev.filter(x => x !== g));
    else if (selectedGenres.length < 5) setSelectedGenres(prev => [...prev, g]);
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

  const handleNextStep = async () => {
    if (selectedGenres.length === 0) return;
    setLoading(true);
    
    try {
      // Dispara a busca híbrida baseada no primeiro gênero para popular a tela 2
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(selectedGenres[0])}`);
      const data = await res.json();
      setBooks(data.results || []);
    } catch(e) {
      console.error(e);
    }
    
    setLoading(false);
    setStep(2);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: selectedGenres, bookIds: selectedBooks })
      });
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

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
            <p className="text-[var(--text-main)]/60 mb-8">Selecione até 5 gêneros para personalizarmos seu feed e algoritmos de recomendação.</p>
            
            <div className="flex flex-wrap gap-3 mb-8">
              {GENRES.map(g => (
                <button
                  key={g}
                  onClick={() => toggleGenre(g)}
                  className={`px-5 py-2 rounded-full border transition-all ${
                    selectedGenres.includes(g) 
                    ? 'bg-brand-2 border-brand-2 text-white shadow-md scale-105' 
                    : 'border-[var(--border)] hover:border-brand-2/50 hover:bg-[var(--bg-main)]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            <button 
              onClick={handleNextStep}
              disabled={selectedGenres.length === 0 || loading}
              className="w-full py-4 bg-[var(--text-main)] text-[var(--bg-main)] font-bold rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {loading ? 'Buscando catálogo no cache local...' : 'Continuar'}
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <h1 className="text-3xl font-serif font-bold mb-2">Escolha algumas referências</h1>
            <p className="text-[var(--text-main)]/60 mb-8">Selecione obras para povoar sua Identidade Literária.</p>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-8 max-h-[50vh] overflow-y-auto p-2">
              {books.map(b => (
                <div 
                  key={b._id} 
                  onClick={() => toggleBook(b._id)}
                  className={`relative cursor-pointer transition-transform ${
                    selectedBooks.includes(b._id) ? 'scale-95 ring-4 ring-brand-2 rounded-lg' : 'hover:scale-105'
                  }`}
                >
                  {b.thumbnail ? (
                    <Image src={b.thumbnail} alt={b.title} width={120} height={180} className="w-full aspect-[2/3] object-cover rounded-lg shadow-sm bg-[var(--border)]" unoptimized />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-[var(--border)] rounded-lg flex items-center justify-center p-2 text-center text-xs">
                      {b.title}
                    </div>
                  )}
                </div>
              ))}
              {books.length === 0 && <p className="col-span-full text-center py-10 opacity-50">Nenhum livro encontrado.</p>}
            </div>

            <button 
              onClick={handleFinish}
              disabled={loading}
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
