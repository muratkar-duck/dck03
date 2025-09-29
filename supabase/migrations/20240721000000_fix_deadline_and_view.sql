-- Ensure producer listings expose an optional deadline column for dashboards
alter table if exists public.producer_listings
  add column if not exists deadline date;

-- Normalize existing deadline data to the date type if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'producer_listings'
      AND column_name = 'deadline'
      AND data_type <> 'date'
  ) THEN
    ALTER TABLE public.producer_listings
      ALTER COLUMN deadline TYPE date USING deadline::date;
  END IF;
END $$;

-- Unified listings view consumed by both dashboards now exposes deadline safely
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
  r.deadline::date,
  'requests'::text as source
from public.requests r;
