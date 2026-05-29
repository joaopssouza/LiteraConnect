# Roadmap e Sprints

Este é o plano de entrega do LiteraConnect, atualizado para refletir a nossa arquitetura Cloud-First e Polyglot Persistence.

## Fase 1: Fundações e Setup
- [x] ✅ **Sprint 0 — Fundações & Cloud:** `middleware.ts` com JWT SSR, clientes Singleton MongoDB Atlas e Redis Cloud, `lib/auth-utils.ts` centralizado, cache Redis distribuído, todas as rotas GET protegidas com JWT.

## Fase 2: Core Features (Leitura e Feed)
- [x] ✅ **Sprint 1 — Feed de Alta Performance:** `hooks/useFeed.ts` com Intersection Observer (infinite scroll automático), cache Redis TTL 15-30s, `POST /api/posts` seguro, `POST /api/posts/views` via Redis INCR.
- [x] ✅ **Sprint 2 — Explorar & Busca Global:** `hooks/useSearch.ts` com debounce 400ms, filtros de período e ordenação, carousel trending com Link navegável, API de search com sanitização e suporte a filtros.
- [x] ✅ **Sprint 7 — Editorial (Polyglot):** `api/drafts` CRUD completo (GET/POST/PUT/DELETE) no MongoDB, `api/posts/publish` com fluxo Draft→post_contents (MongoDB) + metadados (Supabase) + invalidação de cache Redis. `invalidateFeedCache` adicionado ao `lib/redis.ts`.

## Fase 3: Social e Interação Realtime
- [x] ✅ **Sprint 3 — Activity & Notificações:** JWT em todas as rotas, `PATCH /api/activity` (mark-as-read), log de snapshot no MongoDB (`activity_logs`), agrupamento por dia na UI, Supabase Realtime mantido.
- [x] ✅ **Sprint 4 — Chat 1:1:** `conversations` e `messages` migrados para `requireAuth` (JWT). Limites de mensagem, PATCH mark-as-read, invalidação de cache por participante.
- [x] ✅ **Sprint 5 — Perfil:** `PATCH /api/profile` (nome/handle/bio + check unicidade), `PUT /api/profile` (avatar), `POST /api/follow` + `DELETE /api/follow` com antiduplicata.
- [x] ✅ **Sprint 6 — Comentários:** `GET` paginado com cursor, `POST` com suporte a replies (parentId), `DELETE` soft-delete pelo autor, `PATCH` like/unlike idempotente.

## Fase 4: Analytics e Maturidade
- [x] ✅ **Sprint 8 — Analytics, Jobs & Escala:** `GET /api/analytics/posts` (views Redis+Supabase, likes, engagement_rate, série temporal MongoDB 30d). `POST /api/cron/consolidate-views` (CRON_SECRET, Redis scanIterator → Supabase batch, log no MongoDB). `lib/rate-limit.ts` (sliding window Redis, fail-open, 429+Retry-After). Vercel Cron configurado a cada 6h.
- [x] ✅ **Sprint 17 — Refatoração & Performance:** 
  - Instrumentação de performance (console.time), timeout de rede Redis (500ms), API unificada de notificações (`/api/notifications/unread-count`), batching de views (buffer de 5s).
  - Eliminação de N+1 no Chat.
  - Eliminação do fetch N+1 no Feed (passagem de views, shares e correção de contagem curtidas via Props ao invés de requisição individual).
  - Ativação do **Turbopack** e índices SQL (feed_v3, mensagens) validados e otimizados!
- [x] ✅ **Sprint 14 — Qualidade & PWA:** `manifest.webmanifest`, Service Worker (Network First + offline fallback), `ThemeProvider` dark mode (localStorage + prefers-color-scheme), `ThemeToggle` com aria, skip-to-content WCAG 2.1 AA, Open Graph/Twitter metadata, `sitemap.ts`, `robots.ts`, `ServiceWorkerRegistrar` client-only.

## Fase 5: Expansão Futura (Visão Detalhada)
- [ ] **Sprint 15 — Definições & Conta (Settings):** Interface centralizada para troca de senha/email, exclusão de conta (GDPR), gerenciamento de sessões ativas e preferências de leitura (acessibilidade).
- [ ] **Sprint 9 — Reels (Vídeos Curtos):** Upload e exibição de vídeos curtos (vertical, até 60s) via Cloudinary. Feed dedicado a reels, swipe vertical, autoplay.
- [ ] **Sprint 10 — Live ao Vivo com Chat:** Criação e agendamento de streams. Player com chat público em tempo real e gravação/VOD posterior.
- [ ] **Sprint 11 — Social Avançado:** Grupos/Comunidades. Menções de usuários (`@user`) em posts/comentários e Tags Inteligentes para livros/autores.
- [ ] **Sprint 12 — Explorar & Descoberta:** Algoritmo de recomendação personalizado consumindo `activity_logs` e `post_analytics` do MongoDB.
- [ ] **Sprint 13 — Monetização & Engajamento:** Sistema de gorjetas, posts exclusivos para assinantes e gamificação com badges/conquistas.

## Fase 6: Chat Advanced & Realtime Performance
- [x] ✅ **Sprint 16 — Chat 2.0 (UX & Backend Fix):** 
    - **UX:** Modal "Nova Conversa" funcional, busca de seguidores reativada e redesign Master-Detail (blueprint premium).
    - **Backend:** Nova política RLS para `conversations` (permissive insert), correção de bootstrap de participantes e Realtime habilitado para edição/deleção.
    - **Interatividade:** Sistema de reações (emoji toggle), edição inline e exclusão lógica de mensagens.
- [ ] **Sprint 16.1 — Chat Avançado (Pendente):** Gestão de grupos, anexos via Cloudinary, mensagens de voz e cache IndexedDB.

---
*Voltar para: [[00_LiteraConnect_Home]]*