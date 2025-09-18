-- MVP migration to introduce per-user plan tracking

create table if not exists public.user_plans (
  user_id uuid primary key references auth.users(id),
  plan text not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_plans_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_plans_set_updated_at on public.user_plans;

create trigger user_plans_set_updated_at
before insert or update on public.user_plans
for each row
execute function public.set_user_plans_updated_at();
