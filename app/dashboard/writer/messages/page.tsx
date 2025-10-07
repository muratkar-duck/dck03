'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { getSupabaseClient } from '@/lib/supabaseClient';

type ConversationSummary = {
  id: string;
  applicationId: string;
  scriptTitle: string;
  listingTitle: string;
  producerEmail: string;
  createdAt: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const toSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
};

export default function WriterMessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationParam =
    searchParams?.get('c') ?? searchParams?.get('conversation') ?? null;
  const applicationParam = searchParams?.get('application') ?? null;

  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(getSupabaseClient, []);

  const ensureParticipantsForConversation = useCallback(
    async (
      conversationId: string,
      applicationId: string,
      fallbackUserId: string | null
    ) => {
      if (!supabase) {
        return;
      }

      const { data: application, error: applicationError } = await supabase
        .from('applications')
        .select('id, writer_id, producer_id')
        .eq('id', applicationId)
        .maybeSingle();

      if (applicationError) {
        console.error(
          'Konuşma katılımcıları için başvuru bilgisi alınamadı:',
          applicationError.message
        );
        return;
      }

      const participantIds = new Set<string>();
      if (application?.writer_id) participantIds.add(application.writer_id);
      if (application?.producer_id) participantIds.add(application.producer_id);

      let ensuredUserId = fallbackUserId;
      if (!ensuredUserId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        ensuredUserId = user?.id ?? null;
      }

      if (ensuredUserId) participantIds.add(ensuredUserId);

      if (participantIds.size === 0) {
        return;
      }

      const rows = Array.from(participantIds).map((userId) => ({
        conversation_id: conversationId,
        user_id: userId,
      }));

      const { error: participantError } = await supabase
        .from('conversation_participants')
        .upsert(rows, { onConflict: 'conversation_id,user_id' });

      if (participantError) {
        console.error(
          'Konuşma katılımcıları oluşturulamadı:',
          participantError.message
        );
      }
    }, [supabase]);

  useEffect(() => {
    let isActive = true;

    const loadConversations = async () => {
      if (!supabase) {
        setConversations([]);
        setConversationsLoading(false);
        setSelectedConversationId(null);
        setUserId(null);
        return;
      }

      setConversationsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isActive) return;

      if (!user) {
        setUserId(null);
        setConversations([]);
        setSelectedConversationId(null);
        setConversationsLoading(false);
        return;
      }

      setUserId(user.id);

      let targetConversationId = conversationParam;
      const targetApplicationId = applicationParam;

      if (targetApplicationId) {
        const { data: ensuredConversation, error: ensureError } = await supabase
          .from('conversations')
          .upsert({ application_id: targetApplicationId }, { onConflict: 'application_id' })
          .select('id, application_id')
          .maybeSingle();

        if (!isActive) return;

        if (!ensureError && ensuredConversation?.id) {
          await ensureParticipantsForConversation(
            ensuredConversation.id,
            targetApplicationId,
            user.id
          );
          targetConversationId = ensuredConversation.id;
        }
      }

      const { data, error } = await supabase
        .from('conversation_participants')
        .select(
          `
            conversation_id,
            created_at,
            conversation:conversations!inner (
              id,
              created_at,
              application:applications!inner (
                id,
                created_at,
                status,
                script:scripts!inner (
                  id,
                  title,
                  genre,
                  length,
                  price_cents,
                  created_at
                ),
                listing:v_listings_unified (
                  id,
                  title,
                  genre,
                  budget,
                  owner_id,
                  source,
                  created_at
                ),
                producer:users!producer_id (
                  id,
                  email
                ),
                writer:users!writer_id (
                  id,
                  email
                )
              )
            )
          `
        )
        .eq('user_id', user.id)
        .order('conversation(created_at)', { ascending: false });

      if (!isActive) return;

      if (error) {
        console.error('Konuşmalar alınamadı:', error.message);
        setConversations([]);
        setSelectedConversationId(null);
        setConversationsLoading(false);
        return;
      }

      const mapped: ConversationSummary[] = (data ?? []).map((row: any) => {
        const conversation = toSingle(row.conversation);
        const application = toSingle(conversation?.application);
        const script = toSingle(application?.script);
        const listing = toSingle(application?.listing);
        const producer = toSingle(application?.producer);

        return {
          id: (conversation?.id as string) ?? (row.conversation_id as string),
          createdAt: (conversation?.created_at as string) ?? (row.created_at as string),
          applicationId: (application?.id as string) ?? '',
          scriptTitle: (script?.title as string) ?? '—',
          listingTitle: (listing?.title as string) ?? '—',
          producerEmail: (producer?.email as string) ?? '—',
        };
      });

      setConversations(mapped);

      let nextSelectedId = targetConversationId;

      if (nextSelectedId && !mapped.some((c) => c.id === nextSelectedId)) {
        nextSelectedId = null;
      }

      if (!nextSelectedId && targetApplicationId) {
        const foundByApplication = mapped.find(
          (c) => c.applicationId === targetApplicationId
        );
        nextSelectedId = foundByApplication?.id ?? null;
      }

      if (!nextSelectedId && mapped.length > 0) {
        nextSelectedId = mapped[0].id;
      }

      setSelectedConversationId(nextSelectedId ?? null);

      if (targetApplicationId || conversationParam !== nextSelectedId) {
        const params = new URLSearchParams();
        if (nextSelectedId) {
          params.set('c', nextSelectedId);
        }
        const query = params.toString();
        router.replace(
          `/dashboard/writer/messages${query ? `?${query}` : ''}`,
          { scroll: false }
        );
      }

      setConversationsLoading(false);
    };

    loadConversations();

    return () => {
      isActive = false;
    };
  }, [
    applicationParam,
    conversationParam,
    ensureParticipantsForConversation,
    router,
    supabase,
  ]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    let isActive = true;

    const fetchMessages = async (showSpinner = false) => {
      if (!supabase) {
        if (showSpinner) {
          setMessagesLoading(false);
        }
        return;
      }

      if (showSpinner) {
        setMessagesLoading(true);
      }

      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, created_at')
        .eq('conversation_id', selectedConversationId)
        .order('created_at', { ascending: true });

      if (!isActive) return;

      if (error) {
        console.error('Mesajlar alınamadı:', error.message);
        setMessages([]);
      } else {
        setMessages((data as Message[]) ?? []);
      }

      if (showSpinner) {
        setMessagesLoading(false);
      }
    };

    fetchMessages(true);

    if (!supabase) {
      return () => {
        isActive = false;
      };
    }

    const channel = supabase
      .channel(`writer-conversation-${selectedConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    const pollId = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => {
      isActive = false;
      clearInterval(pollId);
      supabase?.removeChannel(channel);
    };
  }, [selectedConversationId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedConversationId]);

  useEffect(() => {
    setInput('');
  }, [selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const ensureAccessibleConversationId = useCallback(
    async (candidateId: string): Promise<string | null> => {
      if (!supabase) {
        return null;
      }

      if (conversations.some((conversation) => conversation.id === candidateId)) {
        return candidateId;
      }

      let effectiveUserId = userId;
      if (!effectiveUserId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        effectiveUserId = user?.id ?? null;
        if (effectiveUserId && !userId) {
          setUserId(effectiveUserId);
        }
      }

      if (!effectiveUserId) {
        return null;
      }

      const { data, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('conversation_id', candidateId)
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (error) {
        console.error('Konuşma erişimi doğrulanamadı:', error.message);
        return null;
      }

      return data?.conversation_id ? String(data.conversation_id) : null;
    },
    [conversations, setUserId, supabase, userId]
  );

  const handleSelectConversation = (conversation: ConversationSummary) => {
    setSelectedConversationId(conversation.id);
    if (conversationParam === conversation.id) {
      return;
    }

    const params = new URLSearchParams();
    params.set('conversation', conversation.id);
    router.replace(
      `/dashboard/writer/messages?${params.toString()}`,
      { scroll: false }
    );
  };

  const sendMessage = async () => {
    if (!selectedConversationId) return;
    const text = input.trim();
    if (!text) return;
    if (!userId) return;

    if (!supabase) {
      console.error('Supabase istemcisi mevcut değil. Mesaj gönderilemedi.');
      return;
    }

    const conversationIdToUse = await ensureAccessibleConversationId(
      selectedConversationId
    );

    if (!conversationIdToUse) {
      console.error('Konuşma doğrulanamadı; mesaj gönderilemedi.');
      return;
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationIdToUse,
      sender_id: userId,
      body: text,
    });

    if (!error) {
      setInput('');
    } else {
      console.error('Mesaj gönderilemedi:', error.message);
    }
  };

  return (
    <AuthGuard allowedRoles={['writer']}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">💬 Sohbetler</h1>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
          <div className="card p-0">
            <div className="border-b border-[#e8d7ba] px-4 py-3">
              <h2 className="text-lg font-semibold">Konuşmalar</h2>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4 space-y-2">
              {conversationsLoading ? (
                <p className="text-sm text-[#a38d6d]">Yükleniyor…</p>
              ) : conversations.length === 0 ? (
                <p className="text-sm text-[#a38d6d]">
                  Henüz sohbet yok. Kabul edilen başvurular burada görünür.
                </p>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === selectedConversationId;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => handleSelectConversation(conv)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        isActive
                          ? 'bg-[#0e5b4a] text-white border-[#0e5b4a]'
                          : 'bg-white border-[#eadcc3] hover:bg-[#f6ebd7]'
                      }`}
                    >
                      <p className="font-semibold truncate">{conv.scriptTitle}</p>
                      <p
                        className={`text-xs ${
                          isActive ? 'text-[#d7f4ec]' : 'text-[#7a5c36]'
                        }`}
                      >
                        Yapımcı: {conv.producerEmail || '—'}
                      </p>
                      <p
                        className={`text-xs ${
                          isActive ? 'text-[#d7f4ec]' : 'text-[#a38d6d]'
                        }`}
                      >
                        İlan: {conv.listingTitle || '—'}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card">
              {selectedConversation ? (
                <div className="space-y-1">
                  <p>
                    <strong>Senaryo:</strong> {selectedConversation.scriptTitle || '—'}
                  </p>
                  <p>
                    <strong>İlan:</strong> {selectedConversation.listingTitle || '—'}
                  </p>
                  <p>
                    <strong>Yapımcı:</strong> {selectedConversation.producerEmail || '—'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[#a38d6d]">
                  Sohbet detaylarını görmek için soldan bir konuşma seçin.
                </p>
              )}
            </div>

            <div className="card flex h-[70vh] flex-col">
              <div className="flex-1 space-y-2 overflow-y-auto">
                {!selectedConversationId ? (
                  <p className="text-sm text-[#a38d6d]">
                    Mesajları görmek için bir sohbet seçin.
                  </p>
                ) : messagesLoading ? (
                  <p className="text-sm text-[#a38d6d]">Mesajlar yükleniyor…</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-[#a38d6d]">
                    Henüz mesaj yok. İlk mesajı sen yaz.
                  </p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="rounded bg-[#faf3e0] p-2">
                      <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                      <p className="mt-1 text-[11px] text-[#a38d6d]">
                        {new Date(m.created_at).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="mt-3 space-y-2"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={!selectedConversationId}
                  className="h-24 w-full resize-none rounded-lg border border-[#eadcc3] p-2"
                  placeholder={
                    selectedConversationId
                      ? 'Mesaj yazın…'
                      : 'Önce soldan bir sohbet seçin.'
                  }
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!selectedConversationId || input.trim().length === 0}
                  >
                    Gönder
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
