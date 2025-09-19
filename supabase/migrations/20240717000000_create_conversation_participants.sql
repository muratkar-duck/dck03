create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text,
  created_at timestamptz not null default now()
);

alter table public.conversation_participants enable row level security;

create unique index if not exists conversation_participants_conversation_id_user_id_idx
  on public.conversation_participants (conversation_id, user_id);

\ir ../../sql/migrations/mvp_cp_policies.sql
