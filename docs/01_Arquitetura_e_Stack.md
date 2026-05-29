# Arquitetura e Stack Tecnológica

O LiteraConnect utiliza uma arquitetura **100% Self-Hosted** e **Polyglot Persistence**, distribuindo responsabilidades entre diferentes bancos de dados em containers Docker para maximizar performance e reduzir custos com nuvem.

## Stack Principal
- **Frontend:** React com Next.js (App Router). Mistura de SSR (Server-Side Rendering) para SEO/Auth e CSR (Client-Side Rendering) para interatividade (Chat, Editor).
- **Backend:** API Routes do Next.js e Server Actions executando em ambiente `standalone` Node.js.
- **Hospedagem:** **Docker Engine** em servidor dedicado via Nginx Proxy Manager, com redes virtuais isoladas (`db_network` e `proxy_network`).

## A Trindade de Dados (Polyglot Persistence)
A aplicação não depende de um único banco de dados monolítico.

### 1. Supabase Self-Hosted (PostgreSQL) — "O Cérebro"
- **Papel:** Fonte da verdade para Identidade, Relacionamentos e Metadados.
- **Uso:** Autenticação (JWT via GoTrue), tabelas relacionais (`users`, `follows`, `posts` metadados), e orquestração de **Realtime** (Chat e Notificações).

### 2. MongoDB Self-Hosted (NoSQL) — "A Memória"
- **Papel:** Armazenamento de Conteúdo Rico e Logs.
- **Uso:** Salva os documentos JSON complexos gerados pelo TipTap (Drafts e Posts Publicados). Também armazena logs de alta volumetria (`activity_logs`) para analytics futuro sem travar o banco relacional.

### 3. Redis Local — "O Sistema Nervoso"
- **Papel:** Acelerador de Performance (Fast Path).
- **Uso:** Cache de feeds (TTL curto), contadores de visualização de alta frequência (usando **INCR simples** com TTL) e Rate Limiting. Essencial para isolar o banco relacional de picos de acessos.

## Infraestrutura de Mídia
- **Supabase Storage:** Substituiu o Cloudinary. Responsável pelo upload e entrega de avatares (`avatars`), imagens de posts (`post-images`) e vídeos (`post-videos`), persistidos fisicamente no disco NVMe do servidor. Processamento on-the-fly garantido pelo container `imgproxy`.

---
*Voltar para: [[00_LiteraConnect_Home]]*