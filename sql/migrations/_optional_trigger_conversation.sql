
-- Optional migration: manually apply if you want to automatically create a
-- conversation (and participants, when supported) whenever an application's
-- status transitions to "accepted".

create or replace function public.ensure_conversation_on_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conversation_id uuid;
begin
  if new.status = 'accepted' then
    if tg_op <> 'INSERT' and old.status is not distinct from new.status then
      return new;
    end if;

    select id into conversation_id
    from public.conversations
    where application_id = new.id;

    if conversation_id is null then
      insert into public.conversations (application_id)
      values (new.id)
      returning id into conversation_id;
    end if;

    if conversation_id is not null and exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'conversation_participants'
    ) then
      if new.writer_id is not null then
        insert into public.conversation_participants (conversation_id, user_id, role)
        values (conversation_id, new.writer_id, 'writer')
        on conflict (conversation_id, user_id) do nothing;
      elsif new.user_id is not null then
        insert into public.conversation_participants (conversation_id, user_id, role)
        values (conversation_id, new.user_id, 'writer')
        on conflict (conversation_id, user_id) do nothing;
      end if;

      if new.producer_id is not null then
        insert into public.conversation_participants (conversation_id, user_id, role)
        values (conversation_id, new.producer_id, 'producer')
        on conflict (conversation_id, user_id) do nothing;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists conversation_on_accept on public.applications;

create trigger conversation_on_accept
after insert or update on public.applications
for each row
when (new.status = 'accepted')
execute function public.ensure_conversation_on_accept();
