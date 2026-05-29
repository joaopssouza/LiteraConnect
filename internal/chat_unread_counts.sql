-- Chat: unread_count exato por conversa para um usuario
-- Execute no SQL Editor do Supabase

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
    select
      cp.conversation_id,
      cp.last_read_at
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

-- Compatibilidade: alguns clientes podem resolver assinatura pela ordem invertida.
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
    select
      cp.conversation_id,
      cp.last_read_at
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

grant execute on function public.get_chat_unread_counts(uuid[], uuid) to anon, authenticated, service_role;
