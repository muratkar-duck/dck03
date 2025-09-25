import type { SupabaseClient } from '@supabase/supabase-js';

type ConversationResult = {
  conversationId: string | null;
  error: string | null;
};

export const ensureConversationWithParticipants = async (
  client: SupabaseClient,
  applicationId: string,
  actingUserId?: string | null
): Promise<ConversationResult> => {
  const { data, error } = await client.rpc(
    'ensure_conversation_with_participants',
    {
      application_id: applicationId,
      acting_user_id: actingUserId ?? null,
    }
  );

  if (error) {
    console.error(error);
    return { conversationId: null, error: error.message };
  }

  if (!data) {
    return { conversationId: null, error: 'Sohbet oluşturulamadı' };
  }

  return { conversationId: String(data), error: null };
};
