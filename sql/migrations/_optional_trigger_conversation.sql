-- Optional trigger to automatically create a conversation once an application is accepted.

create or replace function public.ensure_conversation_on_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' then
    insert into public.conversations (application_id)
    select new.id
    where not exists (
      select 1
      from public.conversations c
      where c.application_id = new.id
    );
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
