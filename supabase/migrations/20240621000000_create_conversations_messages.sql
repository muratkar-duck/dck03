create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) unique,
  created_at timestamptz default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id),
  sender_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz default now()
);

