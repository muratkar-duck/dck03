'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Row = {
  id: string;
  created_at: string;
  status: string;
  script?: { id: string; title: string }[] | null;
  request?: { id: string; title: string }[] | null;
  producer?: { id: string; email: string | null }[] | null;
};

export default function WriterNotificationsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // 🔔 Badge ile bire bir aynı mantık: ACCEPTED / REJECTED
    const { data, error } = await supabase
      .from('applications')
      .select(
        `
        id,
        created_at,
        status,
        script:scripts ( id, title ),
        request:requests ( id, title ),
        producer:users ( id, email )
      `
      )
      .eq('user_id', user.id)
      .in('status', ['accepted', 'rejected'])
      .order('created_at', { ascending: false });

    if (!error && data) setItems(data as Row[]);
    setLoading(false);
  };

  const getBadge = (status: string) => {
    if (status === 'accepted')
      return (
        <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded">
          Kabul
        </span>
      );
    if (status === 'rejected')
      return (
        <span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded">
          Red
        </span>
      );
    return (
      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
        Beklemede
      </span>
    );
  };

  return (
    <AuthGuard allowedRoles={['writer']}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">🔔 Bildirimler (Senarist)</h1>
        <p className="text-[#7a5c36]">
          Başvurularının <strong>kabul/red</strong> sonuçları.
        </p>

        {loading ? (
          <p className="text-sm text-[#a38d6d]">Yükleniyor…</p>
        ) : items.length === 0 ? (
          <div className="card">
            <p className="text-sm text-[#a38d6d]">Şimdilik bildirimin yok.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((r) => (
              <div
                key={r.id}
                className="card flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">
                    {r.producer?.[0]?.email || 'Yapımcı'} →{' '}
                    {r.script?.[0]?.title || '—'}
                  </p>
                  <p className="text-sm text-[#7a5c36]">
                    İlan: <strong>{r.request?.[0]?.title || '—'}</strong>
                  </p>
                  <p className="text-xs text-[#a38d6d]">
                    {new Date(r.created_at).toLocaleString('tr-TR')} ·{' '}
                    {getBadge(r.status)}
                  </p>
                </div>

                <div className="flex gap-2">
                  {r.status === 'accepted' ? (
                    <Link
                      href={`/dashboard/writer/messages/${r.id}`}
                      className="btn btn-primary"
                    >
                      💬 Sohbeti Aç
                    </Link>
                  ) : null}
                  <Link
                    href={`/dashboard/writer/requests/${
                      r.request?.[0]?.id || ''
                    }`}
                    className="btn btn-secondary"
                  >
                    İlana Git
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
