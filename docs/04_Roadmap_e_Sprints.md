	# Roadmap e Sprints

Este é o plano de entrega do LiteraConnect, atualizado para refletir a nossa arquitetura Cloud-First e Polyglot Persistence.

## Fase 1: Arquitetura, Infraestrutura e Performance
- [x] ✅ **Sprint 0 — Fundações & Cloud:** `middleware.ts` com JWT SSR, clientes Singleton MongoDB Atlas e Redis Cloud, `lib/auth-utils.ts` centralizado, cache Redis distribuído, todas as rotas GET protegidas com JWT.
- [x] ✅ **Sprint 8 — Analytics, Jobs & Escala:** [[Analytics API]] (views Redis+Supabase, likes, engagement_rate, série temporal MongoDB 30d). [[Cron Jobs API]] (CRON_SECRET, Redis scanIterator → Supabase batch, log no MongoDB). `lib/rate-limit.ts` (sliding window Redis, fail-open, 429+Retry-After). Vercel Cron configurado a cada 6h.
- [x] ✅ **Sprint 17 — Refatoração & Performance:** 
  - Instrumentação de performance (console.time), timeout de rede Redis (500ms), [[Notifications API]] unificada (`/api/notifications/unread-count`), batching de views (buffer de 5s).
  - Eliminação de N+1 em Mensagens.
  - Eliminação do fetch N+1 no Feed (passagem de views, shares e correção de contagem curtidas via Props ao invés de requisição individual).
  - Ativação do **Turbopack** e índices SQL (feed_v3, mensagens) validados e otimizados!

## Fase 2: Core Features (Leitura, Feed, Edição e Mídia)
- [x] ✅ **Sprint 1 — Feed de Alta Performance:** `hooks/useFeed.ts` com Intersection Observer ([[Feed API]]), cache Redis TTL 15-30s, `POST /api/posts` seguro ([[Posts API]]), `POST /api/posts/views` via Redis INCR.
- [x] ✅ **Sprint 2 — Explorar & Busca Global:** `hooks/useSearch.ts` com debounce 400ms, filtros de período e ordenação, carousel trending com Link navegável, [[Search API]] com sanitização e suporte a filtros.
- [x] ✅ **Sprint 7 — Editorial (Polyglot):** [[Drafts API]] CRUD completo (GET/POST/PUT/DELETE) no MongoDB, [[Posts API]] com fluxo Draft→post_contents (MongoDB) + metadados (Supabase) + invalidação de cache Redis. `invalidateFeedCache` adicionado ao `lib/redis.ts`.
- [x] ✅ **Sprint 9 — Reels (Vídeos Curtos):** Feed vertical estilo TikTok com autoplay, infinito e scroll snapping. Studio de criação de reels integrado com upload otimizado via Supabase Storage e likes otimistas via Supabase. **Compatibilidade Desktop (H.264) e Bitrate dinâmico implementados!**

## Fase 3: Interação Social, Perfil e Realtime
- [x] ✅ **Sprint 3 — Activity & Notificações:** JWT em todas as rotas, [[Activity API]] (mark-as-read), log de snapshot no MongoDB (`activity_logs`), agrupamento por dia na UI, Supabase Realtime mantido.
- [x] ✅ **Sprint 5 — Perfil:** [[Profile API]] (nome/handle/bio + check unicidade), [[Avatar API]] (avatar), [[Follow API]] + `DELETE /api/follow` com antiduplicata.
- [x] ✅ **Sprint 6 — Comentários:** [[Comments API]]: `GET` paginado com cursor, `POST` com suporte a replies (parentId), `DELETE` soft-delete pelo autor, `PATCH` like/unlike idempotente.
- [x] ✅ **Sprint 6.1 — Comentários em Árvore (UX Post):** Toggle de respostas ("Ver X respostas") e estilização de aninhamento no `PostDetailClient.tsx` para paridade com Reels.
- [x] ✅ **Sprint 6.2 — Comentários no Feed & UI Polish:** Injeção dos 3 comentários principais mais recentes diretamente no feed (`/api/feed`) via Supabase+Redis para posts de texto. Layout do `PostCard` ajustado para full-width com imagens em `object-contain`, avatar dos comentários corrigido para consumir o perfil oficial do BD e thumbnails de vídeo consertados na seção "Em Alta" (`/api/search`).
- [x] ✅ **Sprint 4 — Mensagens (antigo Chat):** [[Conversations API]] e [[Messages API]] migrados para `requireAuth` (JWT). Limites de mensagem, PATCH mark-as-read, invalidação de cache por participante.
- [x] ✅ **Sprint 16 — Mensagens 2.0 (UX & Backend Fix):** 
    - **UX:** Modal "Nova Conversa" funcional, busca de seguidores reativada e redesign Master-Detail (blueprint premium). O módulo primário "Chat" passou a chamar-se "Mensagens".
    - **Integração de Notificações:** A aba independente de "Atividades" foi removida da navegação global. Agora, "Atividades" funciona como o primeiro "contacto" fixo injetado na lista do módulo de Mensagens, que redireciona para `/activity`.
    - **Regra de Badge Global:** A notificação no botão de navegação principal de "Mensagens" representa a soma de `unreadMessages` + `unreadActivityCount`.
    - **Backend:** Nova política RLS para [[Conversations API]] (permissive insert), correção de bootstrap de participantes e Realtime habilitado para edição/deleção.
    - **Interatividade:** Sistema de reações (emoji toggle), edição inline e exclusão lógica de [[Messages API]].

