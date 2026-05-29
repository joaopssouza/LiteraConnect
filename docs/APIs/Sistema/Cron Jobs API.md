# Cron Jobs API (`/api/cron/consolidate-views`)

Um job em background crítico para a arquitetura Polyglot. Como o **Redis** acumula as visualizações do dia-a-dia em memória para garantir rapidez, esta API recolhe esses números e os persiste no **Supabase** de forma permanente antes que as chaves do Redis expirem (TTL).

## Segurança de Sistema (Machine-to-Machine)
- 🔒 **Protegida por Secret:** Esta rota não usa JWT de usuário. Ela espera um header `Authorization: Bearer {CRON_SECRET}` configurado na sua infraestrutura para garantir que apenas o serviço de agendamento local (Container Docker Ofelia) possa invocá-la.

---

## 1. Consolidar Views (Redis -> PostgreSQL)
- **Método:** `POST`
- **Endpoint:** `/api/cron/consolidate-views`

### Comportamento
1. Varre o **Redis** (`scanIterator`) procurando por chaves no padrão `post:*:views`.
2. Lê os valores em bloco usando `redis.multi()` (Pipeline) para não saturar a rede.
3. Cria um cliente do **Supabase** ignorando o RLS (`SUPABASE_SERVICE_ROLE_KEY`), pois é uma operação sistêmica.
4. Processa a persistência em lotes (ex: 50 posts por vez) para atualizar a coluna `views_count` da tabela `posts`.
5. Grava um log final no **MongoDB** (coleção `cron_logs`) informando duração, posts processados e erros encontrados.

### Respostas
- `200 OK`: `{"message": "Consolidação concluída.", "processed": 50, "errors": 0}`
- `401 Unauthorized`: Caso o `CRON_SECRET` enviado seja inválido.

---
*Voltar para: [[00_API_Index]]*