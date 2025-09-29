-- Ensure interests table exists for tracking producer-script relationships
create table if not exists public.interests (
  producer_id uuid not null references public.users(id) on delete cascade,
  script_id uuid not null references public.scripts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (producer_id, script_id)
);

create index if not exists idx_interests_script_id on public.interests (script_id);

alter table public.interests enable row level security;

create policy if not exists "Producers can view their interests"
  on public.interests
  for select
  using (producer_id = auth.uid());

create policy if not exists "Producers can insert their interests"
  on public.interests
  for insert
  with check (producer_id = auth.uid());

create policy if not exists "Producers can update their interests"
  on public.interests
  for update
  using (producer_id = auth.uid())
  with check (producer_id = auth.uid());

-- Notification queue placeholder table for async processing
create table if not exists public.notification_queue (
  id bigserial primary key,
  recipient_id uuid not null references public.users(id) on delete cascade,
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.notification_queue enable row level security;

create policy if not exists "System actors manage notification queue"
  on public.notification_queue
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- RPC to enqueue notifications via the queue table
create or replace function public.enqueue_notification(
  recipient_id uuid,
  template text,
  payload jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_queue (recipient_id, template, payload)
  values (
    enqueue_notification.recipient_id,
    enqueue_notification.template,
    coalesce(enqueue_notification.payload, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.enqueue_notification(uuid, text, jsonb) to authenticated;
grant execute on function public.enqueue_notification(uuid, text, jsonb) to service_role;

grant select, insert, update, delete on public.notification_queue to service_role;
grant usage, select on sequence public.notification_queue_id_seq to service_role;

-- RPC for producers to mark interest in scripts with idempotent insert behaviour
create or replace function public.rpc_mark_interest(script_id uuid)
returns public.interests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_producer uuid;
  v_interest public.interests%rowtype;
begin
  v_producer := auth.uid();

  if v_producer is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  insert into public.interests (producer_id, script_id)
  values (v_producer, rpc_mark_interest.script_id)
  on conflict (producer_id, script_id) do nothing;

  select *
  into v_interest
  from public.interests
  where producer_id = v_producer
    and script_id = rpc_mark_interest.script_id;

  return v_interest;
end;
$$;

grant execute on function public.rpc_mark_interest(uuid) to authenticated;
grant execute on function public.rpc_mark_interest(uuid) to service_role;
