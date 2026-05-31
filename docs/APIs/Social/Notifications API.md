# Notifications API (`/api/notifications/unread-count`)

API unificada para contagem de itens não lidos, projetada para otimizar o componente de navegação global e reduzir o tráfego de rede.

## Segurança e Performance
- 🔒 **Protegida:** Sim (JWT).
- 🚀 **Performance:** Substitui múltiplas chamadas pesadas por uma única consulta leve.
- ⚡ **Orquestração:** Combina dados de Mensagens (via RPC) e Atividade (Social) em um único payload JSON.

---

## 1. Obter Contagem Unificada
- **Método:** `GET`
- **Endpoint:** `/api/notifications/unread-count`

### Resposta (200 OK)
```json
{
  "total": 17,        // Soma de chat + activity para a badge global de "Mensagens"
  "chat": 5,          // Mensagens não lidas
  "activity": 12,     // Novos likes, comentários e seguidores
  "timestamp": "ISO-8601"
}
```

### Comportamento
1. **Mensagens:** Recupera a lista de participações do usuário e executa a RPC `get_chat_unread_counts`.
2. **Atividade:** Conta interações em posts do usuário e novos seguidores.
3. **Consumo:** Utilizada pelo componente `Navigation.tsx` para exibir a badge unificada no ícone de **Mensagens**. A aba independente de "Atividades" foi removida da navegação global, passando a ser acessível via lista de conversas.

---
*Voltar para: [[00_API_Index]]*
