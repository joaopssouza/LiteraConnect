-- Sprint 7: Editorial - drafts, agendamento, visibilidade, analytics
-- Execute no SQL Editor do Supabase

alter table public.posts add column if not exists status text default 'published' check (status in ('draft','published'));
alter table public.posts add column if not exists scheduled_at timestamptz;
alter table public.posts add column if not exists visibility text default 'public' check (visibility in ('public','unlisted'));
alter table public.posts add column if not exists views integer default 0;
alter table public.posts add column if not exists shares integer default 0;

create index if not exists idx_posts_status on public.posts(status);
create index if not exists idx_posts_visibility on public.posts(visibility);
create index if not exists idx_posts_scheduled_at on public.posts(scheduled_at);
