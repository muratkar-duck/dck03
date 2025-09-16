-- Ensure pgcrypto for gen_random_uuid
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Core lookup table for application roles
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key,
  email text not null,
  role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists users_email_key on public.users (email);
create index if not exists idx_users_role on public.users (role);

-- Attach auth.users as source of truth for user lifecycle
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.constraint_schema = 'public'
      and tc.table_name = 'users'
      and tc.constraint_name = 'users_auth_user_id_fkey'
  ) then
    alter table public.users
      add constraint users_auth_user_id_fkey
        foreign key (id)
        references auth.users (id)
        on delete cascade;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Writers' scripts
-- ---------------------------------------------------------------------------
create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  genre text not null,
  length integer,
  synopsis text,
  description text,
  price_cents integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.constraint_schema = 'public'
      and tc.table_name = 'scripts'
      and tc.constraint_name = 'scripts_owner_id_fkey'
  ) then
    alter table public.scripts
      add constraint scripts_owner_id_fkey
        foreign key (owner_id)
        references public.users (id)
        on delete cascade;
  end if;
end $$;

create index if not exists idx_scripts_owner_id on public.scripts (owner_id);
create index if not exists idx_scripts_created_at on public.scripts (created_at);

-- ---------------------------------------------------------------------------
-- Producer job listings
-- ---------------------------------------------------------------------------
create table if not exists public.producer_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  description text,
  genre text not null,
  budget_cents integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.constraint_schema = 'public'
      and tc.table_name = 'producer_listings'
      and tc.constraint_name = 'producer_listings_owner_id_fkey'
  ) then
    alter table public.producer_listings
      add constraint producer_listings_owner_id_fkey
        foreign key (owner_id)
        references public.users (id)
        on delete cascade;
  end if;
end $$;

create index if not exists idx_producer_listings_owner_id on public.producer_listings (owner_id);
create index if not exists idx_producer_listings_created_at on public.producer_listings (created_at);

-- ---------------------------------------------------------------------------
-- Producer requests (legacy and current)
-- ---------------------------------------------------------------------------
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  genre text not null,
  length text,
  budget numeric,
  deadline date,
  producer_id uuid,
  user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.constraint_schema = 'public'
      and tc.table_name = 'requests'
      and tc.constraint_name = 'requests_producer_id_fkey'
  ) then
    alter table public.requests
      add constraint requests_producer_id_fkey
        foreign key (producer_id)
        references public.users (id)
        on delete cascade;
  end if;
end $$;


do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.constraint_schema = 'public'
      and tc.table_name = 'requests'
      and tc.constraint_name = 'requests_user_id_fkey'
  ) then
    alter table public.requests
      add constraint requests_user_id_fkey
        foreign key (user_id)
        references public.users (id)
        on delete cascade;
  end if;
end $$;

create index if not exists idx_requests_producer_id on public.requests (producer_id);
create index if not exists idx_requests_user_id on public.requests (user_id);
create index if not exists idx_requests_created_at on public.requests (created_at);

-- ---------------------------------------------------------------------------
-- Applications (writers → requests/listings)
-- ---------------------------------------------------------------------------
alter table public.applications
  alter column status set default 'pending';

alter table public.applications
  alter column created_at set default now();

alter table public.applications
  add column if not exists updated_at timestamptz not null default now();

alter table public.applications
  add column if not exists request_id uuid;

alter table public.applications
  add column if not exists producer_listing_id uuid;

alter table public.applications
  add column if not exists user_id uuid;

alter table public.applications
  add column if not exists owner_id uuid;

alter table public.applications
  add column if not exists producer_id uuid;

do $$
begin
  -- writer_id is required in new flow but legacy rows only had user_id
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'applications'
      and c.column_name = 'writer_id'
      and c.is_nullable = 'NO'
  ) then
    alter table public.applications
      alter column writer_id drop not null;
  end if;
end $$;

