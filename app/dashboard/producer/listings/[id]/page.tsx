'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { VListingUnified } from '@/types/supabase';

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

type DecisionFeedback = {
  type: 'success' | 'warning' | 'error';
  message: string;
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

const budgetLabel = (budget: number | null | undefined) => {
  if (typeof budget === 'number') {
    return currencyFormatter.format(budget);
  }
  return 'Belirtilmemiş';
};

const normalizeListing = (row: any): VListingUnified => {
  const rawBudget = row?.budget;
  const normalizedBudget =
    typeof rawBudget === 'number'
      ? rawBudget
      : rawBudget != null && !Number.isNaN(Number(rawBudget))
      ? Number(rawBudget)
      : null;

  const rawSource = typeof row?.source === 'string' ? row.source.toLowerCase() : null;
  const normalizedSource = rawSource === 'request' ? 'request' : 'producer';

  return {
    id: row?.id != null ? String(row.id) : '',
    owner_id: row?.owner_id != null ? String(row.owner_id) : null,
    title: row?.title != null ? String(row.title) : '',
    description: row?.description != null ? String(row.description) : null,
    genre: row?.genre != null ? String(row.genre) : null,
    budget: normalizedBudget,
    created_at:
      row?.created_at != null ? String(row.created_at) : new Date().toISOString(),
    deadline: row?.deadline != null ? String(row.deadline) : null,
    status:
      typeof row?.status === 'string' && row.status.trim() !== ''
        ? row.status
        : null,
    source: normalizedSource,
  };
};

export default function ProducerListingDetailPage() {
  const { id: listingId } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<VListingUnified | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [purchaseTarget, setPurchaseTarget] = useState<ApplicationRow | null>(
    null
  );
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [decisionFeedback, setDecisionFeedback] = useState<DecisionFeedback | null>(
    null
  );
  const supabase = useMemo(getSupabaseClient, []);

  useEffect(() => {
    if (!listingId) return;

    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      setApplications([]);

      if (!supabase) {
        setError('Supabase istemcisi kullanılamıyor.');
        setLoading(false);
        return;
      }

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

        setCurrentUserId(user.id);

        const { data: listingData, error: listingError } = await supabase
          .from('v_listings_unified')
          .select(
            'id, owner_id, title, description, genre, budget, created_at, deadline, source'
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

        setListing(normalizeListing(listingData));

        const { data: applicationRows, error: applicationsError } = await supabase
          .from('applications')
          .select(`
            id,
            owner_id,
            status,
            created_at,
            script:scripts ( id, title, genre, length, price_cents, created_at ),
            writer:users!applications_writer_id_fkey ( id, email )
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
  }, [listingId, supabase]);

  const handleDecision = async (
    applicationId: string,
    decision: 'accepted' | 'rejected'
  ) => {
    setUpdatingId(applicationId);
    setDecisionFeedback(null);

    if (!supabase) {
      alert('Supabase istemcisi kullanılamıyor.');
      setUpdatingId(null);
      return;
    }

    const { data: updatedApplication, error: updateError } = await supabase.rpc(
      'mark_application_status',
      {
        p_application_id: applicationId,
        p_status: decision,
      }
    );

    if (updateError) {
      console.error(updateError);
      const message = `❌ Başvuru durumu güncellenemedi: ${updateError.message}`;
      setDecisionFeedback({ type: 'error', message });
      alert(message);
      setUpdatingId(null);
      return;
    }

    let conversationId: string | null = null;
    const updatedStatus =
      (updatedApplication as { status?: string } | null)?.status ?? decision;

    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId ? { ...app, status: updatedStatus } : app
      )
    );

    let conversationError: string | null = null;

    if (decision === 'accepted') {
      const { data: ensuredConversationId, error: ensureError } =
        await supabase.rpc('ensure_conversation_for_application', {
          p_application_id: applicationId,
        });

      if (ensureError) {
        console.error(ensureError);
        conversationError = ensureError.message;
      } else if (!ensuredConversationId) {
        conversationError = 'Sohbet oluşturulamadı.';
      } else {
        conversationId = String(ensuredConversationId);
      }
    }

    setUpdatingId(null);

    if (conversationError) {
      const message = `⚠️ Başvuru kabul edildi ancak sohbet açılamadı: ${conversationError}`;
      setDecisionFeedback({ type: 'warning', message });
      alert(message);
    } else {
      const message =
        decision === 'accepted'
          ? '✅ Başvuru kabul edildi'
          : '❌ Başvuru reddedildi';
      setDecisionFeedback({
        type: decision === 'accepted' ? 'success' : 'warning',
        message,
      });
      alert(message);
    }

    if (decision === 'accepted' && conversationId) {
      try {
        await router.push(`/dashboard/producer/messages?c=${conversationId}`);
        return;
      } catch (navigationError) {
        console.error('Failed to navigate to conversation view:', navigationError);
      }
    }
  };

  const handlePurchase = async (application: ApplicationRow) => {
    if (!application.script?.id) {
      alert('Satın alma işlemi için senaryo bilgisi bulunamadı.');
      return;
    }

    if (!supabase) {
      alert('Supabase istemcisi kullanılamıyor.');
      return;
    }

    setDecisionFeedback(null);

    let buyerId = currentUserId;

    if (!buyerId) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        alert('❌ Oturum doğrulanamadı: ' + authError.message);
        return;
      }

      if (!user) {
        alert('❌ Oturum bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }

      buyerId = user.id;
      setCurrentUserId(user.id);
    }

    setPurchasingId(application.id);

    const { error: orderError } = await supabase.from('orders').insert({
      script_id: application.script.id,
      buyer_id: buyerId,
      amount_cents: application.script.price_cents ?? 0,
    });

    if (orderError) {
      console.error(orderError);
      alert('❌ Satın alma işlemi tamamlanamadı: ' + orderError.message);
      setPurchasingId(null);
      return;
    }

    const { data: updatedApplication, error: updateError } = await supabase.rpc(
      'mark_application_status',
      {
        p_application_id: application.id,
        p_status: 'purchased',
      }
    );

    if (updateError) {
      console.error(updateError);
      const message =
        '⚠️ Satın alma kaydedildi ancak başvuru güncellenemedi: ' +
        updateError.message;
      setDecisionFeedback({ type: 'warning', message });
      alert(message);
      setPurchasingId(null);
      return;
    }

    setApplications((prev) =>
      prev.map((app) =>
        app.id === application.id
          ? {
              ...app,
              status:
                (updatedApplication as { status?: string } | null)?.status ??
                'purchased',
            }
          : app
      )
    );

    setPurchasingId(null);
    setPurchaseTarget(null);
    const message = '🧾 Satın alma işlemi başarıyla tamamlandı.';
    setDecisionFeedback({ type: 'success', message });
    alert(message);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'accepted') {
      return (
        <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
          Kabul edildi
        </span>
      );
    }

    if (status === 'purchased') {
      return (
        <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
          Satın alındı
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
            {decisionFeedback && (
              <div
                className={`rounded-lg border p-4 text-sm ${
                  decisionFeedback.type === 'success'
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : decisionFeedback.type === 'warning'
                    ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {decisionFeedback.message}
              </div>
            )}

            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-[#0e5b4a]">{listing.title}</h1>
              <p className="text-sm text-[#7a5c36]">
                Tür: {listing.genre} · Bütçe: {budgetLabel(listing.budget)}
              </p>
              <p className="text-xs text-[#a38d6d]">
                Oluşturulma tarihi: {dateFormatter.format(new Date(listing.created_at))}
              </p>
              <p className="text-xs text-[#a38d6d]">
                Son teslim tarihi:{' '}
                {listing.deadline
                  ? dateTimeFormatter.format(new Date(listing.deadline))
                  : 'Belirtilmemiş'}
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
                        ) : null}

                        {app.status !== 'pending' ? (
                          <p className="text-sm text-[#4f3d2a]">
                            Bu başvuru için karar verdiniz.
                          </p>
                        ) : null}

                        {app.status === 'accepted' ? (
                          <button
                            type="button"
                            onClick={() => setPurchaseTarget(app)}
                            disabled={purchasingId === app.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            🛒 Satın Al
                          </button>
                        ) : null}

                        {app.status === 'purchased' ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg bg-[#0e5b4a] px-3 py-2 text-sm font-semibold text-white opacity-80"
                          >
                            📄 PDF indir
                          </button>
                        ) : null}

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

      {purchaseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-xl">
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold text-[#0e5b4a]">
                Satın alma işlemini onaylayın
              </h3>
              <p className="text-sm text-[#4f3d2a]">
                {purchaseTarget.script?.title ?? 'Belirsiz senaryo'} için satın alma işlemini başlatmak üzeresiniz.
              </p>
              <p className="text-xs text-[#7a5c36]">
                Tahmini ücret: {formatPrice(purchaseTarget.script?.price_cents)}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPurchaseTarget(null)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#a38d6d] px-3 py-2 text-sm font-semibold text-[#4f3d2a] transition hover:bg-[#f5ede1]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => handlePurchase(purchaseTarget)}
                disabled={purchasingId === purchaseTarget.id}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Satın almayı tamamla
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
