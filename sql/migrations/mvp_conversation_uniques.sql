-- Ensure conversations are unique per application and participant entries are deduplicated
ALTER TABLE public.conversations
  ADD CONSTRAINT IF NOT EXISTS conversations_application_id_key
  UNIQUE (application_id);

CREATE UNIQUE INDEX IF NOT EXISTS conversation_participants_conversation_id_user_id_idx
  ON public.conversation_participants (conversation_id, user_id);