-- Align foreign keys with cascading deletes

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'applications'
      and constraint_name = 'applications_writer_id_fkey'
  ) then
    alter table public.applications
      drop constraint applications_writer_id_fkey;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'applications'
      and constraint_name = 'applications_listing_id_fkey'
  ) then
    alter table public.applications
      drop constraint applications_listing_id_fkey;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'applications'
      and constraint_name = 'applications_script_id_fkey'
  ) then
    alter table public.applications
      drop constraint applications_script_id_fkey;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.constraint_schema = 'public'
      and tc.table_name = 'applications'
      and tc.constraint_name = 'applications_writer_id_fkey'
  ) then
    alter table public.applications
      add constraint applications_writer_id_fkey
        foreign key (writer_id)
        references public.users (id)
        on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.constraint_schema = 'public'
      and tc.table_name = 'applications'
      and tc.constraint_name = 'applications_user_id_fkey'
  ) then
    alter table public.applications
      add constraint applications_user_id_fkey
        foreign key (user_id)
        references public.users (id)
        on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.constraint_schema = 'public'
      and tc.table_name = 'applications'
      and tc.constraint_name = 'applications_owner_id_fkey'
  ) then
    alter table public.applications
      add constraint applications_owner_id_fkey
        foreign key (owner_id)
        references public.users (id)
        on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.constraint_schema = 'public'
      and tc.table_name = 'applications'
      and tc.constraint_name = 'applications_producer_id_fkey'
  ) then
    alter table public.applications
      add constraint applications_producer_id_fkey
        foreign key (producer_id)
        references public.users (id)
        on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.constraint_schema = 'public'
      and tc.table_name = 'applications'
      and tc.constraint_name = 'applications_listing_id_fkey'
  ) then
    alter table public.applications
      add constraint applications_listing_id_fkey
        foreign key (listing_id)
        references public.producer_listings (id)
        on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.constraint_schema = 'public'
      and tc.table_name = 'applications'
      and tc.constraint_name = 'applications_producer_listing_id_fkey'
  ) then
    alter table public.applications
      add constraint applications_producer_listing_id_fkey
        foreign key (producer_listing_id)
        references public.producer_listings (id)
        on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.constraint_schema = 'public'
      and tc.table_name = 'applications'
      and tc.constraint_name = 'applications_request_id_fkey'
  ) then
    alter table public.applications
      add constraint applications_request_id_fkey
        foreign key (request_id)
        references public.requests (id)
        on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.constraint_schema = 'public'
      and tc.table_name = 'applications'
      and tc.constraint_name = 'applications_script_id_fkey'
  ) then
    alter table public.applications
      add constraint applications_script_id_fkey
        foreign key (script_id)
        references public.scripts (id)
        on delete cascade;
  end if;
end $$;

create index if not exists idx_applications_listing_id on public.applications (listing_id);
create index if not exists idx_applications_producer_listing_id on public.applications (producer_listing_id);
create index if not exists idx_applications_request_id on public.applications (request_id);
create index if not exists idx_applications_writer_id on public.applications (writer_id);
create index if not exists idx_applications_user_id on public.applications (user_id);
create index if not exists idx_applications_owner_id on public.applications (owner_id);
create index if not exists idx_applications_producer_id on public.applications (producer_id);
create index if not exists idx_applications_script_id on public.applications (script_id);
create index if not exists idx_applications_status on public.applications (status);
create index if not exists idx_applications_created_at on public.applications (created_at);

-- ---------------------------------------------------------------------------
-- Orders, conversations and messages: enforce cascading delete semantics
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'orders'
      and constraint_name = 'orders_buyer_id_fkey'
  ) then
    alter table public.orders
      drop constraint orders_buyer_id_fkey;
  end if;
end $$;

alter table public.orders
  add constraint orders_buyer_id_fkey
    foreign key (buyer_id)
    references public.users (id)
    on delete cascade;


do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'orders'
      and constraint_name = 'orders_script_id_fkey'
  ) then
    alter table public.orders
      drop constraint orders_script_id_fkey;
  end if;
end $$;

alter table public.orders
  add constraint orders_script_id_fkey
    foreign key (script_id)
    references public.scripts (id)
    on delete cascade;

create index if not exists idx_orders_buyer_id on public.orders (buyer_id);
create index if not exists idx_orders_script_id on public.orders (script_id);
create index if not exists idx_orders_created_at on public.orders (created_at);


