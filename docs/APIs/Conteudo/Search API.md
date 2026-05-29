# Search API (`/api/search`)

Responsável pela busca global de conteúdo na plataforma.

## Segurança e Performance
- 🔒 **Protegida:** Sim (JWT obrigatório).
- 🛡️ **Sanitização de Input:** O termo de busca é truncado em 100 caracteres e todos os caracteres de wildcard do SQL (como `%`, `_` e `\`) são escapados para prevenir injeção ou falhas de performance (`ILIKE` abusivo).
- 🚀 **Cache:** Utiliza TTL altíssimo (20 segundos no Server Cache) para a combinação exata de `termo + periodo + ordenação`, economizando muito processamento do banco.

---

## 1. Buscar Posts e Trending
- **Método:** `GET`
- **Endpoint:** `/api/search`

### Query Params
- `q`: Termo de busca.
- `period`: Filtro de data (`7d`, `30d`, `90d`).
- `sort`: `recent` (Padrão) ou `popular` (Ordena por contagem de likes).
- `limit`: Máximo de itens (Padrão 12).

### Comportamento
Realiza **duas consultas em paralelo**:
1. **Busca Principal:** Pesquisa no Supabase onde o status é `published` e `visibility = public`. Se `q` for fornecido, faz `ilike` no `content` ou `book_title`.
2. **Carousel Trending:** Independentemente do termo buscado, traz os top 10 posts mais curtidos nos últimos 14 dias para alimentar a UI exploratória lateral/topo.

### Respostas
- `200 OK`:
```json
{
  "results": [{...}],
  "trending": [{...}]
}
```

---
*Voltar para: [[00_API_Index]]*