# Activity API (`/api/activity`)

Responsável por agregar todas as notificações e eventos relevantes (likes, comentários, novos seguidores) para o usuário autenticado.

## Segurança e Performance
- 🔒 **Protegida:** Sim (JWT obrigatório).
- 🚀 **Server Cache:** Utiliza cache com TTL de 7 segundos (`getOrSetServerCache`) para evitar sobrecarregar o Supabase com consultas agregadas pesadas toda vez que o usuário abre o menu de notificações.
- 💾 **Log de Auditoria (Fire-and-forget):** Salva assincronamente um snapshot das atividades na coleção `activity_logs` do **MongoDB** para futuros algoritmos de recomendação, sem atrasar a resposta da API.

---

## 1. Carregar Notificações
- **Método:** `GET`
- **Endpoint:** `/api/activity`

### Comportamento
1. Verifica o Cache.
2. Consulta o **Supabase** buscando:
   - Os posts do usuário logado.
   - Likes recebidos nesses posts (excluindo os do próprio autor).
   - Comentários recebidos nesses posts.
   - Novos seguidores.
3. Mescla todos os eventos em um único array (`activities`), ordenando do mais recente para o mais antigo.
4. (Background) Grava um log no MongoDB.

### Respostas
- `200 OK`: Retorna o array `activities` com no máximo 50 itens.

---

## 2. Marcar como Lido (Mark as Read)
- **Método:** `PATCH`
- **Endpoint:** `/api/activity`

### Comportamento
- Atualmente projetado para **invalidar o cache** (`invalidateServerCache`) do usuário, forçando um "rebuild" limpo das notificações no próximo GET.

---
*Voltar para: [[00_API_Index]]*