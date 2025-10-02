-- Centralized helpers for application status updates and conversation provisioning.
create or replace function public.mark_application_status(
  p_application_id uuid,
  p_status text
) returns public.applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.applications%rowtype;
begin
  update public.applications
  set status = p_status
  where id = p_application_id
  returning * into v_application;

  if not found then
    raise exception 'application % not found', p_application_id;
  end if;

  return v_application;
end;
$$;

grant execute on function public.mark_application_status(uuid, text) to authenticated;

-- Wrapper around ensure_conversation_with_participants for clarity in client RPC calls.
create or replace function public.ensure_conversation_for_application(
  p_application_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  v_conversation_id := public.ensure_conversation_with_participants(
    p_application_id,
    null
  );

  return v_conversation_id;
end;
$$;

grant execute on function public.ensure_conversation_for_application(uuid) to authenticated;
