'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Application = {
  id: string;
  status: string;
  created_at: string;
  listing?: {
    id: string;
    title: string | null;
    source?: string | null;
  } | null;
  scripts: {
    title: string;
  };
  producerEmail?: string | null;
};

export default function WriterSuggestionHistoryPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from('applications')
      .select(
        `
          id,
          request_id,
          listing_id,
          writer_id,
          script_id,
          status,
          created_at,
          scripts!inner (
            id,
            title,
            genre,
            length,
            price_cents,
            created_at
          ),
          producer:users!applications_owner_id_fkey (
            email
          )
        `
      )
      .eq('writer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Başvurular çekilirken hata:', error.message);
    } else {
      const rows = ((data ?? []) as unknown) as Array<any>;

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

      let listingsMap = new Map<string, { id: string; title: string | null; source?: string | null }>();

      if (listingIds.length > 0) {
        const { data: listingsData, error: listingsError } = await supabase
          .from('v_listings_unified')
          .select('id, title, source')
          .in('id', listingIds);

        if (listingsError) {
          console.error('İlan bilgileri yüklenemedi:', listingsError.message);
        } else {
          listingsMap = new Map(
            (listingsData ?? []).map((listing: any) => [
              String(listing.id),
              {
                id: String(listing.id),
                title: listing.title ?? null,
                source: listing.source ?? null,
              },
            ])
          );
        }
      }

      const normalized: Application[] = rows.map((row) => {
        const listingId =
          row.producer_listing_id || row.listing_id || row.request_id;

        const producerData = Array.isArray(row.producer)
          ? row.producer[0]
          : row.producer;
        const scriptData = Array.isArray(row.scripts)
          ? row.scripts[0]
          : row.scripts;

        return {
          id: row.id,
          status: row.status,
          created_at: row.created_at,
          listing: listingId ? listingsMap.get(String(listingId)) ?? null : null,
          scripts: scriptData || { title: '—' },
          producerEmail: producerData?.email ?? null,
        };
      });

      setApplications(normalized);
    }

    setLoading(false);
  };

  const getBadge = (status: string) => {
    if (status === 'accepted')
      return (
        <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded">
          Kabul Edildi
        </span>
      );
    if (status === 'rejected')
      return (
        <span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded">
          Reddedildi
        </span>
      );
    return (
      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
        Beklemede
      </span>
    );
  };

  if (loading) {
    return (
      <AuthGuard allowedRoles={['writer']}>
        <p className="text-sm text-[#a38d6d]">Yükleniyor...</p>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles={['writer']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">📤 Gönderdiğim Öneriler</h1>
        <p className="text-[#7a5c36]">
          Yapımcılara gönderdiğin önerileri ve durumlarını aşağıda görebilirsin.
        </p>

        {applications.length === 0 ? (
          <p className="text-sm text-[#a38d6d]">
            Henüz gönderdiğin bir öneri yok.
          </p>
        ) : (
          applications.map((a) => (
            <div className="card" key={a.id}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-lg font-semibold">
                    {a.scripts?.title || 'Bilinmeyen Senaryo'}
                  </h2>
                  <p className="text-sm text-[#7a5c36]">
                    İlan: <strong>{a.listing?.title || '-'}</strong> <br />
                    Yapımcı: {a.producerEmail || '-'}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <span className="block text-xs text-[#a38d6d]">
                    {new Date(a.created_at).toLocaleDateString('tr-TR')}
                  </span>
                  {getBadge(a.status)}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <Link
                  href={
                    a.listing?.id
                      ? `/dashboard/writer/listings/${a.listing.id}`
                      : '/dashboard/writer/listings'
                  }
                >
                  <span className="btn btn-secondary">İlana Git</span>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </AuthGuard>
  );
}
