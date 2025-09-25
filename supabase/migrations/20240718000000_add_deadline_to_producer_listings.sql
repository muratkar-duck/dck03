-- Add deadline column to producer_listings
alter table if exists public.producer_listings
  add column if not exists deadline timestamptz;

-- Refresh unified listings view to expose the deadline information
create or replace view public.v_listings_unified as
select
  l.id,
  l.owner_id,
  l.title,
  l.description,
  l.genre,
  l.budget_cents,
  l.created_at,
  l.deadline,
  'producer_listings'::text as source
from public.producer_listings l
union all
select
  r.id,
  coalesce(r.producer_id, r.user_id) as owner_id,
  r.title,
  r.description,
  r.genre,
  case
    when r.budget is null then null
    else round(r.budget)::integer
  end as budget_cents,
  r.created_at,
  r.deadline::timestamptz,
  'requests'::text as source
from public.requests r;
