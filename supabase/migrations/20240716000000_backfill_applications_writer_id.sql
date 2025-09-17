-- Ensure existing application rows have writer_id populated
update public.applications
set writer_id = coalesce(writer_id, user_id);
