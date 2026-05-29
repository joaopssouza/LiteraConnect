# Presence API (`/api/chat/presence`)

Uma API leve para atualizar o status de "Última vez visto" (Last Seen) do usuário, crucial para indicar na UI do chat quem está online recentemente.

## 1. Atualizar Presença (Heartbeat)
- **Método:** `POST`
- **Endpoint:** `/api/chat/presence`

### Body (JSON)
```json
{
  "userId": "uuid"
}
```

### Comportamento
Simplesmente atualiza a coluna `last_seen_at` do usuário logado na tabela `users` do Supabase com o timestamp ISO atual. Chamada em intervalos regulares pelo frontend enquanto o app está aberto.

---
*Voltar para: [[00_API_Index]]*