# Posts API (`/api/posts`, `/publish`, `/views`)

Gerencia a criação e contagem de engajamento dos posts publicados na plataforma.

## Segurança e Controle de Abuso
- 🔒 **Protegida:** Sim (JWT obrigatório em todas).
- 🛡️ **Rate Limit:** Implementado em `/api/posts` (10 posts por minuto por usuário via Redis).
- 🧹 **Validação de Conteúdo:** O texto do post é limitado a 5000 caracteres e é obrigatoriamente *trimmed*.

---

## 1. Criar Post Simples
- **Método:** `POST`
- **Endpoint:** `/api/posts`

### Body (JSON)
```json
{
  "content": "Meu texto",
  "book_title": "Opcional",
  "book_cover_url": "URL Opcional"
}
```

### Comportamento
1. Verifica Rate Limit no Redis.
2. Valida e trunca o conteúdo.
3. Insere o registro no **Supabase**.
4. Invalida o cache local do Feed do autor `invalidateServerCacheByPrefix(feed:{user.id})`.

---

## 2. Publicar Rascunho (Polyglot)
- **Método:** `POST`
- **Endpoint:** `/api/posts/publish`

Esta é uma das rotas mais complexas arquiteturalmente, fazendo a ponte entre **MongoDB** e **Supabase**.

### Body (JSON)
```json
{
  "draftId": "mongo_object_id",
  "visibility": "public", 
  "scheduledAt": null 
}
```

### Comportamento (Transação Distribuída)
1. Busca o rascunho completo no **MongoDB** (`drafts`).
2. Persiste apenas os **Metadados** (e um snippet de 500 chars para preview) no **Supabase**.
3. Move o documento JSON completo do rascunho para a coleção **MongoDB** `post_contents`.
4. Atualiza o status do rascunho no Mongo para `published`.
5. Inicializa o contador de visualizações no **Redis** (`INCR`).
6. Invalida os caches do feed.

---

## 3. Incrementar Visualizações (Views)
- **Método:** `POST`
- **Endpoint:** `/api/posts/views`

### Body (JSON)
```json
{
  "postId": "uuid_opcional",
  "postIds": ["uuid1", "uuid2"] // Suporte a lotes
}
```

### Comportamento
- **Estratégia de Buffer:** O frontend utiliza um buffer (`lib/view-buffer.ts`) que acumula IDs por 5 segundos ou até atingir 20 posts, enviando tudo em uma única requisição.
- **Redis:** Incrementa atomicamente cada ID no lote via Redis.
- **Prevenção de Fraude:** O backend ignora silenciosamente visualizações do próprio autor.

---
*Voltar para: [[00_API_Index]]*