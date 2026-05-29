-- Índices para otimização de performance - LiteraConnect
-- Execute no SQL Editor do Supabase

-- 1. Performance de Feed e Perfil
-- Otimiza a busca de posts por usuário e ordenação por data
CREATE INDEX IF NOT EXISTS idx_posts_user_id_created ON public.posts(user_id, created_at DESC);
-- Otimiza o feed global com filtros de status e visibilidade
CREATE INDEX IF NOT EXISTS idx_posts_feed_v3 ON public.posts(status, visibility, created_at DESC);

-- 2. Performance de Contagens e Notificações (Atividades)
-- Otimiza a contagem de curtidas por post
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
-- Otimiza a contagem de comentários por post
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
-- Otimiza a busca de seguidores
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- 3. Performance de Chat
-- Otimiza a busca de mensagens e recuperação da última mensagem por conversa
CREATE INDEX IF NOT EXISTS idx_messages_convo_created ON public.messages(conversation_id, created_at DESC);
-- Otimiza a busca de participantes por usuário
CREATE INDEX IF NOT EXISTS idx_conv_part_user_id ON public.conversation_participants(user_id);
