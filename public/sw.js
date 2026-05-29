const CACHE_NAME = 'literaconnect-v1';

// Recursos essenciais pré-cacheados na instalação
const STATIC_ASSETS = [
  '/',
  '/explore',
  '/offline',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Remove caches antigos de versões anteriores
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições de API, extensões e outros origins
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Estratégia Network First para páginas — fallback para /offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cacheia resposta bem-sucedida de páginas
        if (response.ok && request.mode === 'navigate') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ||
            (request.mode === 'navigate'
              ? caches.match('/offline')
              : new Response('Offline', { status: 503 }))
        )
      )
  );
});
