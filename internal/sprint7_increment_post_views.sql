-- Função para incrementar views, ignorando visualização do próprio autor
create or replace function public.increment_post_views(post_id uuid)
returns void as $$
declare
  v_author_id uuid;
begin
  select user_id into v_author_id from public.posts where id = post_id;
  if auth.uid() is null or v_author_id is null or auth.uid() = v_author_id then
    return;
  end if;
  update public.posts set views = coalesce(views,0) + 1 where id = post_id;
end;
$$ language plpgsql security definer;
