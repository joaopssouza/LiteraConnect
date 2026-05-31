# Plano de Melhorias de Performance e Arquitetura v3 - LiteraConnect

Este plano foi refinado após a análise do `EXPLAIN ANALYZE` no banco de dados, que revelou que o gargalo de 11.5s no Feed NÃO está no SQL (que leva < 1ms), mas sim na camada de aplicação ou rede.

## 🔍 1. Diagnóstico e Resposta Rápida (Urgente)

### 1.1. Instrumentação de Logs
- **Ação:** Adicionar `console.time` e `console.timeEnd` em `/api/feed` e `/api/chat/conversations`.
- **Objetivo:** Isolar se o tempo é gasto na conexão com Redis, no Auth do Supabase, ou no processamento de dados pós-query.

### 1.2. Otimização do Registro de Views (25 chamadas/minuto)
- **Problema:** O frontend dispara um POST para cada post que entra no viewport. Se o Redis estiver lento, isso gera um "choke point".
- **Solução:** 
    - **Backend:** Alterar `POST /api/posts/views` para aceitar um array de `postIds`.
    - **Frontend:** Implementar um *buffer* que coleciona IDs vistos e envia em um único lote a cada 5 segundos (ou quando atingir 10 IDs).

### 1.3. Investigação da Latência do Redis
- **Problema:** O Redis é remoto (South America East). Latência de rede pode estar causando timeouts silenciosos que atrasam a resposta total.
- **Ação:** Implementar um timeout rígido (ex: 500ms) na conexão com o Redis no `lib/redis.ts`. Se falhar, ignorar o cache imediatamente.

## 🔴 2. Otimização de APIs (Backend)

### 2.1. Refatoração da API de Chat (`/api/chat/conversations`)
- **Ação:** Eliminar o N+1 manual. Buscar as últimas mensagens de todas as conversas em um único SELECT `IN (...)`.
- **Cache:** Revisar se o TTL do cache de chat está adequado para não servir dados obsoletos.

### 2.2. API Unificada de Notificações
- **Objetivo:** Criar `/api/notifications/unread-count` para que o `Navigation.tsx` faça apenas 1 chamada leve ao invés de 2+ pesadas.

## 🟡 3. Banco de Dados e Infraestrutura

### 3.1. Índices (Manter do Plano v2)
Embora a query de feed esteja rápida com poucos dados, os índices são vitais para escalabilidade:
```sql
CREATE INDEX IF NOT EXISTS idx_posts_feed_v3 ON public.posts(status, visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_convo_created ON public.messages(conversation_id, created_at DESC);
```

## 🟢 4. Frontend e Experiência do Usuário

### 4.1. Redução de Bundle e Compilação
- **Turbopack:** Ativar `next dev --turbo` (Essencial para produtividade).
- **Lazy Loading:** `next/dynamic` para o editor de texto.
- **Bundle Analyzer:** Rodar para identificar se bibliotecas como `lucide-react` ou `motion` estão sendo importadas por inteiro desnecessariamente.

### 4.2. Supabase Realtime
- **Otimização:** No `Navigation.tsx`, substituir o polling fixo por um canal Realtime único que gerencia o estado de "novas notificações".

---

## Cronograma de Execução Priorizado

1. **[Diagnóstico]** Instrumentar logs e verificar latência do Redis.
2. **[Performance]** Implementar Batching de Views (Frontend + Backend).
3. **[Arquitetura]** Criar API Unificada de Contagem e atualizar Navigation.
4. **[Otimização]** Refatorar Chat (N+1) e Aplicar Índices SQL.
5. **[Bundle]** Ativar Turbopack e Lazy Loading.
