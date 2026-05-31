'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { uploadMedia } from '@/lib/supabase-storage';
import { X, Loader2, Video, Book, Send } from 'lucide-react';
import Link from 'next/link';

export default function CreateReelClient() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [content, setContent] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user || !videoFile) return;

    setIsPosting(true);
    try {
      let uploadedVideoUrl: string | null = null;

      try {
        uploadedVideoUrl = await uploadMedia(videoFile);
      } catch (err: any) {
        alert('Erro ao fazer upload do vídeo: ' + err.message);
        setIsPosting(false);
        return;
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          book_title: bookTitle.trim() || null,
          post_type: 'reel',
          video_url: uploadedVideoUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao postar');
      }

      router.push('/reels');
    } catch (error: any) {
      alert('Erro ao postar: ' + error.message);
    } finally {
      setIsPosting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-white">Você precisa estar logado para criar um Reel.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col md:flex-row">
      {/* Coluna do Vídeo */}
      <div className="flex-1 flex flex-col relative h-[50vh] md:h-screen bg-zinc-900 border-b md:border-b-0 md:border-r border-white/10 items-center justify-center p-4">
        {videoPreview ? (
          <div className="relative w-full h-full max-w-sm mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl">
            <video 
              src={videoPreview} 
              className="w-full h-full object-cover" 
              controls 
              playsInline
            />
            <button
              onClick={removeVideo}
              className="absolute top-4 right-4 bg-black/60 p-2 rounded-full hover:bg-black/80 transition-colors backdrop-blur-sm"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Video className="w-10 h-10 text-white/50" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Novo Reel</h2>
            <p className="text-white/50 mb-8 max-w-xs">Compartilhe uma resenha em vídeo com a comunidade</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-brand-2 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-brand-2/90 transition-colors inline-flex items-center gap-2"
            >
              <Video className="w-5 h-5" />
              Selecionar Vídeo
            </button>
          </div>
        )}
        <input 
          type="file" 
          accept="video/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleVideoChange} 
        />
      </div>

      {/* Coluna de Detalhes */}
      <div className="flex-1 md:max-w-md p-6 flex flex-col bg-zinc-950">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold">Detalhes do Reel</h1>
          <Link href="/reels" className="text-white/50 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </Link>
        </div>

        <form onSubmit={handleCreateReel} className="flex-1 flex flex-col">
          <div className="space-y-6 flex-1">
            {/* Título do Livro */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <Book className="w-4 h-4" />
                Livro (Opcional)
              </label>
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="Ex: O Senhor dos Anéis"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-brand-2 transition-colors placeholder:text-white/20"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2 flex-1 flex flex-col">
              <label className="text-sm font-semibold text-white/70">
                Descrição e Hashtags
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                placeholder="Escreva sobre o livro... #fantasia #recomendo"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-brand-2 transition-colors placeholder:text-white/20 resize-none flex-1 min-h-[150px]"
              />
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-white/10">
            <button
              type="submit"
              disabled={isPosting || !videoFile || !content.trim()}
              className="w-full bg-brand-2 text-white p-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-brand-2/90 transition-colors disabled:opacity-50 disabled:grayscale"
            >
              {isPosting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Compartilhar Reel
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
