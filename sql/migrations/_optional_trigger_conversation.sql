-- Optional migration: auto-create conversations when applications are accepted.
-- Apply manually if you want to automatically create a conversation (and
-- participants, when supported) when an application's status transitions to
-- "accepted".

create or replace function public.ensure_conversation_for_accepted_application()
returns trigger as $$
declare
  conversation_id uuid;
begin
  if new.status = 'accepted' and (old.status is distinct from new.status) then
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
        execute $$
          insert into public.conversation_participants (conversation_id, user_id, role)
          values ($1, $2, 'writer')
          on conflict (conversation_id, user_id) do nothing
        $$ using conversation_id, new.writer_id;
      elsif new.user_id is not null then
        execute $$
          insert into public.conversation_participants (conversation_id, user_id, role)
          values ($1, $2, 'writer')
          on conflict (conversation_id, user_id) do nothing
        $$ using conversation_id, new.user_id;
      end if;

      if new.owner_id is not null then
        execute $$
          insert into public.conversation_participants (conversation_id, user_id, role)
          values ($1, $2, 'producer')
          on conflict (conversation_id, user_id) do nothing
        $$ using conversation_id, new.owner_id;
      elsif new.producer_id is not null then
        execute $$
          insert into public.conversation_participants (conversation_id, user_id, role)
          values ($1, $2, 'producer')
          on conflict (conversation_id, user_id) do nothing
        $$ using conversation_id, new.producer_id;
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists create_conversation_on_application_accept on public.applications;
create trigger create_conversation_on_application_accept
after update on public.applications
for each row
when (old.status is distinct from new.status and new.status = 'accepted')
execute function public.ensure_conversation_for_accepted_application();
