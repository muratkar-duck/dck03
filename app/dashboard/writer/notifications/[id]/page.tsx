'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Row = {
  id: string;
  created_at: string;
  status: string;
  script?: { id: string; title: string } | null;
  listing?: { id: string; title: string | null } | null;
  producerEmail?: string | null;
};

export default function WriterNotificationDetailPage() {
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
            id,
            listing_id,
            request_id,
            producer_listing_id,
            writer_id,
            script_id,
            status,
            created_at,
            script:scripts ( id, title, genre, length, price_cents, created_at ),
            producer:users!applications_owner_id_fkey ( id, email )
          `
        )
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const scriptData = Array.isArray(data.script) ? data.script[0] : data.script;
        const producerData = Array.isArray(data.producer)
          ? data.producer[0]
          : data.producer;

        const listingId =
          data.producer_listing_id || data.listing_id || data.request_id;

        let listing: Row['listing'] = null;

        if (listingId) {
          const { data: listingData, error: listingError } = await supabase
            .from('v_listings_unified')
            .select('id, title')
            .eq('id', listingId)
            .maybeSingle();

          if (listingError) {
            console.error('İlan verisi yüklenemedi:', listingError.message);
          } else if (listingData) {
            listing = {
              id: String(listingData.id),
              title: listingData.title ?? null,
            };
          }
        }

        setRow({
          id: data.id,
          status: data.status,
          created_at: data.created_at,
          script: scriptData
            ? { id: String(scriptData.id), title: scriptData.title ?? '—' }
            : null,
          listing,
          producerEmail: producerData?.email ?? null,
        });
      }
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
    <AuthGuard allowedRoles={['writer']}>
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
              <strong>Yapımcı:</strong> {row.producerEmail || '—'}
            </p>
            <p>
              <strong>Senaryo:</strong> {row.script?.title || '—'}
            </p>
            <p>
              <strong>İlan:</strong> {row.listing?.title || '—'}
            </p>
            <p className="text-xs text-[#a38d6d]">
              {new Date(row.created_at).toLocaleString('tr-TR')} ·{' '}
              {getBadge(row.status)}
            </p>

            <div className="flex gap-2 pt-2">
              <Link
                href={`/dashboard/writer/messages?application=${row.id}`}
                className="btn btn-primary"
              >
                💬 Sohbeti Aç
              </Link>
              <Link
                href={
                  row.listing?.id
                    ? `/dashboard/writer/listings/${row.listing.id}`
                    : '/dashboard/writer/listings'
                }
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
