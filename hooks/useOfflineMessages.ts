'use client';

import { useCallback, useEffect, useRef } from 'react';

const DB_NAME = 'literaconnect_messages';
const DB_VERSION = 1;
const STORE_NAME = 'pending_messages';

interface PendingMessage {
  localId: string;       // UUID gerado no cliente
  conversationId: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'audio' | 'video';
  createdAt: string;    // ISO
  status: 'pending' | 'sent' | 'failed';
}

/**
 * useOfflineMessages
 *
 * Hook para persistência de mensagens offline via IndexedDB.
 * Permite que o usuário escreva mensagens mesmo sem conexão —
 * elas ficam em fila no IndexedDB e são enviadas quando a conexão retorna.
 *
 * API:
 *   - saveMessage(msg)   — persiste uma mensagem pendente
 *   - getPending(convId) — lista mensagens pendentes de uma conversa
 *   - markSent(localId)  — marca mensagem como enviada
 *   - markFailed(localId) — marca mensagem como falha
 *   - clearSent()        — remove mensagens enviadas (limpeza)
 */
export function useOfflineMessages() {
  const dbRef = useRef<IDBDatabase | null>(null);

  // ── Inicializar banco IndexedDB ──────────────────────────────────────────
  const initDb = useCallback((): Promise<IDBDatabase> => {
    if (dbRef.current) return Promise.resolve(dbRef.current);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
          store.createIndex('conversationId', 'conversationId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        dbRef.current = db;
        resolve(db);
      };

      request.onerror = () => reject(request.error);
    });
  }, []);

  // ── Salvar mensagem pendente ──────────────────────────────────────────────
  const saveMessage = useCallback(
    async (msg: Omit<PendingMessage, 'localId' | 'status' | 'createdAt'>): Promise<PendingMessage> => {
      const db = await initDb();
      const fullMsg: PendingMessage = {
        ...msg,
        localId: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(fullMsg);
        req.onsuccess = () => resolve(fullMsg);
        req.onerror = () => reject(req.error);
      });
    },
    [initDb]
  );

  // ── Buscar mensagens pendentes de uma conversa ────────────────────────────
  const getPending = useCallback(
    async (conversationId: string): Promise<PendingMessage[]> => {
      const db = await initDb();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('conversationId');
        const req = index.getAll(IDBKeyRange.only(conversationId));

        req.onsuccess = () => {
          const results = (req.result || []) as PendingMessage[];
          resolve(results.filter((m) => m.status === 'pending').sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ));
        };
        req.onerror = () => reject(req.error);
      });
    },
    [initDb]
  );

  // ── Atualizar status de uma mensagem ──────────────────────────────────────
  const updateStatus = useCallback(
    async (localId: string, status: 'sent' | 'failed') => {
      const db = await initDb();

      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(localId);

        getReq.onsuccess = () => {
          const msg = getReq.result as PendingMessage | undefined;
          if (!msg) return resolve();
          msg.status = status;
          const putReq = store.put(msg);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
      });
    },
    [initDb]
  );

  const markSent = useCallback((localId: string) => updateStatus(localId, 'sent'), [updateStatus]);
  const markFailed = useCallback((localId: string) => updateStatus(localId, 'failed'), [updateStatus]);

  // ── Limpar mensagens enviadas (manutenção periódica) ─────────────────────
  const clearSent = useCallback(async () => {
    const db = await initDb();

    return new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('status');
      const req = index.getAll(IDBKeyRange.only('sent'));

      req.onsuccess = () => {
        const sent = req.result as PendingMessage[];
        let count = 0;
        for (const msg of sent) {
          store.delete(msg.localId);
          count++;
        }
        resolve(count);
      };
      req.onerror = () => reject(req.error);
    });
  }, [initDb]);

  // ── Fechar conexão quando componente desmontar ────────────────────────────
  useEffect(() => {
    return () => {
      dbRef.current?.close();
      dbRef.current = null;
    };
  }, []);

  return {
    saveMessage,
    getPending,
    markSent,
    markFailed,
    clearSent,
  };
}
