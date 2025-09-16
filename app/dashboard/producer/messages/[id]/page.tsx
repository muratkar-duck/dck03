'use client';

import { useEffect, useState, useRef } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type AppHeader = {
  id: string;
  created_at: string;
  status: string;
  script?: { id: string; title: string }[] | null;
  request?: { id: string; title: string }[] | null;
  writer?: { id: string; email: string | null }[] | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export default function ProducerMessageDetailPage() {
  const { id: applicationId } = useParams<{ id: string }>();
  const [header, setHeader] = useState<AppHeader | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // sayfa yüklenince: başlık + konversiyonu garantile + mesajları çek
  useEffect(() => {
    const init = async () => {
      if (!applicationId) return;

      // 1) Başlık bilgisi
      const { data: appRow } = await supabase
        .from('applications')
        .select(
          `
          id, created_at, status,
          script:scripts ( id, title ),
          request:requests ( id, title ),
          writer:users ( id, email )
        `
        )
        .eq('id', applicationId)
        .maybeSingle();
      setHeader(appRow as any);

      // 2) Conversation'ı oluştur/garantile (unique(application_id))
      const { data: conv } = await supabase
        .from('conversations')
        .upsert(
          { application_id: applicationId as string },
          { onConflict: 'application_id' }
        )
        .select('id')
        .maybeSingle();

      const convId = conv?.id as string | undefined;
      if (!convId) {
        setLoading(false);
        return;
      }
      setConversationId(convId);

      // 3) Mesajları çek
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });
      setMessages((msgs as Message[]) || []);
      setLoading(false);

      // 4) Realtime abonelik
      const channel = supabase
        .channel(`messages-conv-${convId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${convId}`,
          },
          (payload) => {
            const m = payload.new as Message;
            setMessages((prev) => [...prev, m]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    init();
  }, [applicationId]);

  // her mesaj eklemeden sonra alta kay
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async () => {
    if (!conversationId) return;
    const text = input.trim();
    if (!text) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id, // RLS: sender_id = auth.uid() şart
      body: text,
    });

    if (!error) setInput('');
  };

  return (
    <AuthGuard allowedRoles={['producer']}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">💬 Konuşma</h1>

        {/* Başlık */}
        <div className="card">
          {header ? (
            <>
              <p>
                <strong>Senaryo:</strong> {header.script?.[0]?.title || '—'}
              </p>
              <p>
                <strong>İlan:</strong> {header.request?.[0]?.title || '—'}
              </p>
              <p>
                <strong>Yazar:</strong> {header.writer?.[0]?.email || '—'}
              </p>
            </>
          ) : (
            <p className="text-sm text-[#a38d6d]">Başlık yükleniyor…</p>
          )}
        </div>

        {/* Mesajlar */}
        <div className="card max-h-[60vh] overflow-y-auto space-y-2">
          {loading ? (
            <p className="text-sm text-[#a38d6d]">Mesajlar yükleniyor…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-[#a38d6d]">
              Henüz mesaj yok. İlk mesajı sen yaz.
            </p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="p-2 rounded bg-[#faf3e0]">
                <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                <p className="text-[11px] text-[#a38d6d] mt-1">
                  {new Date(m.created_at).toLocaleString('tr-TR')}
                </p>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Giriş */}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 border rounded-lg"
            placeholder="Mesaj yazın…"
            rows={2}
          />
          <button onClick={sendMessage} className="btn btn-primary">
            Gönder
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
