'use client';

import dynamic from 'next/dynamic';
import { usePostEditor, DraftData } from '@/hooks/usePostEditor';
import { Check, Settings, EyeOff, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';

const Tiptap = dynamic(() => import('./TiptapEditor'), { ssr: false });

export default function PostEditor({ initialDraft }: { initialDraft?: DraftData }) {
  const router = useRouter();
  
  const { 
    data, 
    updateData, 
    isSaving, 
    isPublishing,
    publishPost,
  } = usePostEditor(initialDraft);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateData({ title: e.target.value });
  };

  const setContent = (html: string) => {
    updateData({ content: html });
  };

  const handlePublish = async () => {
    try {
      await publishPost();
      alert('Post Publicado com Sucesso!');
      router.push('/profile'); 
    } catch {
      alert('Houve um erro ao publicar. Tente de novo.');
    }
  };

  return (
    <div className="w-full flex justify-center bg-[var(--bg-main)] min-h-screen transition-colors">
      <div className="w-full max-w-4xl py-6 px-4">
        
        {/* Cabecalho de Ferramentas / Salvamento */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
          <div className="flex items-center gap-2 text-sm">
            {isSaving ? (
              <span className="text-[var(--text-main)]/50 animate-pulse font-medium">Salvando Rascunho...</span>
            ) : (
              <span className="text-emerald-500 flex items-center gap-1.5 font-semibold">
                <Check size={16} strokeWidth={3} /> Salvo Automático
              </span>
            )}
            {data.id && <span className="text-[var(--text-main)]/30">| ID: {data.id}</span>}
          </div>

          <div className="flex items-center gap-3">
            {/* Seletor de Visibilidade */}
            <div className="flex rounded-xl overflow-hidden shadow-sm border border-[var(--border)] bg-[var(--surface)]">
              <button
                type="button"
                onClick={() => updateData({ visibility: 'public' })}
                className={`inline-flex items-center px-4 py-2 text-sm font-bold transition-all ${
                  data.visibility === 'public' ? 'bg-brand-2 text-white' : 'text-[var(--text-main)]/60 hover:bg-[var(--border)]/50'
                }`}
              >
                <Globe size={16} className="mr-2" /> Público
              </button>
              <button
                type="button"
                onClick={() => updateData({ visibility: 'unlisted' })}
                className={`inline-flex items-center px-4 py-2 text-sm font-bold transition-all border-l border-[var(--border)] ${
                  data.visibility === 'unlisted' ? 'bg-brand-2 text-white' : 'text-[var(--text-main)]/60 hover:bg-[var(--border)]/50'
                }`}
              >
                <EyeOff size={16} className="mr-2" /> Não Listado
              </button>
            </div>

            {/* Publicar CTA */}
            <button
              onClick={handlePublish}
              disabled={isPublishing || !data.title || !data.content || data.content === '<p></p>'}
              className="px-6 py-2 bg-brand-2 text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-40 disabled:grayscale transition-all shadow-lg active:scale-95"
            >
              {isPublishing ? 'Publicando...' : 'Publicar'}
            </button>
            
            <button className="p-2 text-[var(--text-main)]/40 hover:text-[var(--text-main)] rounded-full hover:bg-[var(--surface)] transition-colors border border-transparent hover:border-[var(--border)]">
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Editor Central */}
        <div className="space-y-8">
          <input
            type="text"
            placeholder="Um título memorável..."
            value={data.title}
            onChange={handleTitleChange}
            autoFocus
            className="w-full text-4xl sm:text-6xl font-black bg-transparent border-0 outline-none text-[var(--text-main)] placeholder:text-[var(--text-main)]/10 leading-tight"
          />

          <div className="border-t border-[var(--border)] pt-8">
            <Tiptap content={data.content || ''} onChange={setContent} />
          </div>
        </div>

      </div>
    </div>
  );
}
