/**
 * Buffer de visualizações para evitar excesso de requisições (debounce/batching)
 */
let viewBuffer: string[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

const FLUSH_INTERVAL_MS = 5000; // Envia a cada 5 segundos
const MAX_BUFFER_SIZE = 20;    // Ou se atingir 20 posts

async function flushViews() {
  if (viewBuffer.length === 0) return;

  const postIds = [...viewBuffer];
  viewBuffer = [];
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  try {
    await fetch('/api/posts/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postIds }),
    });
  } catch (err) {
    console.warn('[ViewBuffer] Erro ao flush:', err);
  }
}

export function queueView(postId: string) {
  if (!postId || viewBuffer.includes(postId)) return;

  viewBuffer.push(postId);

  if (viewBuffer.length >= MAX_BUFFER_SIZE) {
    flushViews();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(flushViews, FLUSH_INTERVAL_MS);
  }
}
