import type { SupabaseClient } from '@supabase/supabase-js';

type ConversationParticipant = {
  conversation_id: string;
  user_id: string;
  role: 'writer' | 'producer';
};

type ConversationResult = {
  conversationId: string | null;
  error: string | null;
};

export const ensureConversationWithParticipants = async (
  client: SupabaseClient,
  applicationId: string
): Promise<ConversationResult> => {
  const { data: applicationData, error: applicationFetchError } = await client
    .from('applications')
    .select('writer_id, owner_id')
    .eq('id', applicationId)
    .single();

  if (applicationFetchError) {
    console.error(applicationFetchError);
    return { conversationId: null, error: applicationFetchError.message };
  }

  const { data: conversationData, error: upsertError } = await client
    .from('conversations')
    .upsert({ application_id: applicationId }, { onConflict: 'application_id' })
    .select()
    .single();

  if (upsertError || !conversationData) {
    if (upsertError) {
      console.error(upsertError);
    }
    return {
      conversationId: null,
      error: upsertError?.message ?? 'Sohbet oluşturulamadı',
    };
  }

  const participants: ConversationParticipant[] = [];

  if (applicationData?.writer_id) {
    participants.push({
      conversation_id: conversationData.id,
      user_id: applicationData.writer_id,
      role: 'writer',
    });
  }

  if (applicationData?.owner_id) {
    participants.push({
      conversation_id: conversationData.id,
      user_id: applicationData.owner_id,
      role: 'producer',
    });
  }

  if (participants.length > 0) {
    const { error: participantsError } = await client
      .from('conversation_participants')
      .upsert(participants, { onConflict: 'conversation_id,user_id' });

    if (participantsError) {
      console.error(participantsError);
      return { conversationId: conversationData.id, error: participantsError.message };
    }
  }

  return { conversationId: conversationData.id, error: null };
};
