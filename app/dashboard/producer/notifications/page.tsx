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
  writer?: { id: string; email: string | null }[] | null;
};

export default function ProducerNotificationsPage() {
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

    // 🔔 Badge ile bire bir aynı mantık: sadece PENDING başvurular
    const { data, error } = await supabase
      .from('applications')
      .select(
        `
          id,
          request_id,
          listing_id,
          writer_id,
          producer_id,
          script_id,
          status,
          created_at,
          script:scripts ( id, title, genre, length, price_cents, created_at ),
          request:requests ( id, title, genre, length, created_at ),
          writer:users ( id, email )
        `
      )
      .eq('producer_id', user.id)
      .eq('status', 'pending')
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
    <AuthGuard allowedRoles={['producer']}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">🔔 Bildirimler (Yapımcı)</h1>
        <p className="text-[#7a5c36]">
          İlanlarınıza gelen <strong>bekleyen</strong> başvurular.
        </p>

        {loading ? (
          <p className="text-sm text-[#a38d6d]">Yükleniyor…</p>
        ) : items.length === 0 ? (
          <div className="card">
            <p className="text-sm text-[#a38d6d]">Şimdilik bildiriminiz yok.</p>
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
                    {r.writer?.[0]?.email || 'Yazar'} başvurdu:{' '}
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
                  {/* Pending → İlan detayına gidip Kabul/Red ver */}
                  <Link
                    href={`/dashboard/producer/requests/${
                      r.request?.[0]?.id || ''
                    }`}
                    className="btn btn-primary"
                  >
                    İlanı Aç (Kabul/Red)
                  </Link>
                  <Link
                    href={`/dashboard/producer/notifications/${r.id}`}
                    className="btn btn-secondary"
                  >
                    Detay
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
