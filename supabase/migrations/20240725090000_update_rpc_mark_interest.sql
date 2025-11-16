-- Align rpc_mark_interest with current frontend usage
create or replace function public.rpc_mark_interest(script_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.interests (producer_id, script_id, created_at)
  values (auth.uid(), script_id, now())
  on conflict (producer_id, script_id) do nothing;
end;
$$;

grant execute on function public.rpc_mark_interest(uuid) to anon, authenticated;
