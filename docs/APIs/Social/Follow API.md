# Follow API (`/api/follow`)

Responsável por gerenciar o grafo social da plataforma (quem segue quem). Interage diretamente com a tabela `follows` do **Supabase (PostgreSQL)**.

## Segurança
- 🔒 **Protegida:** Sim (Requer Autenticação JWT válida).
- 🛡️ **Regra de Negócio:** O usuário logado NUNCA pode seguir a si mesmo (`targetUserId === user.id` é bloqueado).

---

## 1. Seguir Usuário
- **Método:** `POST`
- **Endpoint:** `/api/follow`

### Body (JSON)
```json
{
  "targetUserId": "uuid-do-usuario-a-ser-seguido"
}
```

### Comportamento
- Insere um registro na tabela `follows` (follower_id = logado, following_id = target).
- Se já estiver seguindo (Erro Postgres `23505` de chave duplicada), a API ignora o erro e retorna sucesso silenciosamente.

### Respostas
- `201 Created`: `{"following": true}`
- `400 Bad Request`: Faltando `targetUserId` ou tentando seguir a si mesmo.

---

## 2. Deixar de Seguir (Unfollow)
- **Método:** `DELETE`
- **Endpoint:** `/api/follow?targetUserId={uuid}`

### Query Params
- `targetUserId`: UUID do usuário que deixará de ser seguido.

### Comportamento
- Deleta o registro específico da tabela `follows`.

### Respostas
- `200 OK`: `{"following": false}`
- `400 Bad Request`: Faltando `targetUserId` na query string.

---
*Voltar para: [[00_API_Index]]*