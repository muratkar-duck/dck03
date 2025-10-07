-- Run this in the Supabase SQL editor to (re)create the rpc_mark_interest function
create or replace function public.rpc_mark_interest(script_id uuid)
returns public.interests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_producer uuid;
  v_interest public.interests%rowtype;
begin
  v_producer := auth.uid();

  if v_producer is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  insert into public.interests (producer_id, script_id)
  values (v_producer, rpc_mark_interest.script_id)
  on conflict (producer_id, script_id) do nothing;

  select *
  into v_interest
  from public.interests
  where producer_id = v_producer
    and script_id = rpc_mark_interest.script_id;

  return v_interest;
end;
$$;

grant execute on function public.rpc_mark_interest(uuid) to authenticated;
grant execute on function public.rpc_mark_interest(uuid) to service_role;

notify pgrst, 'reload schema';
