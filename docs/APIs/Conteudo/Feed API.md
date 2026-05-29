# Feed API (`/api/feed`)

O coração do consumo de conteúdo da plataforma. Responsável por orquestrar a busca de posts (timeline), combinando alta performance via **Redis Cache** com paginação por cursor.

## Segurança e Performance
- 🔒 **Protegida:** Sim (JWT obrigatório).
- 🚀 **Cache Server-Side:** Sim. A API gera uma chave única baseada no `userId` e no `cursor`. Se for o primeiro acesso (sem cursor), faz cache com **TTL de 15 segundos**. Para próximas páginas, o TTL cai para 7 segundos. Responde com cabeçalhos `stale-while-revalidate`.

---

## 1. Carregar Timeline (Home)
- **Método:** `GET`
- **Endpoint:** `/api/feed`

### Query Params (Opcionais)
- `cursor` (string): Timestamp `created_at` do último item carregado (para paginação).
- `limit` (number): Padrão é 10. Máximo é 50.

### Comportamento
1. Checa o cache `feed:{userId}:{cursor}:{limit}`. Se der *hit*, retorna imediato.
2. Consulta o **Supabase** (`posts` join com `users`, `likes`, `comments`).
3. **Filtros Aplicados:** 
   - Apenas status `published`.
   - Ignora posts cujo `scheduled_at` seja no futuro.
   - Mostra posts `public` de todos ou `unlisted` se o post pertencer ao próprio usuário.
4. Calcula se há mais itens (`hasMore`) e devolve o `nextCursor`.

### Respostas
- `200 OK`: 
  ```json
  {
    "items": [{ "id": "...", "content": "...", "author": {...}, "likes_count": 0, "comments_count": 0 }],
    "nextCursor": "2026-03-31T12:00:00.000Z" // ou null
  }
  ```

---
*Voltar para: [[00_API_Index]]*