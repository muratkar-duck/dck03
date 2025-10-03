BEGIN;

DROP VIEW IF EXISTS public.v_listings_unified;

CREATE VIEW public.v_listings_unified AS
SELECT
  l.id,
  l.owner_id,
  l.title,
  l.description,
  l.genre,
  l.budget_cents::numeric AS budget,
  l.created_at,
  l.deadline,
  'open'::text AS status,
  'producer'::text AS source
FROM public.producer_listings l
UNION ALL
SELECT
  r.id,
  COALESCE(r.producer_id, r.user_id) AS owner_id,
  r.title,
  r.description,
  r.genre,
  r.budget,
  r.created_at,
  r.deadline,
  'open'::text AS status,
  'request'::text AS source
FROM public.requests r;

COMMIT;
