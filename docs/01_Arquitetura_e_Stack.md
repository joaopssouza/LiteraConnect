# Arquitetura e Stack Tecnológica

O LiteraConnect utiliza uma arquitetura **100% Self-Hosted** e **Polyglot Persistence**, distribuindo responsabilidades entre diferentes bancos de dados em uma infraestrutura conteinerizada orquestrada via Docker Compose para maximizar performance e controle sobre os dados.

## Stack Principal
- **Frontend/Backend:** React com Next.js (App Router). Mistura de SSR (Server-Side Rendering) para SEO/Auth e CSR (Client-Side Rendering) para interatividade (Mensagens, Editor). A aplicação roda em um contêiner próprio otimizado utilizando a diretiva `output: 'standalone'` do Next.js, dispensando serviços de nuvem de terceiros.
- **APIs:** API Routes do Next.js e Server Actions. Sem necessidade de servidor Express isolado.
- **Hospedagem:** Servidor próprio (Bare Metal/VPS) com todos os serviços encapsulados no ecossistema Docker Compose.

## A Trindade de Dados (Polyglot Persistence Self-Hosted)
A aplicação não depende de um único banco de dados monolítico, e toda a stack é mantida localmente.

### 1. Supabase Stack (PostgreSQL) — "O Cérebro"
- **Infraestrutura:** Hospedado localmente via Docker. A stack completa inclui PostgreSQL, GoTrue (Auth), PostgREST, Storage, Realtime, pg-meta e o Kong (atuando como API Gateway nas portas 8010/8443).
- **Papel:** Fonte da verdade para Identidade, Relacionamentos e Metadados.
- **Uso:** Autenticação (JWT), tabelas relacionais (`users`, `follows`, `posts` metadados), e orquestração de **Realtime** (Mensagens e Notificações).

### 2. MongoDB (NoSQL) — "A Memória"
- **Infraestrutura:** Rodando localmente através da imagem `mongo:7` no Docker Compose. A administração é realizada internamente via `mongo-express`.
- **Papel:** Armazenamento de Conteúdo Rico e Logs.
- **Uso:** Salva os documentos JSON complexos gerados pelo TipTap (Drafts e Posts Publicados). Também armazena logs de alta volumetria (`activity_logs`) para analytics futuro sem travar o banco relacional.

### 3. Redis — "O Sistema Nervoso"
- **Infraestrutura:** Contêiner local rodando `redis:7-alpine`. Configurado com políticas de retenção adequadas (LRU) e persistência de dados.
- **Papel:** Acelerador de Performance (Fast Path) e gerenciamento de Rate Limiting.
- **Uso:** Cache de feeds (TTL curto) e contadores de visualização de alta frequência (usando **INCR simples** com TTL), mascarando latências e preservando a integridade dos bancos principais.

## Infraestrutura de Mídia e Comunicação
- **Armazenamento e Processamento:** Supabase Storage (local) orquestra os arquivos, operando em conjunto com o contêiner `imgproxy` para transformação, otimização e redimensionamento de imagens em tempo real.
- **Resend:** Plataforma de **E-mail Transactional** utilizada via **Custom SMTP** integrado ao Supabase Auth local. Garante alta entregabilidade para notificações críticas, superando restrições de provedores comuns.

---
*Voltar para: [[00_LiteraConnect_Home]]*