# Avatar API (`/api/avatar`)

Diferente de rotas que fazem upload de imagem, esta API é um **Gerador Dinâmico** de avatares SVG baseados nas iniciais do usuário. Funciona como um fallback rápido e leve (sem consultar banco) para quando o usuário não possui uma foto no Cloudinary.

## 1. Gerar SVG Dinâmico
- **Método:** `GET`
- **Endpoint:** `/api/avatar`

### Query Params
- `seed`: String (ex: nome ou handle) para gerar uma cor de fundo determinística e extrair a primeira letra.
- `size`: Tamanho em pixels (ex: 100). Limitado entre 24 e 512.

### Comportamento
1. Extrai a primeira letra alfanumérica do `seed` (ex: "Maria" -> "M").
2. Calcula uma cor de fundo estática baseada no hash do `seed`.
3. Retorna a imagem SVG como `Content-Type: image/svg+xml`.

### Performance
A API instrui o navegador e CDNs a fazerem **Cache Publico agressivo**:
`Cache-Control: public, max-age=86400, stale-while-revalidate=604800` (1 dia no navegador, 1 semana em CDN).

---
*Voltar para: [[00_API_Index]]*