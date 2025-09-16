'use client';

import { useCallback, useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { useParams } from 'next/navigation';
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

export default function ProducerNotificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('applications')
        .select(
          `
        id, created_at, status,
        script:scripts ( id, title ),
        request:requests ( id, title ),
        writer:users ( id, email )
      `
        )
        .eq('id', id)
        .maybeSingle();

      if (!error) setRow(data as Row);
      setLoading(false);
    };

    load();
  }, [id]);
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
        <h1 className="text-2xl font-bold">🔔 Bildirim Detayı</h1>

        {loading ? (
          <p className="text-sm text-[#a38d6d]">Yükleniyor…</p>
        ) : !row ? (
          <div className="card">
            <p className="text-sm text-[#a38d6d]">Kayıt bulunamadı.</p>
          </div>
        ) : (
          <div className="card space-y-2">
            <p>
              <strong>Yazar:</strong> {row.writer?.[0]?.email || '—'}
            </p>
            <p>
              <strong>Senaryo:</strong> {row.script?.[0]?.title || '—'}
            </p>
            <p>
              <strong>İlan:</strong> {row.request?.[0]?.title || '—'}
            </p>
            <p className="text-xs text-[#a38d6d]">
              {new Date(row.created_at).toLocaleString('tr-TR')} ·{' '}
              {getBadge(row.status)}
            </p>

            <div className="flex gap-2 pt-2">
              <Link
                href={`/dashboard/producer/messages/${row.id}`}
                className="btn btn-primary"
              >
                💬 Sohbeti Aç
              </Link>
              <Link
                href={`/dashboard/producer/requests/${
                  row.request?.[0]?.id || ''
                }`}
                className="btn btn-secondary"
              >
                📄 İlana Git
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
