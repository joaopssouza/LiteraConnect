'use client';

import { useEffect } from 'react';

/**
 * Registra o Service Worker apenas no client (não SSR).
 * Colocado no layout para rodar em todas as páginas sem obstruir o render.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[SW] Registrado com sucesso. Scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[SW] Falha no registro:', err);
        });
    }
  }, []);

  return null;
}
