'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabaseClient';
import type { Listing } from '@/types/db';

type ApplicationRow = {
  id: string;
  status: string;
  created_at: string;
  script: {
    id: string;
    title: string | null;
    genre: string | null;
    length: number | null;
    price_cents: number | null;
  } | null;
  writer: {
    id: string;
    email: string | null;
  } | null;
};

const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
});

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
});

const dateTimeFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const budgetLabel = (budgetCents: number | null | undefined) => {
  if (typeof budgetCents === 'number') {
    return currencyFormatter.format(budgetCents / 100);
  }
  return 'Belirtilmemiş';
};

export default function ProducerListingDetailPage() {
  const { id: listingId } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!listingId) return;

    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      setApplications([]);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw new Error(authError.message);
        }

        if (!user) {
          throw new Error('Giriş yapmanız gerekiyor.');
        }

        const { data: listingData, error: listingError } = await supabase
          .from('v_listings_unified')
          .select(
            'id, owner_id, title, description, genre, budget_cents, created_at, source'
          )
          .eq('id', listingId)
          .maybeSingle();

        if (listingError) {
          throw new Error(listingError.message);
        }

        if (!listingData) {
          throw new Error('İlan bulunamadı.');
        }

        if (listingData.owner_id !== user.id) {
          throw new Error('Bu ilana erişim yetkiniz yok.');
        }

        if (!isMounted) return;

        setListing(listingData as Listing);

        const { data: applicationRows, error: applicationsError } = await supabase
          .from('applications')
          .select(`
            id,
            owner_id,
            status,
            created_at,
            script:scripts ( id, title, genre, length, price_cents, created_at ),
            writer:users ( id, email )
          `)
          .eq('owner_id', user.id)
          .or(
            `producer_listing_id.eq.${listingId},listing_id.eq.${listingId},request_id.eq.${listingId}`
          )
          .order('created_at', { ascending: false });

        if (applicationsError) {
          setError(applicationsError.message);
          setApplications([]);
          return;
        }

        const formatted = (applicationRows ?? []).map((row: any) => {
          const scriptData = Array.isArray(row.script) ? row.script[0] : row.script;
          const writerData = Array.isArray(row.writer) ? row.writer[0] : row.writer;

          return {
            id: row.id as string,
            status: row.status as string,
            created_at: row.created_at as string,
            script: scriptData
              ? {
                  id: String(scriptData.id),
                  title: scriptData.title ?? null,
                  genre: scriptData.genre ?? null,
                  length:
                    typeof scriptData.length === 'number'
                      ? scriptData.length
                      : scriptData.length != null
                      ? Number(scriptData.length)
                      : null,
                  price_cents:
                    typeof scriptData.price_cents === 'number'
                      ? scriptData.price_cents
                      : scriptData.price_cents != null
                      ? Number(scriptData.price_cents)
                      : null,
                }
              : null,
            writer: writerData
              ? {
                  id: String(writerData.id),
                  email: writerData.email ?? null,
                }
              : null,
          };
        });

        if (!isMounted) return;
        setApplications(formatted);
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Veriler alınırken beklenmeyen bir hata oluştu.';
        setError(message);
        setListing(null);
        setApplications([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [listingId]);

  const handleDecision = async (
    applicationId: string,
    decision: 'accepted' | 'rejected'
  ) => {
    setUpdatingId(applicationId);

    const { error: updateError } = await supabase
      .from('applications')
      .update({ status: decision })
      .eq('id', applicationId);

    if (updateError) {
      console.error(updateError);
      alert('❌ Güncelleme hatası: ' + updateError.message);
      setUpdatingId(null);
      return;
    }

    if (decision === 'accepted') {
      const { error: upsertError } = await supabase
        .from('conversations')
        .upsert(
          { application_id: applicationId },
          { onConflict: 'application_id' }
        );

      if (upsertError) {
        console.error(upsertError);
        alert('❌ Sohbet başlatma hatası: ' + upsertError.message);
      }
    }

    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId ? { ...app, status: decision } : app
      )
    );

    setUpdatingId(null);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'accepted') {
      return (
        <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
          Kabul edildi
        </span>
      );
    }

    if (status === 'rejected') {
      return (
        <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
          Reddedildi
        </span>
      );
    }

    return (
      <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-700">
        Beklemede
      </span>
    );
  };

  const formatPrice = (priceCents: number | null | undefined) => {
    if (priceCents == null) {
      return '—';
    }

    return currencyFormatter.format(priceCents / 100);
  };

  return (
    <AuthGuard allowedRoles={['producer']}>
      <div className="space-y-6">
        {loading ? (
          <p className="text-sm text-[#7a5c36]">Yükleniyor...</p>
        ) : !listing ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error ?? 'İlan bulunamadı.'}
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-[#0e5b4a]">{listing.title}</h1>
              <p className="text-sm text-[#7a5c36]">
                Tür: {listing.genre} · Bütçe: {budgetLabel(listing.budget_cents)}
              </p>
              <p className="text-xs text-[#a38d6d]">
                Oluşturulma tarihi: {dateFormatter.format(new Date(listing.created_at))}
              </p>
              <p className="text-sm text-[#4f3d2a] whitespace-pre-wrap">
                {listing.description || 'Açıklama bulunamadı.'}
              </p>
            </div>

            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-[#0e5b4a]">
                  📩 Başvurular
                </h2>
                <p className="text-sm text-[#7a5c36]">
                  İlanınıza gönderilen senaryoları buradan inceleyebilir ve karar verebilirsiniz.
                </p>
              </div>

              {applications.length === 0 ? (
                <p className="text-sm text-[#7a5c36]">
                  Henüz bu ilana yapılmış bir başvuru bulunmuyor.
                </p>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="space-y-3 rounded-lg border bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold text-[#0e5b4a]">
                            {app.script?.title ?? 'Senaryo başlığı bulunamadı'}
                          </h3>
                          <p className="text-sm text-[#7a5c36]">
                            Yazar: {app.writer?.email ?? 'Bilinmiyor'}
                          </p>
                          <p className="text-sm text-[#7a5c36]">
                            Tür: {app.script?.genre ?? '—'} · Süre: {app.script?.length ?? '—'} · Fiyat: {formatPrice(app.script?.price_cents)}
                          </p>
                          <p className="text-xs text-[#a38d6d]">
                            Başvuru tarihi: {dateTimeFormatter.format(new Date(app.created_at))}
                          </p>
                        </div>
                        {getStatusBadge(app.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {app.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDecision(app.id, 'accepted')}
                              disabled={updatingId === app.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              ✅ Kabul Et
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDecision(app.id, 'rejected')}
                              disabled={updatingId === app.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              ❌ Reddet
                            </button>
                          </>
                        ) : (
                          <p className="text-sm text-[#4f3d2a]">
                            Bu başvuru için karar verdiniz.
                          </p>
                        )}

                        {app.script?.id && (
                          <Link
                            href={`/dashboard/producer/scripts/${app.script.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#0e5b4a] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0b4638]"
                          >
                            📄 Senaryo Detayı
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AuthGuard>
  );
}
