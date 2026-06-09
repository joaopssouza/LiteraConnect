-- Execute este script no SQL Editor do seu painel do Supabase

-- 1. Habilitar a extensão UUID (se já não estiver habilitada)
create extension if not exists "uuid-ossp";

-- 2. Criar a tabela de Usuários (Users)
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  name text not null,
  handle text unique not null,
  avatar_url text,
  bio text,
  birth_date date,
  gender text,
  consent_terms_accepted_at timestamp with time zone,
  consent_privacy_accepted_at timestamp with time zone,
  consent_age_declared_at timestamp with time zone,
  consent_marketing_accepted_at timestamp with time zone,
  consent_ip text,
  consent_version text default '1.0',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Criar a tabela de Resenhas/Posts (Posts)
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  book_title text,
  book_cover_url text,
  media jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Criar a tabela de Curtidas (Likes)
create table public.likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id) -- Um usuário só pode curtir um post uma vez
);

-- 5. Criar a tabela de Comentários (Comments)
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5.1 Criar a tabela de Curtidas em Comentários (Comment Likes)
create table public.comment_likes (
  id uuid default gen_random_uuid() primary key,
  comment_id uuid references public.comments(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(comment_id, user_id)
);

-- 6. Criar a tabela de Seguidores (Follows)
create table public.follows (
  follower_id uuid references public.users(id) on delete cascade not null,
  following_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id)
);

-- 7. Configurar Segurança em Nível de Linha (Row Level Security - RLS)
alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.follows enable row level security;

-- Políticas para Users
create policy "Perfis são públicos" on public.users for select using (true);
create policy "Usuários podem inserir o próprio perfil" on public.users for insert with check (auth.uid() = id);
create policy "Usuários podem atualizar o próprio perfil" on public.users for update using (auth.uid() = id);

-- Políticas para Posts
create policy "Posts são públicos" on public.posts for select using (true);
create policy "Usuários autenticados podem criar posts" on public.posts for insert with check (auth.role() = 'authenticated');
create policy "Usuários podem atualizar os próprios posts" on public.posts for update using (auth.uid() = user_id);
create policy "Usuários podem deletar os próprios posts" on public.posts for delete using (auth.uid() = user_id);

-- Políticas para Likes
create policy "Likes são públicos" on public.likes for select using (true);
create policy "Usuários autenticados podem curtir" on public.likes for insert with check (auth.role() = 'authenticated');
create policy "Usuários podem remover a própria curtida" on public.likes for delete using (auth.uid() = user_id);

-- Políticas para Comments
create policy "Comentários são públicos" on public.comments for select using (true);
create policy "Usuários autenticados podem comentar" on public.comments for insert with check (auth.role() = 'authenticated');
create policy "Usuários podem atualizar os próprios comentários" on public.comments for update using (auth.uid() = user_id);
create policy "Usuários podem deletar os próprios comentários" on public.comments for delete using (auth.uid() = user_id);

-- Políticas para Comment Likes
create policy "Curtidas em comentários são públicas" on public.comment_likes for select using (true);
create policy "Usuários autenticados podem curtir comentários" on public.comment_likes for insert with check (auth.uid() = user_id);
create policy "Usuários podem remover a própria curtida em comentário" on public.comment_likes for delete using (auth.uid() = user_id);

-- Políticas para Follows
create policy "Seguidores são públicos" on public.follows for select using (true);
create policy "Usuários autenticados podem seguir" on public.follows for insert with check (auth.role() = 'authenticated');
create policy "Usuários podem deixar de seguir" on public.follows for delete using (auth.uid() = follower_id);

-- 8. Trigger para criar perfil automaticamente no cadastro (Opcional, mas recomendado)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_handle text;
begin
  user_handle := coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1));
  
  insert into public.users (id, name, handle, avatar_url, birth_date, gender, consent_terms_accepted_at, consent_privacy_accepted_at, consent_age_declared_at, consent_marketing_accepted_at, consent_ip, consent_version)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    user_handle,
    coalesce(new.raw_user_meta_data->>'avatar_url', '/api/avatar?seed=' || user_handle || '&size=150'),
    (new.raw_user_meta_data->>'birth_date')::date,
    new.raw_user_meta_data->>'gender',
    (new.raw_user_meta_data->>'consent_terms_accepted_at')::timestamp with time zone,
    (new.raw_user_meta_data->>'consent_privacy_accepted_at')::timestamp with time zone,
    (new.raw_user_meta_data->>'consent_age_declared_at')::timestamp with time zone,
    (new.raw_user_meta_data->>'consent_marketing_accepted_at')::timestamp with time zone,
    new.raw_user_meta_data->>'consent_ip',
    coalesce(new.raw_user_meta_data->>'consent_version', '1.0')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 9. Habilitar Realtime para tabelas de chat e atividade
