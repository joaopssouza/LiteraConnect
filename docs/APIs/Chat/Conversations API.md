# Conversations API (`/api/chat/conversations`)

Gerencia a lista de conversas do usuário autenticado e rastreia o status de "não lido".

## Segurança e Performance
- 🔒 **Protegida:** Sim (JWT).
- 🚀 **Server Cache:** Cache com TTL de 5 segundos.
- ⚡ **Fim do N+1:** A API foi refatorada para buscar as últimas mensagens de TODAS as conversas em um único SELECT, mapeando-as em memória para garantir tempos de resposta abaixo de 200ms, mesmo com muitas conversas.
⚡ **RPC do Postgres:** Utiliza a RPC `get_chat_unread_counts` para badges precisas.

---

## 1. Listar Conversas
- **Método:** `GET`
- **Endpoint:** `/api/chat/conversations?userId={uuid}`

### Comportamento
1. Verifica o cache no Redis.
2. Busca as conversas na tabela `conversation_participants`.
3. Executa a RPC `get_chat_unread_counts` para obter badges precisos.
4. Busca (em lotes concorrentes) apenas a **última mensagem** de cada conversa para exibir no preview da UI.

---

## 2. Marcar Conversa como Lida
- **Método:** `PATCH`
- **Endpoint:** `/api/chat/conversations`

### Body (JSON)
```json
{
  "userId": "uuid_do_logado",
  "conversationId": "uuid_da_conversa"
}
```

### Comportamento
Valida se o usuário é participante da conversa e, em caso positivo, atualiza a coluna `last_read_at` na tabela `conversation_participants` para o timestamp atual, apagando a badge de notificação. Também invalida o cache da lista de conversas no servidor.

---
*Voltar para: [[00_API_Index]]*