-- Chat schema for Supabase (1:1 conversations)
-- Run in Supabase SQL editor. Uses RLS; enable on each table after creation.

-- 1) conversations: one row per 1:1 conversation (can extend to group later)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2) conversation_participants: membership + unread counts
create table if not exists public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- 3) messages: messages in conversations
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  content text not null,
  attachment_url text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_messages_conversation_created_at on public.messages(conversation_id, created_at desc);
create index if not exists idx_conv_part_user on public.conversation_participants(user_id);

-- Presence support (last seen)
alter table public.users add column if not exists last_seen_at timestamptz;

create index if not exists idx_users_last_seen_at on public.users(last_seen_at desc);

-- RLS
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Drop old policies if they exist (idempotent)
drop policy if exists conversations_select_participant on public.conversations;
drop policy if exists conv_part_select on public.conversation_participants;
drop policy if exists conv_part_insert_self on public.conversation_participants;
drop policy if exists conv_part_delete_self on public.conversation_participants;
drop policy if exists messages_select_participant on public.messages;
drop policy if exists messages_insert_participant on public.messages;

-- Policies
-- Conversations: visible if you are a participant
create policy conversations_select_participant on public.conversations
for select using (exists (
  select 1 from public.conversation_participants cp
  where cp.conversation_id = conversations.id
    and cp.user_id = auth.uid()
));

-- conversation_participants: only members can see; only insert self; only delete self
create policy conv_part_select on public.conversation_participants
for select using (user_id = auth.uid());

create policy conv_part_insert_self on public.conversation_participants
for insert with check (user_id = auth.uid());

create policy conv_part_delete_self on public.conversation_participants
for delete using (user_id = auth.uid());

-- messages: only participants can select/insert
create policy messages_select_participant on public.messages
for select using (exists (
  select 1 from public.conversation_participants cp
  where cp.conversation_id = messages.conversation_id
    and cp.user_id = auth.uid()
));

create policy messages_insert_participant on public.messages
for insert with check (exists (
  select 1 from public.conversation_participants cp
  where cp.conversation_id = conversation_id
    and cp.user_id = auth.uid()
));

-- helper: create a 1:1 conversation between two users (replace UUIDs)
-- insert into public.conversations default values returning id;
-- insert into public.conversation_participants (conversation_id, user_id) values
--   ('<conv_id>', '<user1_uuid>'),
--   ('<conv_id>', '<user2_uuid>');

-- realtime: enable on messages table (Supabase dashboard → Realtime → messages)
