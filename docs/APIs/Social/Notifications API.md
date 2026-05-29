# Notifications API (`/api/notifications/unread-count`)

API unificada para contagem de itens não lidos, projetada para otimizar o componente de navegação global e reduzir o tráfego de rede.

## Segurança e Performance
- 🔒 **Protegida:** Sim (JWT).
- 🚀 **Performance:** Substitui múltiplas chamadas pesadas por uma única consulta leve.
- ⚡ **Orquestração:** Combina dados de Chat (via RPC) e Atividade (Social) em um único payload JSON.

---

## 1. Obter Contagem Unificada
- **Método:** `GET`
- **Endpoint:** `/api/notifications/unread-count`

### Resposta (200 OK)
```json
{
  "chat": 5,          // Total de mensagens não lidas em todas as conversas
  "activity": 12,     // Total de novos likes, comentários e seguidores
  "timestamp": "ISO-8601"
}
```

### Comportamento
1. **Chat:** Recupera a lista de participações do usuário e executa a RPC `get_chat_unread_counts`.
2. **Atividade:** Conta interações em posts do usuário e novos seguidores.
3. **Consumo:** Utilizada pelo componente `Navigation.tsx` com polling reduzido (30s) e revalidação via Realtime.

---
*Voltar para: [[00_API_Index]]*
