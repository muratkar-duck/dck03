'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Link from 'next/link';

type NotificationItem = {
  notificationId: string;
  applicationId: string;
  created_at: string;
  status: string;
  script?: { id: string; title: string } | null;
  listing?: { id: string; title: string | null } | null;
  actorEmail?: string | null;
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

    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('id, created_at, payload, application_id, actor_id')
      .eq('user_id', user.id)
      .eq('event_type', 'application_decision')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Bildirimler yüklenemedi:', error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Array<any>;

    if (rows.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const applicationIds = Array.from(
      new Set(
        rows
          .map((row) => row.application_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    let applicationsMap = new Map<string, any>();

    if (applicationIds.length > 0) {
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications')
        .select(
          `
            id,
            status,
            script_id,
            producer_listing_id,
            listing_id,
            request_id,
            writer_id,
            producer_id,
            owner_id,
            script:scripts ( id, title )
          `
        )
        .in('id', applicationIds);

      if (applicationsError) {
        console.error('Başvuru verileri yüklenemedi:', applicationsError.message);
      } else {
        applicationsMap = new Map(
          (applicationsData ?? []).map((application: any) => [
            String(application.id),
            application,
          ])
        );
      }
    }

    const listingIds = Array.from(
      new Set(
        Array.from(applicationsMap.values())
          .map((application: any) =>
            application?.producer_listing_id ||
            application?.listing_id ||
            application?.request_id
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

    const actorIds = Array.from(
      new Set(
        rows
          .map((row) => row.actor_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    let actorMap = new Map<string, { id: string; email: string | null }>();

    if (actorIds.length > 0) {
      const { data: actorsData, error: actorsError } = await supabase
        .from('users')
        .select('id, email')
        .in('id', actorIds);

      if (actorsError) {
        console.error('Karar veren kullanıcı bilgisi alınamadı:', actorsError.message);
      } else {
        actorMap = new Map(
          (actorsData ?? []).map((actor: any) => [
            String(actor.id),
            { id: String(actor.id), email: actor.email ?? null },
          ])
        );
      }
    }

    const acceptedApplicationIds = Array.from(
      new Set(
        rows
          .filter((row) => {
            const payloadStatus = row?.payload?.status as string | undefined;
            const applicationStatus = applicationsMap.get(
              String(row.application_id)
            )?.status as string | undefined;

            return (payloadStatus ?? applicationStatus) === 'accepted';
          })
          .map((row) => row.application_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    let conversationMap = new Map<string, string>();

    if (acceptedApplicationIds.length > 0) {
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('id, application_id')
        .in('application_id', acceptedApplicationIds);

      if (conversationsError) {
        console.error('Sohbet bilgisi alınamadı:', conversationsError.message);
      } else {
        conversationMap = new Map(
          (conversationsData ?? []).map((conversation: any) => [
            String(conversation.application_id),
            String(conversation.id),
          ])
        );
      }
    }

    const normalized: NotificationItem[] = rows.map((row) => {
      const application = applicationsMap.get(String(row.application_id));
      const scriptData = application?.script;
      const scriptEntry = Array.isArray(scriptData) ? scriptData[0] : scriptData;
      const listingId = application
        ? application.producer_listing_id ||
          application.listing_id ||
          application.request_id
        : null;
      const applicationId = row.application_id
        ? String(row.application_id)
        : String(row.id);

      return {
        notificationId: String(row.id),
        applicationId,
        status:
          (row?.payload?.status as string | undefined) ??
          (application?.status as string | undefined) ??
          'pending',
        created_at: row.created_at,
        script: scriptEntry
          ? { id: String(scriptEntry.id), title: scriptEntry.title ?? '—' }
          : null,
        listing: listingId ? listingsMap.get(String(listingId)) ?? null : null,
        actorEmail: row.actor_id
          ? actorMap.get(String(row.actor_id))?.email ?? null
          : null,
        conversationId: conversationMap.get(applicationId) ?? null,
        conversationError: false,
      };
    });

    setItems(normalized);
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
                key={r.notificationId}
                className="card flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">
                    {r.actorEmail || 'Yapımcı'} →{' '}
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
                        href={`/dashboard/writer/notifications/${r.applicationId}`}
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
