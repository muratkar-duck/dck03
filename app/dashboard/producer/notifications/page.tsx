'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Link from 'next/link';

type Row = {
  id: string;
  created_at: string;
  status: string;
  script?: { id: string; title: string } | null;
  listing?: { id: string; title: string | null } | null;
  writerEmail?: string | null;
  conversationId?: string | null;
  conversationError?: boolean;
};

export default function ProducerNotificationsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(getSupabaseClient, []);

  const load = useCallback(async () => {
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
          producer_listing_id,
          writer_id,
          producer_id,
          owner_id,
          script_id,
          status,
          created_at,
          script:scripts ( id, title, genre, length, price_cents, created_at ),
          writer:users!applications_writer_id_fkey ( id, email )
        `
      )
      .or(`producer_id.eq.${user.id},owner_id.eq.${user.id}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const rows = data as Array<any>;

      const listingIds = Array.from(
        new Set(
          rows
            .map(
              (row) =>
                row.producer_listing_id || row.listing_id || row.request_id
            )
            .filter((value): value is string => Boolean(value))
        )
      );

      let listingsMap = new Map<string, { id: string; title: string | null }>();

      if (listingIds.length > 0) {
        const { data: listingsData, error: listingsError } = await supabase
          .from('v_listings_unified')
          .select('id, title')
          .in('id', listingIds);

        if (listingsError) {
          console.error('İlan başlığı yüklenemedi:', listingsError.message);
        } else {
          listingsMap = new Map(
            (listingsData ?? []).map((listing: any) => [
              String(listing.id),
              { id: String(listing.id), title: listing.title ?? null },
            ])
          );
        }
      }

      const normalized: Row[] = rows.map((row) => {
        const listingId =
          row.producer_listing_id || row.listing_id || row.request_id;
        const scriptData = Array.isArray(row.script) ? row.script[0] : row.script;
        const writerData = Array.isArray(row.writer) ? row.writer[0] : row.writer;

        return {
          id: row.id,
          status: row.status,
          created_at: row.created_at,
          script: scriptData
            ? { id: String(scriptData.id), title: scriptData.title ?? '—' }
            : null,
          listing: listingId ? listingsMap.get(String(listingId)) ?? null : null,
          writerEmail: writerData?.email ?? null,
        };
      });

      const ensured = await Promise.all(
        normalized.map(async (item) => {
          const { data: conversation, error: conversationError } = await supabase
            .from('conversations')
            .upsert(
              { application_id: item.id },
              { onConflict: 'application_id' }
            )
            .select('id')
            .maybeSingle();

          if (conversationError || !conversation?.id) {
            if (conversationError) {
              console.error(
                'Konuşma oluşturulamadı:',
                conversationError.message
              );
            }

            return { conversationId: null, conversationError: true };
          }

          return { conversationId: conversation.id, conversationError: false };
        })
      );

      const withConversations = normalized.map((item, index) => ({
        ...item,
        conversationId: ensured[index]?.conversationId ?? null,
        conversationError: ensured[index]?.conversationError ?? false,
      }));

      setItems(withConversations);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

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
        {items.length > 0 && (
          <p className="text-[#7a5c36]">
            İlanlarınıza gelen <strong>bekleyen</strong> başvurular.
          </p>
        )}

        {loading ? (
          <p className="text-sm text-[#a38d6d]">Yükleniyor…</p>
        ) : items.length === 0 ? (
          <div className="card">
            <p className="text-sm text-[#a38d6d]">
              Şu anda <strong>bekleyen</strong> başvurunuz bulunmuyor.
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-test-id="producer-notifications">
            {items.map((r) => (
              <div
                key={r.id}
                className="card flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">
                    {r.writerEmail || 'Yazar'} başvurdu:{' '}
                    {r.script?.title || '—'}
                  </p>
                  <p className="text-sm text-[#7a5c36]">
                    İlan: <strong>{r.listing?.title || '—'}</strong>
                  </p>
                  <p className="text-xs text-[#a38d6d]">
                    {new Date(r.created_at).toLocaleString('tr-TR')} ·{' '}
                    {getBadge(r.status)}
                  </p>
                </div>

                <div className="flex gap-2">
                  {r.conversationId ? (
                    <Link
                      href={`/dashboard/producer/messages?c=${r.conversationId}`}
                      className="btn btn-primary"
                    >
                      💬 Sohbeti Aç
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/producer/notifications/${r.id}`}
                      className="btn btn-primary"
                    >
                      💬 Sohbeti Başlat
                    </Link>
                  )}
                  <Link
                    href={
                      r.listing?.id
                        ? `/dashboard/producer/listings/${r.listing.id}`
                        : '/dashboard/producer/listings'
                    }
                    className="btn btn-secondary"
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
