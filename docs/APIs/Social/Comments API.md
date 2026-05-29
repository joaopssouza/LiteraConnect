# Comments API (`/api/comments`)

Gerencia a leitura, criação, exclusão (soft-delete) e likes em comentários de posts. Interage exclusivamente com o **Supabase**.

## Segurança e Controle de Abuso
- 🔒 **Protegida:** Sim (JWT obrigatório para escrita e leitura).
- 🛡️ **Rate Limit:** 30 comentários por minuto por usuário (Controlado via Redis).
- 🧹 **Validação:** Conteúdo limitado a 1000 caracteres.

---

## 1. Listar Comentários
- **Método:** `GET`
- **Endpoint:** `/api/comments?postId={id}`

### Query Params
- `postId` (Obrigatório): O post a ser consultado.
- `cursor` (Opcional): Para paginação infinita.
- `limit` (Opcional): Máximo de 50.

### Comportamento
Busca apenas os comentários "raiz" (`parent_id is null`) que não foram deletados (`deleted_at is null`), incluindo a contagem de likes.

---

## 2. Criar Comentário ou Resposta
- **Método:** `POST`
- **Endpoint:** `/api/comments`

### Body (JSON)
```json
{
  "postId": "uuid",
  "content": "Texto do comentário",
  "parentId": "uuid_opcional" 
}
```

### Comportamento
Verifica se não excede 1000 caracteres. Se `parentId` for enviado (uma resposta), a API valida no banco se o comentário pai existe e não foi deletado antes de inserir o filho.

---

## 3. Deletar Comentário (Soft-Delete)
- **Método:** `DELETE`
- **Endpoint:** `/api/comments?id={commentId}`

### Comportamento
**Não apaga o registro do banco**. Apenas preenche o campo `deleted_at` com o timestamp atual. Apenas o autor do comentário (verificado via JWT `user.id`) pode executar esta ação.

---

## 4. Like / Unlike em Comentário
- **Método:** `PATCH`
- **Endpoint:** `/api/comments`

### Body (JSON)
```json
{
  "commentId": "uuid",
  "action": "like" // ou "unlike"
}
```

### Comportamento
Insere ou deleta um registro na tabela `comment_likes`.

---
*Voltar para: [[00_API_Index]]*