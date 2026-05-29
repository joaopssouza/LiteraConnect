-- Sprint 6: comentarios aninhados, likes em comentarios e soft-delete
-- Execute no SQL Editor do Supabase

alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
alter table public.comments add column if not exists updated_at timestamptz;
alter table public.comments add column if not exists deleted_at timestamptz;

create index if not exists idx_comments_post_parent_created_at on public.comments(post_id, parent_id, created_at);
create index if not exists idx_comments_deleted_at on public.comments(deleted_at);

create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references public.comments(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(comment_id, user_id)
);

create index if not exists idx_comment_likes_comment_id on public.comment_likes(comment_id);
create index if not exists idx_comment_likes_user_id on public.comment_likes(user_id);

alter table public.comment_likes enable row level security;

drop policy if exists "Curtidas em comentários são públicas" on public.comment_likes;
drop policy if exists "Usuários autenticados podem curtir comentários" on public.comment_likes;
drop policy if exists "Usuários podem remover a própria curtida em comentário" on public.comment_likes;

create policy "Curtidas em comentários são públicas"
on public.comment_likes for select
using (true);

create policy "Usuários autenticados podem curtir comentários"
on public.comment_likes for insert
with check (auth.uid() = user_id);

create policy "Usuários podem remover a própria curtida em comentário"
on public.comment_likes for delete
using (auth.uid() = user_id);
