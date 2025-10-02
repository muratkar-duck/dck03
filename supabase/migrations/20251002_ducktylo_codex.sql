-- Ensure producers can fetch their applications via a reusable RPC
set check_function_bodies = off;

create or replace function public.get_producer_applications(p_producer_id uuid)
  returns table (
    application_id uuid,
    status text,
    created_at timestamptz,
    listing_id uuid,
    producer_listing_id uuid,
    request_id uuid,
    owner_id uuid,
    producer_id uuid,
    script_id uuid,
    script_metadata jsonb,
    listing_title text,
    listing_source text,
    writer_email text,
    conversation_id uuid
  )
  language sql
  security definer
  set search_path = public, auth
as $$
  select
    a.id as application_id,
    a.status,
    a.created_at,
    a.listing_id,
    a.producer_listing_id,
    a.request_id,
    a.owner_id,
    a.producer_id,
    a.script_id,
    a.script_metadata::jsonb,
    l.title as listing_title,
    l.source as listing_source,
    w.email as writer_email,
    c.id as conversation_id
  from public.applications a
  left join public.v_listings_unified l
    on l.id = coalesce(a.listing_id, a.producer_listing_id, a.request_id)
  left join auth.users w
    on w.id = a.writer_id
  left join public.conversations c
    on c.application_id = a.id
  where (
    a.owner_id = p_producer_id
    or a.producer_id = p_producer_id
  )
  order by a.created_at desc;
$$;

alter function public.get_producer_applications(uuid) owner to postgres;

alter table public.applications enable row level security;

create policy if not exists "Producers can view their applications"
  on public.applications
  for select
  using (
    auth.uid() = owner_id
    or auth.uid() = producer_id
  );

create policy if not exists "Writers can view their applications"
  on public.applications
  for select
  using (
    auth.uid() = writer_id
    or auth.uid() = user_id
  );
