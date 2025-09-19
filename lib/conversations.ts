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
  applicationId: string,
  actingUserId?: string | null
): Promise<ConversationResult> => {
  const { data: applicationData, error: applicationFetchError } = await client
    .from('applications')
    .select('writer_id, producer_id, user_id, owner_id')
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

  const participantRoles = new Map<string, ConversationParticipant['role']>();

  const addParticipant = (
    userId: string | null | undefined,
    role: ConversationParticipant['role']
  ) => {
    if (!userId) {
      return;
    }

    const existingRole = participantRoles.get(userId);

    if (!existingRole) {
      participantRoles.set(userId, role);
      return;
    }

    if (existingRole === 'producer' && role === 'writer') {
      participantRoles.set(userId, role);
    }
  };

  const writerCandidates = [applicationData?.writer_id, applicationData?.user_id];
  const producerCandidates = [
    applicationData?.producer_id,
    applicationData?.owner_id,
  ];

  writerCandidates.forEach((candidate) => addParticipant(candidate, 'writer'));
  producerCandidates.forEach((candidate) =>
    addParticipant(candidate, 'producer')
  );

  if (actingUserId) {
    const actingRole = writerCandidates.includes(actingUserId)
      ? 'writer'
      : 'producer';
    addParticipant(actingUserId, actingRole);
  }

  const participants: ConversationParticipant[] = Array.from(
    participantRoles.entries()
  ).map(([userId, role]) => ({
    conversation_id: conversationData.id,
    user_id: userId,
    role,
  }));

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
