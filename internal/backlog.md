# LiteraConnect Delivery Plan (Substack-inspired)

## Vision
Construir experiência tipo Substack: feed rico, descoberta, notificações em tempo real, chat, perfil editável e interações, usando Next.js (App Router) + Supabase (Relacional/Auth) + MongoDB (NoSQL/Drafts) + Redis (Cache/Performance) + Cloudinary.

## Stack Técnica
- **Frontend:** React (.tsx) + Next.js App Router (SSR para auth/SEO; CSR para feed/chat/editor)
- **Backend:** Node.js via API Routes + Server Actions (Next.js)
- **Auth/DB Relacional:** Supabase (JWT, RLS, Realtime, PostgreSQL)
- **NoSQL:** MongoDB — Fonte da verdade para Drafts, conteúdo JSON do TipTap e logs de analytics.
- **Cache/Performance:** Redis — Acelerador de feeds, contadores de views (INCR + TTL 7 dias), rate limiting e presença. *(HLL descartado: 12KB/post esgotaria o free tier de 30MB com ~2.500 posts)*
- **Mídia:** Cloudinary — upload de imagens e vídeos.

## Sprints sequenciados
- **Sprint 0 — Fundações** ✅ *Concluído*
  - Implementar `middleware.ts` com validação SSR de JWT (auth.getUser).
  - Criar tabelas no Supabase (cloud): `posts` (metadados), `conversations`, `messages`, `notifications` (com estado read), `likes`, `comments`, `follows`; políticas RLS para cada uma.
  - Validar coleções no **MongoDB Atlas** (cloud): `drafts`, `post_contents`, `activity_logs`; criar índices em `author_id` e `created_at`.
  - Confirmar conexão com **Redis** (RedisLabs cloud, 30MB free) e **Cloudinary** (cloud CDN).
  - Mover chamadas Supabase/keys para Server Actions ou API Routes; base de APIs para feed, search, activity, chat send.
  - Validar todas as credenciais no `.env` (Supabase, Cloudinary, MongoDB Atlas URI, Redis URL).

- **Sprint 1 — Feed** ✅ *Concluído*
  - Cursor pagination + infinite scroll na home.
  - Score de trending (likes, comentários, recência) e mistura follow+trending.
  - Aceleração via **Redis**: Cache da listagem do feed (TTL 15-30s) e contadores de visualização em tempo real.
  - API de feed: Busca metadados no Supabase e conteúdo resumido no MongoDB/Redis.
  - Editar/deletar post com soft-delete.

- **Sprint 2 — Explorar** ✅ *Concluído*
  - Busca full-text (title/content/book_title) via **MongoDB Atlas Search** ou Supabase; filtros por categoria/tag/período.
  - Carousel/trending dinâmico; sugestões de autores/tópicos.
  - UI conectada às APIs de busca e trending.

- **Sprint 3 — Activity/notifications** ✅ *Concluído*
  - Incluir eventos de follow, likes e replies; timestamps relativos; unread/read.
  - Realtime via Supabase; endpoint mark-as-read; agrupamento por dia na UI.
  - Persistência de logs de eventos estruturados no **MongoDB** para analytics avançado.

- **Sprint 4 — Chat 1:1** ✅ *Concluído*

- **Sprint 5 — Perfil/social** ✅ *Concluído*

- **Sprint 6 — Comentários** ✅ *Concluído*

- **Sprint 7 — Editorial (Polyglot Persistence)** ✅ *Concluído*
  - WYSIWYG no post (TipTap); Fluxo de rascunhos: Salvar `drafts` no **MongoDB** -> Publicar -> Mover para `post_contents` (MongoDB) e criar entrada de metadados no Supabase.
  - Agendamento/visibilidade (público/não listado).
  - Share CTA; analytics por post (Views via **Redis INCR + TTL 7 dias**, logs detalhados no **MongoDB**).

- **Sprint 8 — Analytics & Observabilidade** ✅ *Concluído*

- **Sprint 17 — Refatoração & Performance** ✅ *Concluído*
  - Instrumentação de performance (console.time), timeout de rede Redis (500ms), API unificada de notificações (`/api/notifications/unread-count`), batching de views (buffer de 5s).
  - Eliminação de fetch N+1 no Feed (passagem de views, shares, likes e comments via props no PostCard).
  - Eliminação de N+1 no Chat.
  - Ativação do **Turbopack** e validação de índices SQL.

- **Sprint 9 — Reels (Vídeos Curtos)**
  - Upload e exibição de vídeos curtos (vertical, até 60s) via Cloudinary.
  - Feed dedicado a reels, swipe vertical, autoplay.
  - Comentários e likes em reels.

