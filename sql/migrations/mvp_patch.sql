-- Align legacy schemas with the unified listings/data flow

-- Ensure scripts table has ownership + price metadata
alter table public.scripts
  add column if not exists owner_id uuid;

alter table public.scripts
  alter column price_cents set default 0;

alter table public.scripts
  add column if not exists created_at timestamptz default now();

alter table public.scripts
  add column if not exists updated_at timestamptz default now();

alter table public.scripts
  alter column created_at set default now();

alter table public.scripts
  alter column updated_at set default now();

-- Recreate the ownership foreign key with cascading deletes when missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public'
      AND tc.table_name = 'scripts'
      AND tc.constraint_name = 'scripts_owner_id_fkey'
  ) THEN
    ALTER TABLE public.scripts
      ADD CONSTRAINT scripts_owner_id_fkey
        FOREIGN KEY (owner_id)
        REFERENCES public.users (id)
        ON DELETE CASCADE;
  END IF;
END $$;

create index if not exists idx_scripts_owner_id on public.scripts (owner_id);
create index if not exists idx_scripts_created_at on public.scripts (created_at);

-- Applications table needs columns and cascading FK relationships for the
-- unified listings flows
alter table public.applications
  add column if not exists listing_id uuid;

alter table public.applications
  add column if not exists producer_listing_id uuid;

alter table public.applications
  add column if not exists request_id uuid;

alter table public.applications
  add column if not exists user_id uuid;

alter table public.applications
  add column if not exists owner_id uuid;

alter table public.applications
  add column if not exists producer_id uuid;

alter table public.applications
  add column if not exists updated_at timestamptz not null default now();

alter table public.applications
  alter column created_at set default now();

alter table public.applications
  alter column status set default 'pending';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'applications'
      AND c.column_name = 'writer_id'
      AND c.is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.applications
      ALTER COLUMN writer_id DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public'
      AND tc.table_name = 'applications'
      AND tc.constraint_name = 'applications_writer_id_fkey'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_writer_id_fkey
        FOREIGN KEY (writer_id)
        REFERENCES public.users (id)
        ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public'
      AND tc.table_name = 'applications'
      AND tc.constraint_name = 'applications_user_id_fkey'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users (id)
        ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public'
      AND tc.table_name = 'applications'
      AND tc.constraint_name = 'applications_owner_id_fkey'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_owner_id_fkey
        FOREIGN KEY (owner_id)
        REFERENCES public.users (id)
        ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public'
      AND tc.table_name = 'applications'
      AND tc.constraint_name = 'applications_producer_id_fkey'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_producer_id_fkey
        FOREIGN KEY (producer_id)
        REFERENCES public.users (id)
        ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public'
      AND tc.table_name = 'applications'
      AND tc.constraint_name = 'applications_listing_id_fkey'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_listing_id_fkey
        FOREIGN KEY (listing_id)
        REFERENCES public.producer_listings (id)
        ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public'
      AND tc.table_name = 'applications'
      AND tc.constraint_name = 'applications_producer_listing_id_fkey'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_producer_listing_id_fkey
        FOREIGN KEY (producer_listing_id)
        REFERENCES public.producer_listings (id)
        ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public'
      AND tc.table_name = 'applications'
      AND tc.constraint_name = 'applications_request_id_fkey'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_request_id_fkey
        FOREIGN KEY (request_id)
        REFERENCES public.requests (id)
        ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public'
      AND tc.table_name = 'applications'
      AND tc.constraint_name = 'applications_script_id_fkey'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_script_id_fkey
        FOREIGN KEY (script_id)
        REFERENCES public.scripts (id)
        ON DELETE CASCADE;
  END IF;
END $$;

create index if not exists idx_applications_listing_id on public.applications (listing_id);
create index if not exists idx_applications_producer_listing_id on public.applications (producer_listing_id);
create index if not exists idx_applications_request_id on public.applications (request_id);
create index if not exists idx_applications_user_id on public.applications (user_id);
create index if not exists idx_applications_owner_id on public.applications (owner_id);
create index if not exists idx_applications_producer_id on public.applications (producer_id);
create index if not exists idx_applications_script_id on public.applications (script_id);
create index if not exists idx_applications_status on public.applications (status);
create index if not exists idx_applications_created_at on public.applications (created_at);
create index if not exists applications_writer_idx on public.applications (writer_id);

-- Requests table should have consistent FK/index coverage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public'
      AND tc.table_name = 'requests'
      AND tc.constraint_name = 'requests_producer_id_fkey'
  ) THEN
    ALTER TABLE public.requests
      ADD CONSTRAINT requests_producer_id_fkey
        FOREIGN KEY (producer_id)
        REFERENCES public.users (id)
        ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public'
      AND tc.table_name = 'requests'
      AND tc.constraint_name = 'requests_user_id_fkey'
  ) THEN
    ALTER TABLE public.requests
      ADD CONSTRAINT requests_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users (id)
        ON DELETE CASCADE;
  END IF;
END $$;

create index if not exists idx_requests_producer_id on public.requests (producer_id);
create index if not exists idx_requests_user_id on public.requests (user_id);
create index if not exists idx_requests_created_at on public.requests (created_at);

-- Producer listings require the ownership FK + indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public'
      AND tc.table_name = 'producer_listings'
      AND tc.constraint_name = 'producer_listings_owner_id_fkey'
  ) THEN
    ALTER TABLE public.producer_listings
      ADD CONSTRAINT producer_listings_owner_id_fkey
        FOREIGN KEY (owner_id)
        REFERENCES public.users (id)
        ON DELETE CASCADE;
  END IF;
END $$;

create index if not exists idx_producer_listings_owner_id on public.producer_listings (owner_id);
create index if not exists idx_producer_listings_created_at on public.producer_listings (created_at);

-- Unified listings view consumed by the dashboard and RLS policies
create or replace view public.v_listings_unified as
select
  l.id,
  l.owner_id,
  l.title,
  l.description,
  l.genre,
  l.budget_cents,
  l.created_at,
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
  'requests'::text as source
from public.requests r;
