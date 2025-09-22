'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Link from 'next/link';

type NotificationItem = {
  id: string;
  created_at: string;
  status: string;
  script?: { id: string; title: string } | null;
  listing?: { id: string; title: string | null } | null;
  producerEmail?: string | null;
  conversationId?: string | null;
  conversationError?: boolean;
};

export default function WriterNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(getSupabaseClient, []);

  const load = useCallback(async () => {
    if (!supabase) {
      setItems([]);
      setLoading(false);
      return;
    }

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
          listing_id,
          request_id,
          producer_listing_id,
          writer_id,
          script_id,
          status,
          created_at,
          script:scripts ( id, title, genre, length, price_cents, created_at ),
          producer:users!applications_producer_id_fkey ( id, email )
        `
      )
      .eq('writer_id', user.id)
      .in('status', ['accepted', 'rejected'])
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
          console.error('İlan verileri yüklenemedi:', listingsError.message);
        } else {
          listingsMap = new Map(
            (listingsData ?? []).map((listing: any) => [
              String(listing.id),
              { id: String(listing.id), title: listing.title ?? null },
            ])
          );
        }
      }

      const normalized: NotificationItem[] = rows.map((row) => {
        const listingId =
          row.producer_listing_id || row.listing_id || row.request_id;
        const scriptData = Array.isArray(row.script) ? row.script[0] : row.script;
        const producerData = Array.isArray(row.producer)
          ? row.producer[0]
          : row.producer;

        return {
          id: row.id,
          status: row.status,
          created_at: row.created_at,
          script: scriptData
            ? { id: String(scriptData.id), title: scriptData.title ?? '—' }
            : null,
          listing: listingId ? listingsMap.get(String(listingId)) ?? null : null,
          producerEmail: producerData?.email ?? null,
        };
      });

      const ensured = await Promise.all(
        normalized.map(async (item) => {
          if (item.status !== 'accepted') {
            return { conversationId: null, conversationError: false };
          }

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
                    {r.producerEmail || 'Yapımcı'} →{' '}
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
                  {r.status === 'accepted' ? (
                    r.conversationId ? (
                      <Link
                        href={`/dashboard/writer/messages?c=${r.conversationId}`}
                        className="btn btn-primary"
                      >
                        💬 Sohbeti Aç
                      </Link>
                    ) : (
                      <Link
                        href={`/dashboard/writer/notifications/${r.id}`}
                        className="btn btn-primary"
                      >
                        💬 Sohbeti Başlat
                      </Link>
                    )
                  ) : null}
                  <Link
                    href={
                      r.listing?.id
                        ? `/dashboard/writer/listings/${r.listing.id}`
                        : '/dashboard/writer/listings'
                    }
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
