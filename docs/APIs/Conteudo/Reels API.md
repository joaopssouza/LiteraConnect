# Reels API (`/api/reels`)

Responsável por alimentar o feed de vídeos curtos (estilo TikTok) da plataforma. Esta API realiza orquestração poliglota entre Supabase (Metadados) e Redis (Visualizações em tempo real).

## Segurança e Performance
- 🔒 **Protegida:** Sim (JWT obrigatório).
- 🚀 **Server Cache:** Cache com TTL de 15 segundos para a primeira página e 7 segundos para páginas subsequentes (paginação).
- ⚡ **Otimização de Vídeo:** A API retorna metadados que são processados no frontend para garantir codecs compatíveis (H.264) e bitrates otimizados via Cloudinary.

---

## 1. Carregar Feed de Reels
- **Método:** `GET`
- **Endpoint:** `/api/reels`

### Query Params (Opcionais)
- `cursor`: Timestamp `created_at` para paginação infinita (lt).
- `limit`: Quantidade de itens por lote (Padrão: 10).

### Comportamento
1. Verifica o cache no Redis para o par `userId:cursor`.
2. Consulta o **Supabase** filtrando por `post_type = 'reel'` e `visibility = 'public'`.
3. Realiza joins para obter metadados do autor, contagem de curtidas e contagem de comentários.
4. **Enriquecimento com Redis:** Busca contadores de visualizações "quentes" (`post:{id}:views`) via Pipeline (Multi) para evitar latência.
5. Retorna o array de vídeos pronto para reprodução com scroll snapping no frontend.

---
*Voltar para: [[00_API_Index]]*
