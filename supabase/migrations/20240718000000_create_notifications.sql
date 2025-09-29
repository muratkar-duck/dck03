-- Ensure interests table exists so notification triggers have a source of truth.
create table if not exists public.interests (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references auth.users(id) on delete cascade,
  script_id uuid not null references public.scripts(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint interests_unique_pair unique (producer_id, script_id)
);

-- Notifications table captures cross-role alerts for key lifecycle events.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  application_id uuid references public.applications(id) on delete cascade,
  interest_id uuid references public.interests(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_event_type_check
    check (
      event_type in (
        'producer_interest_registered',
        'application_submitted',
        'application_decision',
        'script_purchased'
      )
    )
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy notifications_select_policy
  on public.notifications
  for select
  using (user_id = auth.uid());

create policy notifications_update_policy
  on public.notifications
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Helper function to insert notifications securely from triggers.
create or replace function public.log_notification(
  p_user_id uuid,
  p_event_type text,
  p_actor_id uuid default null,
  p_application_id uuid default null,
  p_interest_id uuid default null,
  p_order_id uuid default null,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (
    user_id,
    event_type,
    actor_id,
    application_id,
    interest_id,
    order_id,
    payload
  )
  values (
    p_user_id,
    p_event_type,
    p_actor_id,
    p_application_id,
    p_interest_id,
    p_order_id,
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Ensure a conversation exists for accepted applications and enroll relevant users.
create or replace function public.ensure_conversation_with_participants(
  application_id uuid,
  acting_user_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application record;
  v_conversation_id uuid;
begin
  select
    a.id,
    a.writer_id,
    coalesce(a.producer_id, a.owner_id) as producer_id,
    a.user_id,
    a.owner_id,
    a.producer_listing_id,
    a.listing_id,
    a.request_id
  into v_application
  from public.applications a
  where a.id = application_id;

  if v_application.id is null then
    raise exception 'application % not found', application_id;
  end if;

  insert into public.conversations (application_id)
    values (application_id)
  on conflict (application_id)
    do update set application_id = excluded.application_id
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id, role)
  select distinct on (candidate_user_id)
    v_conversation_id,
    candidate_user_id,
    candidate_role
  from (
    select v_application.writer_id as candidate_user_id, 'writer'::text as candidate_role, 1 as sort_order
    union all
    select v_application.user_id, 'writer'::text, 1
    union all
    select v_application.producer_id, 'producer'::text, 2
    union all
    select v_application.owner_id, 'producer'::text, 2
    union all
    select acting_user_id,
      case
        when acting_user_id in (v_application.writer_id, v_application.user_id) then 'writer'
        else 'producer'
      end,
      case
        when acting_user_id in (v_application.writer_id, v_application.user_id) then 1
        else 2
      end
  ) candidates
  where candidate_user_id is not null
  order by candidate_user_id, sort_order
  on conflict (conversation_id, user_id) do update
    set role = case
      when conversation_participants.role = 'producer' and excluded.role = 'writer' then 'writer'
      else conversation_participants.role
    end;

  return v_conversation_id;
end;
$$;

-- Trigger when a producer records interest in a script.
create or replace function public.handle_interest_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_writer_id uuid;
  v_script_title text;
begin
  select s.owner_id, s.title into v_writer_id, v_script_title
  from public.scripts s
  where s.id = new.script_id;

  if v_writer_id is null then
    return new;
  end if;

  perform public.log_notification(
    v_writer_id,
    'producer_interest_registered',
    new.producer_id,
    null,
    new.id,
    null,
    jsonb_build_object(
      'script_id', new.script_id,
      'producer_id', new.producer_id,
      'script_title', v_script_title
    )
  );

  return new;
end;
$$;

-- Trigger when a writer submits a new application.
create or replace function public.handle_application_insert_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
begin
  v_recipient := coalesce(new.producer_id, new.owner_id);

  if v_recipient is null then
    select owner_id into v_recipient
    from public.producer_listings
    where id = new.producer_listing_id;
  end if;

  if v_recipient is null then
    select producer_id into v_recipient
    from public.requests
    where id = new.request_id;
  end if;

  if v_recipient is not null then
    perform public.log_notification(
      v_recipient,
      'application_submitted',
      new.writer_id,
      new.id,
      null,
      null,
      jsonb_build_object(
        'status', new.status,
        'script_id', new.script_id
      )
    );
  end if;

  return new;
end;
$$;

-- Trigger when an application status changes (accept/reject/purchase).
create or replace function public.handle_application_status_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if new.status in ('accepted', 'rejected') then
      perform public.log_notification(
        new.writer_id,
        'application_decision',
        coalesce(new.producer_id, new.owner_id),
        new.id,
        null,
        null,
        jsonb_build_object('status', new.status)
      );
    end if;

    if new.status = 'accepted' then
      perform public.ensure_conversation_with_participants(new.id, null);
    end if;
  end if;

  return new;
end;
$$;

-- Trigger when a purchase is recorded.
create or replace function public.handle_order_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_writer_id uuid;
  v_script_title text;
begin
  select s.owner_id, s.title into v_writer_id, v_script_title
  from public.scripts s
  where s.id = new.script_id;

  if v_writer_id is null then
    return new;
  end if;

  perform public.log_notification(
    v_writer_id,
    'script_purchased',
    new.buyer_id,
    null,
    null,
    new.id,
    jsonb_build_object(
      'script_id', new.script_id,
      'amount_cents', new.amount_cents,
      'script_title', v_script_title
    )
  );

  return new;
end;
$$;

-- Attach triggers to tables.
create trigger trigger_interest_notification
  after insert on public.interests
  for each row
  execute function public.handle_interest_notification();

create trigger trigger_application_insert_notification
  after insert on public.applications
  for each row
  execute function public.handle_application_insert_notification();

create trigger trigger_application_status_notification
  after update on public.applications
  for each row
  execute function public.handle_application_status_notification();

create trigger trigger_order_notification
  after insert on public.orders
  for each row
  execute function public.handle_order_notification();
