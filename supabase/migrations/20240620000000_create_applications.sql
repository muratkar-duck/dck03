create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.producer_listings(id),
  writer_id uuid not null references auth.users(id),
  script_id uuid not null references public.scripts(id),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
