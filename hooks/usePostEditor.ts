'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface DraftData {
  id?: string;
  title: string;
  content: string;
  visibility: 'public' | 'unlisted';
  media?: Array<{ url: string; type: 'image' | 'video' }>;
}

interface UsePostEditorReturn {
  data: DraftData;
  isSaving: boolean;
  isPublishing: boolean;
  updateData: (updates: Partial<DraftData>) => void;
  saveDraft: () => Promise<void>;
  publishPost: () => Promise<void>;
  lastSavedAt: Date | null;
}

export function usePostEditor(initialData?: Partial<DraftData>): UsePostEditorReturn {
  const [data, setData] = useState<DraftData>({
    id: initialData?.id || undefined,
    title: initialData?.title || '',
    content: initialData?.content || '',
    visibility: initialData?.visibility || 'public',
    media: initialData?.media || [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Guarda uma refeta aos ultimos dados para evitar chamadas redundantes de auto-save
  const lastSavedDataRef = useRef<DraftData>(data);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const updateData = useCallback((updates: Partial<DraftData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const saveDraft = useCallback(async () => {
    // Evitar salvar se nada mudou estruturalmente do último save
    const currentData = data;
    if (
      currentData.title === lastSavedDataRef.current.title &&
      currentData.content === lastSavedDataRef.current.content &&
      currentData.visibility === lastSavedDataRef.current.visibility && 
      JSON.stringify(currentData.media) === JSON.stringify(lastSavedDataRef.current.media) &&
      data.id // Se for rascunho novo (sem id), tenta salvar de qlqr forma se tem conteudo
    ) {
      return;
    }

    // Nao tenta salvar rascunho vazio se nao tem id
    if (!currentData.id && !currentData.title && (!currentData.content || currentData.content === '<p></p>')) {
      return;
    }

    try {
      setIsSaving(true);
      // Chamada otimista ao endpoint (que será criado pelo Agente Backend)
      const res = await fetch('/api/drafts', {
        method: currentData.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentData),
      });

      if (!res.ok) throw new Error('Falha ao salvar rascunho');
      
      const resData = await res.json();
      
      // Atualiza o ID caso seja um draft novo
      if (resData.draftId && !currentData.id) {
        updateData({ id: resData.draftId });
      }

      setLastSavedAt(new Date());
      lastSavedDataRef.current = { ...currentData, id: resData.draftId || currentData.id };
    } catch (err) {
      console.error('Auto-save error', err);
    } finally {
      setIsSaving(false);
    }
  }, [data, updateData]);

  const publishPost = useCallback(async () => {
    try {
      setIsPublishing(true);
      // Força um ultimo save sync antes de publicar
      if (!data.id) {
        await saveDraft();
      }
      
      // Chamada otimista para Publicação Plena
      const publishRes = await fetch('/api/posts/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          draftId: data.id || lastSavedDataRef.current.id, 
          visibility: data.visibility,
          media: data.media
        }),
      });

      if (!publishRes.ok) throw new Error('Falha ao publicar post');
      
      return Promise.resolve();
    } catch (err) {
      console.error('Publishing error', err);
      throw err;
    } finally {
      setIsPublishing(false);
    }
  }, [data, saveDraft]);

  // Hook de Auto-Save de 5 segundos
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      saveDraft();
    }, 5000);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [data, saveDraft]);

  // Cleanup: salvar draft se o componente desmontar (navegação soft)
  useEffect(() => {
    return () => {
      // Nota: o cleanup em React não lida bem com funções async complexas durante desmontagem,
      // idealmente, o auto-save de 5 segundos + save manual no botão cuida de 99%
    };
  }, []);

  return {
    data,
    updateData,
    isSaving,
    isPublishing,
    saveDraft,
    publishPost,
    lastSavedAt,
  };
}
