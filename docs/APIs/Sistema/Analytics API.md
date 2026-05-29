# Analytics API (`/api/analytics/posts`)

Alimenta o Dashboard do Autor com dados de engajamento dos seus posts, unindo informações relacionais e NoSQL.

## Segurança
- 🔒 **Protegida:** Sim (JWT obrigatório). Garante que o autor só possa ver as métricas dos seus próprios posts.

---

## 1. Carregar Dashboard
- **Método:** `GET`
- **Endpoint:** `/api/analytics/posts`

### Comportamento (Híbrido)
Essa API consulta os 3 bancos de dados de forma orquestrada:
1. **Supabase (Metadados):** Busca os últimos 50 posts do autor e a contagem de likes e comentários agregados.
2. **Redis (Tempo Real):** Para cada post, busca o contador "quente" de visualizações (que ainda não foi salvo no Supabase). Se existir no Redis, usa ele; senão usa o valor congelado do Supabase.
3. **MongoDB (Série Temporal):** Consulta a coleção `activity_logs` e faz um `$aggregate` aglomerando eventos (likes, views) do autor nos últimos 30 dias, retornando os totais por dia (`timeSeries`) para a plotagem de gráficos na UI.

### Respostas
- `200 OK`:
```json
{
  "totals": { "views": 100, "likes": 20, "comments": 5, "posts": 2 },
  "posts": [{ "id": "...", "views": 50, "engagement_rate": 10 }],
  "timeSeries": [{ "day": "2026-03-31", "type": "view", "count": 10 }]
}
```

---
*Voltar para: [[00_API_Index]]*