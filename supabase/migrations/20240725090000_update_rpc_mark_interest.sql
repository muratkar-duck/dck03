-- Eski fonksiyonu kaldır
drop function if exists public.rpc_mark_interest(uuid);

-- Yeni fonksiyonu oluştur
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

-- Yetkiler
grant execute on function public.rpc_mark_interest(uuid) to anon, authenticated;
