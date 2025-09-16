'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Row = {
  id: string; // application id
  created_at: string;
  script?: { id: string; title: string }[] | null;
  request?: { id: string; title: string }[] | null;
  writer?: { id: string; email: string | null }[] | null;
};

export default function ProducerMessagesListPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const me = auth?.user;
    if (!me) return;

    // 💬 Sohbet = accepted başvurular
    const { data, error } = await supabase
      .from('applications')
      .select(
        `
        id, created_at,
        script:scripts ( id, title ),
        request:requests ( id, title ),
        writer:users ( id, email )
      `
      )
      .eq('producer_id', me.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (!error && data) setItems(data as Row[]);
    setLoading(false);
  };

  return (
    <AuthGuard allowedRoles={['producer']}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">💬 Sohbetler</h1>
        {loading ? (
          <p className="text-sm text-[#a38d6d]">Yükleniyor…</p>
        ) : items.length === 0 ? (
          <div className="card">
            <p className="text-sm text-[#a38d6d]">Henüz sohbet yok.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((r) => (
              <div
                key={r.id}
                className="card flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold">{r.script?.[0]?.title || '—'}</p>
                  <p className="text-sm text-[#7a5c36]">
                    Yazar: {r.writer?.[0]?.email || '—'} · İlan:{' '}
                    {r.request?.[0]?.title || '—'}
                  </p>
                </div>
                <Link
                  href={`/dashboard/producer/messages/${r.id}`}
                  className="btn btn-primary"
                >
                  Konuşmayı Aç
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
