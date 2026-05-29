-- Atualização de dados para compatibilidade com Sprint 7
update public.posts set status = 'published' where status is null;
update public.posts set visibility = 'public' where visibility is null;
update public.posts set views = 0 where views is null;
update public.posts set shares = 0 where shares is null;
-- scheduled_at pode ficar null para posts não agendados