## Fase 4: Experiência, Qualidade e Configurações (Settings)
- [x] ✅ **Sprint 14 — Qualidade & PWA:** `manifest.webmanifest`, Service Worker (Network First + offline fallback), `ThemeProvider` dark mode (localStorage + prefers-color-scheme), `ThemeToggle` com aria, skip-to-content WCAG 2.1 AA, Open Graph/Twitter metadata, `sitemap.ts`, `robots.ts`, `ServiceWorkerRegistrar` client-only. **Sistema de Som de Notificações (Twinkle.ogg) integrado ao Realtime!**
- [x] ✅ **Sprint 14.1 — Visualizador de Mídia (Modo Teatro):** Implementação do `MediaViewerModal` para visualização imersiva de mídias anexadas aos posts. Traz navegação em carrossel, controles de zoom, tela cheia e uma barra lateral com metadados do post, interações e sistema de comentários em tempo real.
- [x] ✅ **Sprint 15 — Definições & Conta (Settings):** Interface centralizada para troca de senha/email, exclusão de conta (GDPR), gerenciamento de sessões ativas e preferências de leitura (acessibilidade).

## Fase 5: Futuras Implementações (Backlog / Em Breve)
- [x] ✅ **Sprint 10 — Infra de E-mail SMTP:** 
    - **Infra:** Migração do serviço de e-mail do Supabase para **Custom SMTP via Resend**, garantindo alta entregabilidade e fim das limitações de cota.
- [x] ✅ **Sprint 11 — Social Avançado:**
    - **Tags Inteligentes:** `GET /api/tags/suggest` com busca regex no MongoDB `book_tags`, cache Redis TTL 10min, upsert de contagem de uso. Componente `TagInput` com autocomplete, debounce 300ms, navegação por teclado e criação de novas tags.
    - **Menções @user:** Já implementadas no backend (`/api/comments` — regex + notificação tipo `mention`).
- [x] ✅ **Sprint 12 — Explorar & Descoberta:**
    - **Algoritmo de Recomendação:** `GET /api/recommendations` — scoring composto (40% follows_similarity + 30% tag_overlap + 20% engagement_rate + 10% recency). Dados: `activity_logs` e `post_analytics` do MongoDB. Cache Redis TTL 5min.
    - **UI:** Seção "Para Você" com ícone Sparkles na `/explore`, acima do carousel "Em Alta".
- [x] ✅ **Sprint 15.1 — Configurações Avançadas:**
    - **2FA TOTP:** `POST /api/settings/mfa/enroll` (QR Code via Supabase MFA), `POST /api/settings/mfa/verify` (challenge + verify), `DELETE` (unenroll), `GET` (list factors). UI em `SecurityClient` com modal de QR Code e input de código 6 dígitos.
    - **OAuth Google:** Botão "Continuar com Google" no `LoginClient` via `supabase.auth.signInWithOAuth`, separador visual "ou continue com".
    - **(Pendente)** Notificações Push (Web Push API + VAPID keys).
- [x] ✅ **Sprint 16.1 — Mensagens Avançadas (Pendentes da S16):**
    - **Anexos via Supabase Storage:** `POST /api/chat/upload` com validação de tipo (image/audio/video), limite por tipo (10/5/30MB), rate limit 20 req/min, upload para pasta `chat_attachments`.
    - **Cache IndexedDB:** Hook `useOfflineMessages` para persistência de mensagens pendentes, com `saveMessage`, `getPending`, `markSent`, `markFailed` e `clearSent`.
    - **(Pendente)** Integração UI do anexo no ChatInput + mensagens de voz.
- [x] ✅ **Sprint 13 — Monetização & Engajamento:**
    - **Badges/Conquistas:** `GET /api/badges/:userId` (MongoDB + cache Redis), 7 tipos de badges (Primeira Resenha, Leitor Assíduo, Crítico, Influenciador, Pioneiro, Autor Querido, Conector). Componente `BadgeDisplay` (modo compacto com tooltip + modo grid completo).
    - **Cron Job:** `GET /api/cron/award-badges` (a cada 6h no Vercel) — verifica critérios e insere badges no MongoDB + notificação Supabase.
    - **(Pendente)** Sistema de gorjetas (Stripe) e posts exclusivos/premium.
---
*Voltar para: [[00_LiteraConnect_Home]]*
