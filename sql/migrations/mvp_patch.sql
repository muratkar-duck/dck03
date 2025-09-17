alter table scripts
  alter column owner_id set default auth.uid();

alter table scripts
  alter column price_cents set default 0;

create index if not exists scripts_owner_created_idx
  on scripts(owner_id, created_at);