do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'conversations'
      and constraint_name = 'conversations_application_id_fkey'
  ) then
    alter table public.conversations
      drop constraint conversations_application_id_fkey;
  end if;
end $$;

alter table public.conversations
  add constraint conversations_application_id_fkey
    foreign key (application_id)
    references public.applications (id)
    on delete cascade;

create unique index if not exists conversations_application_id_key
  on public.conversations (application_id);


do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'messages'
      and constraint_name = 'messages_conversation_id_fkey'
  ) then
    alter table public.messages
      drop constraint messages_conversation_id_fkey;
  end if;
end $$;

alter table public.messages
  add constraint messages_conversation_id_fkey
    foreign key (conversation_id)
    references public.conversations (id)
    on delete cascade;

create index if not exists idx_messages_conversation_id on public.messages (conversation_id);
create index if not exists idx_messages_sender_id on public.messages (sender_id);
create index if not exists idx_messages_created_at on public.messages (created_at);

-- ---------------------------------------------------------------------------
-- Shared triggers for updated_at management
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_scripts_updated_at on public.scripts;
create trigger set_scripts_updated_at
before update on public.scripts
for each row execute function public.set_updated_at();

drop trigger if exists set_producer_listings_updated_at on public.producer_listings;
create trigger set_producer_listings_updated_at
before update on public.producer_listings
for each row execute function public.set_updated_at();

drop trigger if exists set_requests_updated_at on public.requests;
create trigger set_requests_updated_at
before update on public.requests
for each row execute function public.set_updated_at();

drop trigger if exists set_applications_updated_at on public.applications;
create trigger set_applications_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger to keep legacy/new application columns in sync
-- ---------------------------------------------------------------------------
create or replace function public.sync_application_columns()
returns trigger as $$
begin
  if new.writer_id is null and new.user_id is not null then
    new.writer_id := new.user_id;
  end if;

  if new.user_id is null and new.writer_id is not null then
    new.user_id := new.writer_id;
  end if;

  if new.owner_id is null then
    new.owner_id := coalesce(new.writer_id, new.user_id);
  end if;

  if new.producer_listing_id is null and new.listing_id is not null then
    new.producer_listing_id := new.listing_id;
  end if;

  if new.listing_id is null and new.producer_listing_id is not null then
    new.listing_id := new.producer_listing_id;
  end if;

  if new.producer_id is null then
    if new.request_id is not null then
      select coalesce(r.producer_id, r.user_id)
        into new.producer_id
      from public.requests r
      where r.id = new.request_id;
    end if;

    if new.producer_id is null and new.listing_id is not null then
      select l.owner_id
        into new.producer_id
      from public.producer_listings l
      where l.id = new.listing_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_application_columns on public.applications;
create trigger trg_sync_application_columns
before insert or update on public.applications
for each row execute function public.sync_application_columns();

-- Trigger to keep request legacy columns aligned
create or replace function public.sync_request_columns()
returns trigger as $$
begin
  if new.producer_id is null and new.user_id is not null then
    new.producer_id := new.user_id;
  end if;

  if new.user_id is null and new.producer_id is not null then
    new.user_id := new.producer_id;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_request_columns on public.requests;
create trigger trg_sync_request_columns
before insert or update on public.requests
for each row execute function public.sync_request_columns();

-- ---------------------------------------------------------------------------
-- Validation queries
-- ---------------------------------------------------------------------------
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('users','scripts','producer_listings','requests','applications','orders','conversations','messages')
order by table_name, ordinal_position;

select rc.constraint_name, tc.table_name, rc.delete_rule
from information_schema.referential_constraints rc
join information_schema.table_constraints tc
  on rc.constraint_schema = tc.constraint_schema
 and rc.constraint_name = tc.constraint_name
where rc.constraint_schema = 'public'
  and tc.table_name in ('users','scripts','producer_listings','requests','applications','orders','conversations','messages')
order by tc.table_name, rc.constraint_name;

select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('users','scripts','producer_listings','requests','applications','orders','conversations','messages')
order by tablename, indexname;
