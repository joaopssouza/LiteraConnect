# Backend e APIs (Next.js)

O backend do LiteraConnect vive dentro da pasta `app/api/` e utiliza o ecossistema Serverless-like via Next.js (App Router), empacotado como uma aplicação **standalone** no Docker.

## Segurança Global e Auth
- Validação de sessão estrita via SSR com `@supabase/ssr` (`auth.getUser()`).
- Tokens JWT validados no servidor antes de autorizar qualquer transação.
- O `userId` é *sempre* extraído do token, nunca de payloads ou query strings, prevenindo ataques de personificação.
- **Rate Limiting:** Proteção contra abusos (DDoS/Spam) via algoritmo **Token Bucket** usando a instância local do Redis. Limite de 30 requisições (burst) com recarga de 30 tokens a cada 10 segundos. Utiliza `ephemeralCache` e mapeamento híbrido (ID do JWT com fallback seguro para IP via `x-forwarded-for`).

## Tarefas em Segundo Plano (Cron Jobs)
- Na nova arquitetura, as rotas de cron (ex: `/api/cron/consolidate-views`) são acionadas de forma autônoma pelo **Ofelia**, um agendador de tarefas Dockerizado.
- O Ofelia é responsável por fazer requisições cURL programadas, com as devidas chaves de segurança (`CRON_SECRET`), batendo na interface de rede interna do contêiner do Next.js sem exposição ao ambiente externo.

## Rotas Principais (Endpoints)

### `/api/activity`
- **Métodos:** `GET`
- **Função:** Agrega de forma inteligente os eventos (likes, comentários, novos seguidores) ligados aos posts do usuário autenticado.
- **Performance:** Utiliza sistema de Server Cache interno (`getOrSetServerCache`) com TTL de 7 segundos para proteger o banco de dados contra polling excessivo.

### `/api/chat/conversations` (Módulo Mensagens)
- **Métodos:** `GET`, `PATCH`
- **Função:** 
  - `GET`: Retorna a lista de conversas, incluindo o preview da **última mensagem** e o item fixo de **Atividades** injetado no topo.
  - `PATCH`: Marca uma conversa específica como lida (`last_read_at`).

### `/api/notifications/unread-count`
- **Métodos:** `GET`
- **Função:** Endpoint de alta performance para o `Navigation.tsx`. Retorna a soma de `unreadMessages` + `unreadActivityCount`, utilizada para exibir a badge global no ícone de **Mensagens**.

### `/api/drafts`
- **Métodos:** `POST`, `PUT`
- **Função:** Interface direta e segura com a base local do **MongoDB**.
  - `POST`: Cria um novo rascunho (`insertOne`).
  - `PUT`: Atualiza o conteúdo rico de um rascunho existente (`updateOne`), garantindo que apenas o autor (`user.id`) possa modificar.

### `/api/feed` (e derivadas)
- **Função Estratégica:** Orquestração Híbrida. Essa API busca metadados e permissões no Supabase (PostgreSQL), consulta o "corpo" no MongoDB, e tenta servir tudo prioritariamente a partir do cache quente alocado na instância do Redis local.

---
*Voltar para: [[00_LiteraConnect_Home]]*