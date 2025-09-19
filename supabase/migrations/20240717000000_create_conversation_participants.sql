create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text,
  created_at timestamptz not null default now()
);

alter table public.conversation_participants enable row level security;

create unique index if not exists conversation_participants_conversation_id_user_id_idx
  on public.conversation_participants (conversation_id, user_id);

-- Reset conversation participant policies to avoid self-referencing recursion
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversation_participants'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.conversation_participants',
      policy_record.policyname
    );
  END LOOP;
END $$;

-- Allow writers and producers attached to the application to read conversation participants
CREATE POLICY conversation_participants_select_policy
  ON public.conversation_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      JOIN public.applications a ON a.id = c.application_id
      WHERE c.id = conversation_participants.conversation_id
        AND (a.writer_id = auth.uid() OR a.producer_id = auth.uid())
    )
  );

-- Allow writers and producers to add themselves to conversations for their applications
CREATE POLICY conversation_participants_insert_policy
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      JOIN public.applications a ON a.id = c.application_id
      WHERE c.id = conversation_participants.conversation_id
        AND (a.writer_id = auth.uid() OR a.producer_id = auth.uid())
    )
  );

-- Allow updates for participants when authorized through the owning application
CREATE POLICY conversation_participants_update_policy
  ON public.conversation_participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      JOIN public.applications a ON a.id = c.application_id
      WHERE c.id = conversation_participants.conversation_id
        AND (a.writer_id = auth.uid() OR a.producer_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      JOIN public.applications a ON a.id = c.application_id
      WHERE c.id = conversation_participants.conversation_id
        AND (a.writer_id = auth.uid() OR a.producer_id = auth.uid())
    )
  );

-- Allow deletions when the actor is authorized through the application relationship
CREATE POLICY conversation_participants_delete_policy
  ON public.conversation_participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      JOIN public.applications a ON a.id = c.application_id
      WHERE c.id = conversation_participants.conversation_id
        AND (a.writer_id = auth.uid() OR a.producer_id = auth.uid())
    )
  );
