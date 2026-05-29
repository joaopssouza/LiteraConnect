# Profile API (`/api/profile`)

Responsável pela atualização dos dados básicos e identificadores únicos de um usuário. Interage com a tabela `users` no **Supabase**.

## Segurança
- 🔒 **Protegida:** Sim (Requer Autenticação JWT válida).
- 🛡️ **Sanitização:** O campo `@handle` é rigorosamente higienizado no servidor (tudo em minúsculo, removendo espaços e caracteres especiais) para garantir URLs amigáveis.

---

## 1. Atualizar Perfil (Nome, Bio, Handle)
- **Método:** `PATCH`
- **Endpoint:** `/api/profile`

### Body (JSON)
```json
{
  "name": "Nome Completo",
  "handle": "meu_handle_unico",
  "bio": "Minha biografia curta (Max 220 char)"
}
```

### Comportamento
1. Higieniza os inputs (ex: `Meu Handle!` vira `meu_handle`).
2. Verifica se o `handle` possui no mínimo 3 caracteres.
3. Verifica se a `bio` não excede 220 caracteres.
4. **Verificação de Conflito:** Consulta o banco para garantir que nenhum outro usuário já possui esse `handle`.
5. Atualiza a tabela `users`.

### Respostas
- `200 OK`: `{"user": { ...dados_atualizados }}`
- `400 Bad Request`: Falha na validação de tamanho (Nome ausente, Handle curto, Bio longa).
- `409 Conflict`: `{"error": "Esse @handle já está em uso."}`

---

## 2. Atualizar Avatar (Interno)
*(Nota: O LiteraConnect possui uma rota dedicada `/api/avatar` na árvore, mas esta rota original também aceita `PUT` para atualização pontual do banco de dados).*

- **Método:** `PUT`
- **Endpoint:** `/api/profile`

### Body (JSON)
```json
{
  "avatar_url": "https://res.cloudinary.com/..."
}
```

### Comportamento
- Atualiza a coluna `avatar_url` do usuário logado. Não faz upload (isso deve ser feito antes no client ou na rota de Avatar específica).

### Respostas
- `200 OK`: `{"user": {"id": "...", "avatar_url": "..."}}`
- `400 Bad Request`: `avatar_url` ausente ou formato inválido.

---
*Voltar para: [[00_API_Index]]*