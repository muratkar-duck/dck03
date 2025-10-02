import type { SupabaseClient } from '@supabase/supabase-js';

type ConversationResult = {
  conversationId: string | null;
  error: string | null;
};

export const ensureConversationWithParticipants = async (
  client: SupabaseClient,
  applicationId: string,
  _actingUserId?: string | null
): Promise<ConversationResult> => {
  const { data, error } = await client.rpc(
    'ensure_conversation_for_application',
    {
      p_application_id: applicationId,
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
