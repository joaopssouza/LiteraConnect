# Backend e APIs (Next.js)

O backend do LiteraConnect vive dentro da pasta `app/api/` e utiliza as API Routes e Server Actions do Next.js. O sistema é executado em modo `standalone` dentro de um container Docker, otimizando o consumo de recursos na infraestrutura self-hosted.

## Segurança Global e Auth
- Validação de sessão estrita via SSR com `@supabase/ssr` (`auth.getUser()`).
- Tokens JWT validados no servidor antes de autorizar qualquer transação.
- O `userId` é *sempre* extraído do token, nunca de payloads ou query strings, prevenindo ataques de personificação.

## Rotas Principais (Endpoints)

### `/api/activity`
- **Métodos:** `GET`
- **Função:** Agrega de forma inteligente os eventos (likes, comentários, novos seguidores) ligados aos posts do usuário autenticado.
- **Performance:** Utiliza sistema de Server Cache interno (`getOrSetServerCache`) com TTL de 7 segundos para proteger o banco de dados contra polling excessivo.

### `/api/chat/conversations`
- **Métodos:** `GET`, `PATCH`
- **Função:** 
  - `GET`: Retorna a lista de conversas, incluindo o preview da **última mensagem** recuperada via única query otimizada (eliminando o problema N+1).
  - `PATCH`: Marca uma conversa específica como lida (`last_read_at`).

### `/api/notifications/unread-count`
- **Métodos:** `GET`
- **Função:** Endpoint de alta performance para o `Navigation.tsx`. Retorna em um único payload as contagens de Chat e Atividades sociais, reduzindo o polling e o consumo de dados.

### `/api/drafts`
- **Métodos:** `POST`, `PUT`
- **Função:** Interface direta e segura com o **MongoDB**.
  - `POST`: Cria um novo rascunho (`insertOne`).
  - `PUT`: Atualiza o conteúdo rico de um rascunho existente (`updateOne`), garantindo que apenas o autor (`user.id`) possa modificar.

### `/api/feed` (e derivadas)
- **Função Estratégica:** Orquestração Híbrida. Essa API busca metadados e permissões no Supabase, consulta o "corpo" no MongoDB, e tenta servir tudo prioritariamente a partir do cache quente no Redis.

---
*Voltar para: [[00_LiteraConnect_Home]]*