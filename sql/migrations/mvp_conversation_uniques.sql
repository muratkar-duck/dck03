-- Ensure conversations are unique per application and participant entries are deduplicated
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'conversations_application_id_unique'
          AND conrelid = 'public.conversations'::regclass
    ) THEN
        ALTER TABLE public.conversations
            ADD CONSTRAINT conversations_application_id_unique
            UNIQUE (application_id);
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_conversation_participant
  ON public.conversation_participants (conversation_id, user_id);
