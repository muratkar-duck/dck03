-- Backfill helper migration to make legacy data conform with the unified flow

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'scripts'
      AND c.column_name = 'user_id'
  ) THEN
    EXECUTE 'update public.scripts set owner_id = coalesce(owner_id, user_id);';
  END IF;
END $$;

update public.applications
set writer_id = coalesce(writer_id, user_id);

update public.applications
set owner_id = coalesce(owner_id, producer_id);

update public.applications
set user_id = coalesce(user_id, writer_id);

update public.scripts
set price_cents = coalesce(price_cents, 0);
