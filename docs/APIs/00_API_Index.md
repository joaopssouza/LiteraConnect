# Índice de APIs (Backend Next.js)

Esta pasta documenta todas as rotas de API do LiteraConnect, agrupadas por domínio de negócio. Utilize o diagrama de árvore abaixo para navegar pelas documentações detalhadas.

## 🌳 Diagrama de Árvore das APIs

- 📁 **Usuário & Perfil**
  - 📄 [[Profile API]] (`/api/profile`) — Atualização de nome, bio e handle.
  - 📄 [[Avatar API]] (`/api/avatar`) — Upload e gestão de foto de perfil.
- 📁 **Social & Interação**
  - 📄 [[Follow API]] (`/api/follow`) — Seguir e deixar de seguir usuários.
  - 📄 [[Activity API]] (`/api/activity`) — Feed de notificações e eventos.
  - 📄 [[Notifications API]] (`/api/notifications/unread-count`) — Contagem unificada de não-lidos.
  - 📄 [[Comments API]] (`/api/comments`) — Gestão de comentários em posts.
- 📁 **Conteúdo & Feed**
  - 📄 [[Feed API]] (`/api/feed`) — Orquestração da timeline com Redis Cache.
  - 📄 [[Reels API]] (`/api/reels`) — Feed de vídeos verticais com cache poliglota.
  - 📄 [[Posts API]] (`/api/posts`, `/publish`, `/views`) — Criação, leitura, contagem de views.
  - 📄 [[Drafts API]] (`/api/drafts`) — Rascunhos salvos no MongoDB.
  - 📄 [[Search API]] (`/api/search`) — Busca global no MongoDB Atlas.
- 📁 **Comunicação (Mensagens)**
  - 📄 [[Conversations API]] (`/api/chat/conversations`) — Lista de mensagens, incluindo o link para Atividades.
  - 📄 [[Messages API]] (`/api/chat/messages`) — Envio e histórico de mensagens.
  - 📄 [[Presence API]] (`/api/chat/presence`) — Status de online/offline.
- 📁 **Sistema & Analytics**
  - 📄 [[Analytics API]] (`/api/analytics/posts`) — Dados de engajamento para autores.
  - 📄 [[Cron Jobs API]] (`/api/cron/consolidate-views`) — Background jobs.

---
**Nota de Segurança Global:** Quase todas as APIs exigem o Header de Autorização (Cookies gerenciados pelo Supabase SSR) e o usuário é extraído de forma segura no backend via `requireAuth(request)`.