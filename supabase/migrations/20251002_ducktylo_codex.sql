-- Ensure pgcrypto is available for UUID generation
create extension if not exists pgcrypto;

-- Temporarily disable RLS during structure changes
alter table if exists public.interests disable row level security;

-- Add surrogate primary key column if missing
alter table if exists public.interests
  add column if not exists id uuid;

-- Backfill ids for existing rows
update public.interests
set id = gen_random_uuid()
where id is null;

-- Ensure id column has the correct default and constraint
alter table if exists public.interests
  alter column id set default gen_random_uuid();

alter table if exists public.interests
  alter column id set not null;

-- Drop the old primary key on (producer_id, script_id) if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'interests_pkey'
      AND conrelid = 'public.interests'::regclass
  ) THEN
    ALTER TABLE public.interests
      DROP CONSTRAINT interests_pkey;
  END IF;
END;
$$;

-- Create the new primary key on id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'interests_pkey'
      AND conrelid = 'public.interests'::regclass
  ) THEN
    ALTER TABLE public.interests
      ADD CONSTRAINT interests_pkey PRIMARY KEY (id);
  END IF;
END;
$$;

-- Ensure uniqueness on producer/script combination
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'interests_producer_id_script_id_key'
      AND conrelid = 'public.interests'::regclass
  ) THEN
    ALTER TABLE public.interests
      ADD CONSTRAINT interests_producer_id_script_id_key
        UNIQUE (producer_id, script_id);
  END IF;
END;
$$;

-- Helpful indexes for lookup paths
create index if not exists idx_interests_producer_id on public.interests (producer_id);
create index if not exists idx_interests_script_id on public.interests (script_id);

-- Re-enable RLS and recreate required policies
alter table if exists public.interests enable row level security;

drop policy if exists "Producers can view their interests" on public.interests;
drop policy if exists "Producers can insert their interests" on public.interests;

drop policy if exists "Producers can update their interests" on public.interests;

create policy "Producers can view their interests"
  on public.interests
  for select
  using (producer_id = auth.uid());

create policy "Producers can insert their interests"
  on public.interests
  for insert
  with check (producer_id = auth.uid());

-- Replace RPC with new signature/behaviour
DROP FUNCTION IF EXISTS public.rpc_mark_interest(uuid);

CREATE OR REPLACE FUNCTION public.rpc_mark_interest(p_script_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_producer_id uuid := auth.uid();
BEGIN
  IF v_producer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.interests (producer_id, script_id)
  VALUES (v_producer_id, p_script_id)
  ON CONFLICT (producer_id, script_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_mark_interest(uuid) TO authenticated;
