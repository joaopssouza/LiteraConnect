'use client';

import dynamic from 'next/dynamic';
import { usePostEditor, DraftData } from '@/hooks/usePostEditor';
import { Check, Settings, EyeOff, Globe, Image as ImageIcon, Film, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { uploadMedia } from '@/lib/supabase-storage';

const Tiptap = dynamic(() => import('./TiptapEditor'), { ssr: false });

export default function PostEditor({ initialDraft }: { initialDraft?: DraftData }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
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
      router.push('/profile'); 
    } catch {
      alert('Houve um erro ao publicar. Tente de novo.');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentMedia = data.media || [];
    const newTotal = currentMedia.length + files.length;
    
    if (newTotal > 1) {
      alert('Você pode subir no máximo 1 arquivo de mídia.');
      return;
    }

    const videoCount = 
      currentMedia.filter(m => m.type === 'video').length + 
      files.filter(f => f.type.startsWith('video/')).length;

    if (videoCount > 1) {
      alert('Você pode anexar no máximo 1 vídeo por postagem.');
      return;
    }

    setIsUploading(true);
    try {
      const uploads = await Promise.all(
        files.map(async (file) => {
          const url = await uploadMedia(file);
          return {
            url,
            type: file.type.startsWith('video/') ? 'video' : 'image'
          } as { url: string; type: 'image' | 'video' };
        })
      );

      updateData({ media: [...currentMedia, ...uploads] });
    } catch (err) {
      console.error('Upload error', err);
      alert('Erro ao fazer upload de mídias.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeMedia = (index: number) => {
    const currentMedia = [...(data.media || [])];
    currentMedia.splice(index, 1);
    updateData({ media: currentMedia });
  };

  return (
    <div className="w-full flex justify-center bg-[var(--bg-main)] min-h-screen transition-colors">
      <div className="w-full max-w-2xl py-6 px-4">
        
        {/* Cabecalho de Ferramentas / Salvamento */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-2 text-sm">
            {isSaving ? (
              <span className="text-[var(--text-main)]/50 animate-pulse font-medium">Salvando...</span>
            ) : (
              <span className="text-emerald-500 flex items-center gap-1.5 font-semibold">
                <Check size={16} strokeWidth={3} /> Salvo
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
              <button
                type="button"
                onClick={() => updateData({ visibility: 'public' })}
                className={`inline-flex items-center px-3 py-1.5 text-xs font-bold transition-all ${
                  data.visibility === 'public' ? 'bg-brand-2 text-white' : 'text-[var(--text-main)]/60 hover:bg-[var(--border)]/50'
                }`}
              >
                <Globe size={14} className="mr-1.5" /> Público
              </button>
              <button
                type="button"
                onClick={() => updateData({ visibility: 'unlisted' })}
                className={`inline-flex items-center px-3 py-1.5 text-xs font-bold transition-all border-l border-[var(--border)] ${
                  data.visibility === 'unlisted' ? 'bg-brand-2 text-white' : 'text-[var(--text-main)]/60 hover:bg-[var(--border)]/50'
                }`}
              >
                <EyeOff size={14} className="mr-1.5" /> Privado
              </button>
            </div>

            <button
              onClick={handlePublish}
              disabled={isPublishing || (!data.content || data.content === '<p></p>')}
              className="px-6 py-1.5 bg-brand-2 text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-40 disabled:grayscale transition-all shadow-lg active:scale-95 text-sm"
            >
              {isPublishing ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </div>

        {/* Editor Central */}
        <div className="space-y-4 bg-[var(--surface)] p-6 rounded-3xl border border-[var(--border)] shadow-sm">
          <input
            type="text"
            placeholder="Título (opcional)"
            value={data.title}
            onChange={handleTitleChange}
            className="w-full text-2xl font-bold bg-transparent border-0 outline-none text-[var(--text-main)] placeholder:text-[var(--text-main)]/20"
          />

          <div className="min-h-[150px]">
            <Tiptap content={data.content || ''} onChange={setContent} />
          </div>

          {/* Área de Anexos (Mídia) */}
          {data.media && data.media.length > 0 && (
            <div className={`grid gap-2 mt-4 ${data.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {data.media.map((item, idx) => (
                <div key={idx} className="relative group rounded-2xl overflow-hidden border border-[var(--border)] aspect-video bg-[var(--bg-main)]">
                  {item.type === 'video' ? (
                    <video src={item.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => removeMedia(idx)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Barra de Ações do Editor */}
          <div className="flex items-center gap-2 pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || (data.media?.length || 0) >= 1}
              className="p-2 text-brand-2 hover:bg-brand-2/10 rounded-xl transition-colors disabled:opacity-30 flex items-center gap-2 text-sm font-semibold"
            >
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
              Anexar Mídia
            </button>
            <span className="text-xs text-[var(--text-main)]/30 ml-auto">
              {(data.media?.length || 0)} / 1 arquivo
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