-- (Execute estes comandos no SQL Editor do Supabase se o Realtime não estiver disparando)
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_participants;
alter publication supabase_realtime add table public.follows;
alter publication supabase_realtime add table public.likes;
alter publication supabase_realtime add table public.comments;

-- 10. RPC para unread_count por conversa no chat
create or replace function public.get_chat_unread_counts(
  p_user_id uuid,
  p_conversation_ids uuid[]
)
returns table (conversation_id uuid, unread_count bigint)
language sql
security definer
set search_path = public
as $$
  with base as (
    select cp.conversation_id, cp.last_read_at
    from public.conversation_participants cp
    where cp.user_id = p_user_id
      and cp.conversation_id = any(p_conversation_ids)
  )
  select
    b.conversation_id,
    count(m.id) as unread_count
  from base b
  left join public.messages m
    on m.conversation_id = b.conversation_id
   and m.user_id <> p_user_id
   and (b.last_read_at is null or m.created_at > b.last_read_at)
  group by b.conversation_id;
$$;

create or replace function public.get_chat_unread_counts(
  p_conversation_ids uuid[],
  p_user_id uuid
)
returns table (conversation_id uuid, unread_count bigint)
language sql
security definer
set search_path = public
as $$
  with base as (
    select cp.conversation_id, cp.last_read_at
    from public.conversation_participants cp
    where cp.user_id = p_user_id
      and cp.conversation_id = any(p_conversation_ids)
  )
  select
    b.conversation_id,
    count(m.id) as unread_count
  from base b
  left join public.messages m
    on m.conversation_id = b.conversation_id
   and m.user_id <> p_user_id
   and (b.last_read_at is null or m.created_at > b.last_read_at)
  group by b.conversation_id;
$$;

grant execute on function public.get_chat_unread_counts(uuid, uuid[]) to anon, authenticated, service_role;
grant execute on function public.get_chat_unread_counts(uuid[], uuid) to anon, authenticated, service_role;

-- 11. Coluna de privacidade para o perfil
alter table public.users add column if not exists is_private boolean default false;

-- 12. Tabela de Bloqueio de Usuários (User Blocks)
create table public.user_blocks (
  blocker_id uuid references public.users(id) on delete cascade not null,
  blocked_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (blocker_id, blocked_id)
);

alter table public.user_blocks enable row level security;
create policy "Users can view blocks they created" on public.user_blocks for select using (auth.uid() = blocker_id);
create policy "Users can block others" on public.user_blocks for insert with check (auth.uid() = blocker_id);
create policy "Users can unblock others" on public.user_blocks for delete using (auth.uid() = blocker_id);
-- 13. Tabela de Posts Ocultos (Hidden Posts)
create table if not exists public.hidden_posts (
  user_id uuid references public.users(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, post_id)
);

alter table public.hidden_posts enable row level security;
drop policy if exists "Users can view their hidden posts" on public.hidden_posts;
drop policy if exists "Users can hide posts" on public.hidden_posts;
drop policy if exists "Users can unhide posts" on public.hidden_posts;
create policy "Users can view their hidden posts" on public.hidden_posts for select using (auth.uid() = user_id);
create policy "Users can hide posts" on public.hidden_posts for insert with check (auth.uid() = user_id);
create policy "Users can unhide posts" on public.hidden_posts for delete using (auth.uid() = user_id);

-- 14. Tabela de Posts Denunciados (Reported Posts)
create table if not exists public.reported_posts (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references public.users(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  reason text,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(reporter_id, post_id)
);

alter table public.reported_posts enable row level security;
drop policy if exists "Users can view their own reports" on public.reported_posts;
drop policy if exists "Users can report posts" on public.reported_posts;
create policy "Users can view their own reports" on public.reported_posts for select using (auth.uid() = reporter_id);
create policy "Users can report posts" on public.reported_posts for insert with check (auth.uid() = reporter_id);

