create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.scripts(id),
  buyer_id uuid not null references public.users(id),
  amount_cents integer not null,
  created_at timestamp with time zone not null default now()
);
