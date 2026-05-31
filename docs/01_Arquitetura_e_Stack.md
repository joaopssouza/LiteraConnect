# Arquitetura e Stack Tecnológica

O LiteraConnect utiliza uma arquitetura **Cloud-First** e **Polyglot Persistence**, distribuindo responsabilidades entre diferentes bancos de dados para maximizar performance e flexibilidade.

## Stack Principal
- **Frontend:** React com Next.js (App Router). Mistura de SSR (Server-Side Rendering) para SEO/Auth e CSR (Client-Side Rendering) para interatividade (Mensagens, Editor).
- **Backend:** API Routes do Next.js e Server Actions. Sem necessidade de servidor Express isolado.
- **Hospedagem:** Planejado para **Vercel** (Front e Back integrados).

## A Trindade de Dados (Polyglot Persistence)
A aplicação não depende de um único banco de dados monolítico.

### 1. Supabase (PostgreSQL) — "O Cérebro"
- **Papel:** Fonte da verdade para Identidade, Relacionamentos e Metadados.
- **Uso:** Autenticação (JWT), tabelas relacionais (`users`, `follows`, `posts` metadados), e orquestração de **Realtime** (Mensagens e Notificações).

### 2. MongoDB Atlas (NoSQL) — "A Memória"
- **Papel:** Armazenamento de Conteúdo Rico e Logs.
- **Uso:** Salva os documentos JSON complexos gerados pelo TipTap (Drafts e Posts Publicados). Também armazena logs de alta volumetria (`activity_logs`) para analytics futuro sem travar o banco relacional.

### 3. Redis Cloud / Upstash — "O Sistema Nervoso"
- **Papel:** Acelerador de Performance (Fast Path).
- **Uso:** Cache de feeds (TTL curto), contadores de visualização de alta frequência (usando **INCR simples** com TTL para otimizar a memória no Free Tier) e Rate Limiting. Essencial para mascarar a latência de rede em arquiteturas Cloud.

## Infraestrutura de Mídia e Comunicação
- **Cloudinary:** Responsável pelo upload, otimização e entrega via CDN de avatares, capas de livros e imagens.
- **Resend:** Plataforma de **E-mail Transactional** utilizada via **Custom SMTP** integrado ao Supabase Auth. Garante alta entregabilidade para notificações críticas, boas-vindas e recuperação de conta, superando as limitações de cota do provedor padrão.

---
*Voltar para: [[00_LiteraConnect_Home]]*