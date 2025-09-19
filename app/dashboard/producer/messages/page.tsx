'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabaseClient';

const POLL_INTERVAL = 3000;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  accepted: 'Kabul edildi',
  rejected: 'Reddedildi',
};

type ConversationRecord = {
  id: string;
  applicationId: string;
  scriptTitle: string;
  scriptId: string | null;
  listingTitle: string;
  listingId: string | null;
  writerEmail: string | null;
  writerId: string | null;
  status: string | null;
  createdAt: string;
  applicationCreatedAt: string | null;
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

const normalizeConversationParticipant = (row: any): ConversationRecord => {
  const conversation = toSingle(row.conversation);
  const application = toSingle(conversation?.application);
  const script = toSingle(application?.script);
  const listing = toSingle(application?.listing);
  const writer = toSingle(application?.writer);

  const applicationId = (application?.id || '') as string;

  return {
    id: (conversation?.id as string) ?? (row.conversation_id as string),
    applicationId,
    scriptTitle: (script?.title as string) ?? '—',
    scriptId: (script?.id as string) ?? null,
    listingTitle: (listing?.title as string) ?? '—',
    listingId: (listing?.id as string) ?? null,
    writerEmail: (writer?.email as string) ?? null,
    writerId: (writer?.id as string) ?? null,
    status: (application?.status as string) ?? null,
    createdAt: (conversation?.created_at as string) ?? (row.created_at as string),
    applicationCreatedAt: (application?.created_at as string) ?? null,
  };
};

export default function ProducerMessagesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const ensuredApplications = useRef<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  const setUrlConversation = useCallback(
    (conversationId: string | null) => {
      const currentConversation = searchParams.get('conversation');
      const currentApplication = searchParams.get('application');

      if (
        conversationId === currentConversation &&
        !currentApplication
      ) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());

      if (conversationId) {
        params.set('conversation', conversationId);
      } else {
        params.delete('conversation');
      }

      params.delete('application');

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCurrentUserId(null);
        setConversations([]);
        setLoadingConversations(false);
        return;
      }

      setCurrentUserId(user.id);

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
                status,
                created_at,
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
                  owner_id,
                  genre,
                  budget_cents,
                  created_at,
                  source
                ),
                writer:users!applications_writer_id_fkey!inner (
                  id,
                  email
                )
              )
            )
          `
        )
        .eq('user_id', user.id)
        .order('conversation(created_at)', { ascending: false });

      if (error) {
        console.error('Konuşmalar alınamadı:', error.message);
        setConversations([]);
      } else {
        const normalized = (data ?? []).map(normalizeConversationParticipant);
        setConversations(normalized);
      }
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const ensureParticipantsForConversation = useCallback(
    async (
      conversationId: string,
      applicationId: string,
      fallbackUserId: string | null
    ) => {
      try {
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
        if (application?.producer_id) participantIds.add(application.producer_id);
        if (application?.writer_id) participantIds.add(application.writer_id);

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
      } catch (error) {
        console.error('Konuşma katılımcıları oluşturma hatası:', error);
      }
    },
    []
  );

  const ensureConversationForApplication = useCallback(
    async (applicationId: string) => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .upsert(
            { application_id: applicationId },
            { onConflict: 'application_id' }
          )
          .select('id, application_id')
          .maybeSingle();

        if (error) {
          console.error('Konuşma oluşturulamadı:', error.message);
          return;
        }

        if (data?.id) {
          await ensureParticipantsForConversation(
            data.id,
            applicationId,
            currentUserId
          );
          setSelectedConversationId(data.id);
          setUrlConversation(data.id);
        }

        await fetchConversations();
      } catch (error) {
        console.error('Konuşma oluşturma hatası:', error);
      }
    },
    [
      currentUserId,
      ensureParticipantsForConversation,
      fetchConversations,
      setUrlConversation,
    ]
  );

  useEffect(() => {
    if (loadingConversations) return;

    const applicationParam = searchParams.get('application');
    if (!applicationParam) return;

    const exists = conversations.some(
      (conv) => conv.applicationId === applicationParam
    );

    if (exists || ensuredApplications.current.has(applicationParam)) {
      return;
    }

    ensuredApplications.current.add(applicationParam);
    void ensureConversationForApplication(applicationParam);
  }, [
    conversations,
    ensureConversationForApplication,
    loadingConversations,
    searchParams,
  ]);

  useEffect(() => {
    if (loadingConversations) return;

    if (conversations.length === 0) {
      setSelectedConversationId(null);
      return;
    }

    const conversationParam = searchParams.get('conversation');
    const applicationParam = searchParams.get('application');

    if (conversationParam) {
      const match = conversations.find((c) => c.id === conversationParam);
      if (match) {
        if (selectedConversationId !== match.id) {
          setSelectedConversationId(match.id);
        }
        return;
      }
    }

    if (applicationParam) {
      const matchByApp = conversations.find(
        (c) => c.applicationId === applicationParam
      );
      if (matchByApp) {
        if (selectedConversationId !== matchByApp.id) {
          setSelectedConversationId(matchByApp.id);
        }
        return;
      }
    }

    if (
      !selectedConversationId ||
      !conversations.some((c) => c.id === selectedConversationId)
    ) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [
    conversations,
    loadingConversations,
    searchParams,
    selectedConversationId,
  ]);

  useEffect(() => {
    if (loadingConversations) return;

    if (selectedConversationId) {
      setUrlConversation(selectedConversationId);
    } else {
      setUrlConversation(null);
    }
  }, [loadingConversations, selectedConversationId, setUrlConversation]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    if (!selectedConversationId) {
      setMessages([]);
      setLoadingMessages(false);
      return () => undefined;
    }

    setMessages([]);
    setLoadingMessages(true);

    const loadMessages = async (showSpinner: boolean) => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id, conversation_id, sender_id, body, created_at')
          .eq('conversation_id', selectedConversationId)
          .order('created_at', { ascending: true });

        if (!active) return;

        if (error) {
          console.error('Mesajlar alınamadı:', error.message);
          return;
        }

        setMessages(((data ?? []) as Message[]) || []);
      } finally {
        if (showSpinner && active) {
          setLoadingMessages(false);
        }
      }
    };

    void loadMessages(true);

    poll = setInterval(() => {
      void loadMessages(false);
    }, POLL_INTERVAL);

    channel = supabase
      .channel(`messages-conv-${selectedConversationId}`)
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
            if (prev.some((msg) => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      if (poll) clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [selectedConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = useCallback(async () => {
    if (!selectedConversationId) return;
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      let senderId = currentUserId;
      if (!senderId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        senderId = user?.id ?? null;
        if (senderId) {
          setCurrentUserId(senderId);
        }
      }

      if (!senderId) return;

      const { error } = await supabase.from('messages').insert({
        conversation_id: selectedConversationId,
        sender_id: senderId,
        body: text,
      });

      if (error) {
        console.error('Mesaj gönderilemedi:', error.message);
        return;
      }

      setInput('');
    } finally {
      setSending(false);
    }
  }, [currentUserId, input, selectedConversationId, sending]);

  const selectedConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === selectedConversationId) ||
      null,
    [conversations, selectedConversationId]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    if (selectedConversationId === conversationId) return;
    setSelectedConversationId(conversationId);
    setUrlConversation(conversationId);
  };

  return (
    <AuthGuard allowedRoles={['producer']}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">💬 Sohbetler</h1>
        <div className="flex flex-col gap-4 lg:flex-row">
          <aside className="lg:w-[320px] space-y-3">
            <div className="card space-y-3">
              <h2 className="text-lg font-semibold">Konuşmalar</h2>
              {loadingConversations ? (
                <p className="text-sm text-[#a38d6d]">Sohbetler yükleniyor…</p>
              ) : conversations.length === 0 ? (
                <p className="text-sm text-[#a38d6d]">Henüz sohbet yok.</p>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conversation) => {
                    const isActive = conversation.id === selectedConversationId;
                    const statusLabel = conversation.status
                      ? STATUS_LABELS[conversation.status] ?? conversation.status
                      : null;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => handleSelectConversation(conversation.id)}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                          isActive
                            ? 'border-[#ffaa06] bg-[#fff1cc] shadow-sm'
                            : 'border-transparent bg-[#fffaf0] hover:bg-[#fff1cc]'
                        }`}
                      >
                        <p className="font-semibold text-[#0e5b4a]">
                          {conversation.scriptTitle}
                        </p>
                        <p className="text-sm text-[#7a5c36]">
                          Yazar: {conversation.writerEmail || '—'}
                        </p>
                        <p className="text-sm text-[#7a5c36]">
                          İlan: {conversation.listingTitle || '—'}
                        </p>
                        {statusLabel && (
                          <p className="text-xs text-[#a38d6d]">Durum: {statusLabel}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="flex-1">
            {selectedConversation ? (
              <div className="card flex h-[70vh] flex-col">
                <div className="border-b border-[#f1e3c9] pb-3">
                  <h2 className="text-lg font-semibold text-[#0e5b4a]">
                    {selectedConversation.scriptTitle}
                  </h2>
                  <p className="text-sm text-[#7a5c36]">
                    Yazar: {selectedConversation.writerEmail || '—'} · İlan:{' '}
                    {selectedConversation.listingTitle || '—'}
                  </p>
                  {selectedConversation.applicationCreatedAt && (
                    <p className="text-xs text-[#a38d6d]">
                      Başvuru:{' '}
                      {new Date(
                        selectedConversation.applicationCreatedAt
                      ).toLocaleString('tr-TR')}
                      {selectedConversation.status && (
                        <>
                          {' '}
                          · {STATUS_LABELS[selectedConversation.status] ?? selectedConversation.status}
                        </>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto py-4 pr-1">
                  {loadingMessages ? (
                    <p className="text-sm text-[#a38d6d]">Mesajlar yükleniyor…</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-[#a38d6d]">
                      Henüz mesaj yok. İlk mesajı sen yaz.
                    </p>
                  ) : (
                    messages.map((message) => {
                      const isMine = message.sender_id === currentUserId;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            isMine ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                              isMine
                                ? 'bg-[#0e5b4a] text-white'
                                : 'bg-[#fff4da] text-[#0e5b4a]'
                            }`}
                          >
                            {message.body}
                            <div className="mt-1 text-right text-[11px] opacity-75">
                              {new Date(message.created_at).toLocaleString('tr-TR')}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="mt-4 border-t border-[#f1e3c9] pt-4">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!selectedConversationId}
                    className="w-full rounded-xl border border-[#f1e3c9] p-3 text-sm focus:border-[#ffaa06] focus:outline-none"
                    rows={3}
                    placeholder="Mesaj yazın…"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={
                        !selectedConversationId || sending || input.trim().length === 0
                      }
                      className={`btn btn-primary ${
                        !selectedConversationId || sending || input.trim().length === 0
                          ? 'opacity-60 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      Gönder
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card flex h-[70vh] items-center justify-center text-sm text-[#a38d6d]">
                {loadingConversations
                  ? 'Sohbetler yükleniyor…'
                  : 'Bir sohbet seçmek için sol taraftaki listeden seçim yapın.'}
              </div>
            )}
          </section>
        </div>
      </div>
    </AuthGuard>
  );
}
