-- Ensure deployments prior to the constraint rename also define the new constraint/index names
ALTER TABLE public.conversations
  ADD CONSTRAINT IF NOT EXISTS conversations_application_id_unique
  UNIQUE (application_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_conversation_participant
  ON public.conversation_participants (conversation_id, user_id);