- **Sprint 10 — Live ao Vivo com Chat**
  - Criação e agendamento de lives; Player com chat em tempo real.
  - Notificações de live via Supabase Realtime.
  - Encerramento e gravação (VOD).

- **Sprint 11 — Social Avançado**
  - Grupos/Comunidades; Menções (@user); Tags inteligentes para livros/autores.
  - Sugestão de amigos baseada em interesses e interações (Analytics do MongoDB).

- **Sprint 12 — Explorar & Descoberta**
  - Algoritmo de recomendação personalizado: consumir `activity_logs` do **MongoDB**.
  - Cache de recomendações no **Redis** (TTL 1h) para performance < 100ms.
  - Busca avançada e curadoria editorial.

- **Sprint 13 — Monetização & Engajamento**
  - Gorjetas; Posts pagos/exclusivos; Métricas avançadas; Gamificação.

- **Sprint 15 — Definições & Conta (Settings)**
    - Troca de senha e e-mail com confirmação via Supabase Auth.
    - Exclusão lógica/física da conta (GDPR) e exportar dados.
    - Centro de Privacidade: Gerenciar posts ocultos (Redis), bloqueio de usuários e visibilidade do perfil.
    - Preferências globais: temas (persistidos), tamanho de fonte do leitor e sons de notificação.
    - Dashboard de segurança: Listar e revogar sessões ativas de outros dispositivos.

## Fase 6: Chat Advanced & Realtime Performance
- **Sprint 16 — Chat 2.0 (Alta Performance & UX)** ✅ *Parcialmente Concluído*
    - **Descoberta & Início:** Busca de usuários e modal "Nova Conversa" funcionais. ✅
    - **Mensagens Avançadas:** Edição inline e exclusão lógica (soft-delete). ✅
    - **Interatividade:** Reações com emojis via Realtime (toggle). ✅
    - **Design Premium:** UI Master-Detail (30/70), Search Pill e Filter Chips. ✅
    - **RLS via RPC:** `create_direct_conversation` com SECURITY DEFINER resolve o `42501` permanentemente. ✅
    - **Bug fixes UX (9 Apr):**
        - Avatar: `onError` handler com fallback para `/api/avatar` em caso de URL inválida. ✅
        - Presença Online: canal `online:users` agora escuta `join`/`leave` além de `sync`. ✅
        - Typing indicator: null-safe checks no `presenceState` (campo `typing` pode ser undefined). ✅
        - Ícones Voz/Vídeo: desabilitados visualmente (`disabled`, `cursor-not-allowed`). ✅
        - Ícone Configurações: desabilitado (aguarda Sprint 15). ✅
        - Input bar: `items-center` no footer mantém ícones alinhados ao centro com textarea expandido. ✅
    - **Gestão de Grupos:** UI para criação de grupos e gestão de membros. *(Pendente)*
    - **Performance Avançada:** Cache local (IndexedDB) e mensagens de voz. *(Pendente)*


- **Sprint 14 — Qualidade, Mobile & Acessibilidade** ✅ *Concluído*

## Áreas e arquivos chave
- Feed: app/page.tsx, components/PostCard.tsx
- Explorar: app/explore/page.tsx
- Activity: app/activity/page.tsx
- Chat: app/chat/page.tsx
- Perfil: app/profile/page.tsx, app/profile/[handle]/page.tsx
- Post detail: app/post/[id]/page.tsx
- Infra: lib/supabase.ts, lib/mongodb.ts, lib/redis.ts, lib/cloudinary.ts.

## Decisões Arquiteturais
- **Supabase (PostgreSQL + Auth):** Fonte da verdade para **Identidade, Relacionamentos e Metadados**. Orquestrador de Realtime.
- **MongoDB (NoSQL):** Fonte da verdade para **Conteúdo Rico** (JSON TipTap), Drafts e Logs de Analytics de alta volumetria.
- **Redis (Carga/Cache):** Acelerador de **Performance (Fast Path)**. Cache de feeds, contadores voláteis, rate limiting e presença.
- Soft-delete para posts/comentários; estado read/unread para notificações.

## Considerações
1) Editor rico: TipTap já implementado com Toolbar, BubbleMenu e upload Cloudinary.
2) Busca: **MongoDB Atlas Search** como estratégia principal (já estamos no Atlas). Supabase full-text como fallback para metadados.
3) Infra: Todos os serviços rodam 100% em cloud (Supabase, MongoDB Atlas, RedisLabs, Cloudinary). Nenhuma dependência local.
4) Chat: começar 1:1; grupos no Sprint 11.

## Verificação (checklist rápida)
- Lint/tests: npm run lint;
- Manual: fluxo completo de publicação (MongoDB) e exibição (Redis Cache + Supabase).
- Segurança: RLS no Supabase e validação de tokens nas rotas de API do MongoDB/Redis.
