# Messages API (`/api/chat/messages`)

Gerencia o histórico de mensagens dentro de uma conversa específica e o envio de novas mensagens.

## Segurança
- 🔒 **Protegida:** Sim (JWT obrigatório).
- 🛡️ **Controle de Acesso (ACL):** Todas as rotas (GET e POST) verificam primeiro na tabela `conversation_participants` se o `user.id` extraído do JWT realmente faz parte do `conversationId` solicitado. Se não, retorna `403 Forbidden`.

---

## 1. Carregar Histórico de Mensagens
- **Método:** `GET`
- **Endpoint:** `/api/chat/messages?conversationId={uuid}`

### Query Params
- `conversationId`: Obrigatório.
- `cursor`: Para paginação infinita para cima.
- `limit`: Máximo 100 mensagens por vez.

### Comportamento
Retorna o array de mensagens e informa quando foi a última vez que o usuário logado e o destinatário leram as mensagens (`my_last_read_at` e `other_last_read_at`), útil para os tiques de "lido".

---

## 2. Enviar Nova Mensagem
- **Método:** `POST`
- **Endpoint:** `/api/chat/messages`

### Body (JSON)
```json
{
  "conversationId": "uuid",
  "content": "Texto da mensagem",
  "attachmentUrl": "URL do cloudinary (opcional)"
}
```

### Comportamento
1. Valida tamanho máximo de 4000 caracteres.
2. Insere a mensagem na tabela `messages`.
3. Atualiza automaticamente o `last_read_at` do *remetente* (pois se ele enviou, ele já leu).
4. Invalida a lista de conversas em cache para todos os participantes (para o preview da conversa subir para o topo na UI).

---
*Voltar para: [[00_API_Index]]*