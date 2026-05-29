# Bancos de Dados e Esquemas

Esta página detalha a estrutura de dados dividida entre os três serviços self-hosted (via Docker) no LiteraConnect.

## 1. Supabase (PostgreSQL - Container)
Focado em relacionamentos fortes e integridade referencial. Acesso restrito via Row Level Security (RLS).

**Tabelas Principais:**
- `users`: Perfis de usuário (`id`, `name`, `handle`, `avatar_url`, `last_seen_at`).
- `posts`: Apenas metadados para indexação rápida (`id`, `user_id`, `created_at`, `views_count`). *O conteúdo real fica no MongoDB.*
- `follows`: Grafo social (`follower_id`, `following_id`).
- `likes` & `comments`: Interações sociais ligadas aos posts (com soft-delete).
- `conversations` & `messages`: Estrutura do Chat 1:1 e grupos.
- `notifications`: Alertas do sistema (tipo, status de leitura e trigger associado).

**Otimização e Performance:**
- **Índices Estratégicos:** Foram aplicados índices compostos e de busca para acelerar o feed (`idx_posts_feed_v3`), contagem de interações e recuperação de histórico de mensagens (`idx_messages_convo_created`).
- **RPCs:** Utiliza-se a função `get_chat_unread_counts` para processar badges diretamente no Postgres.

## 2. MongoDB (Container NoSQL)
Focado em flexibilidade e documentos não-estruturados complexos.

**Coleções Principais:**
- `drafts`: Rascunhos em progresso. Estrutura JSON flexível gerada pelo TipTap.
- `post_contents`: O corpo do post finalizado (migrado do draft após publicação).
- `activity_logs`: Registro imutável de eventos (ex: "Usuário X visualizou o Post Y", "Tempo de Leitura Z") para alimentar algoritmos de recomendação no futuro.

## 3. Redis (Cache e Contadores Locais)
Focado em operações em memória de latência sub-milissegundo, vital para isolar os bancos principais de picos de carga.

**Padrões de Chaves (Keys):**
- `post:{id}:views` *(String/Integer)*: Contador atômico de visualizações via `INCR` simples. *(Nota Estratégica: HLL foi descartado pois exigia ~12KB por post, o que consumiria muita RAM desnecessariamente, enquanto INCR gasta ~8 bytes)*. Possui TTL de 7 dias antes de ser consolidado no Supabase via cron job (Ofelia container).
- `feed:global` ou `feed:{userId}` *(String/JSON)*: Cache dos últimos posts montados para a timeline. TTL curto (15-30s) para manter sensação de tempo real.
- `chat:conversations:{userId}`: Cache de conversas para acesso imediato no menu da interface.

---
*Voltar para: [[00_LiteraConnect_Home]]*