'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { ensureConversationWithParticipants } from '@/lib/conversations';
import { getSupabaseClient } from '@/lib/supabaseClient';

type ApplicationRow = {
  application_id: string;
  status: string;
  created_at: string;
  listing_id: string;
  listing_title: string;
  listing_source: string | null;
  script_id: string;
  script_title: string;
  writer_email: string | null;
  length: number | null;
  price_cents: number | null;
  conversation_id: string | null;
};

type MaybeArray<T> = T | T[] | null | undefined;

type ScriptMetadata = {
  id?: unknown;
  title?: unknown;
  length?: unknown;
  price_cents?: unknown;
  writer_email?: unknown;
} | null;

type SupabaseApplicationRow = {
  id: string;
  status: string;
  created_at: string;
  listing_id: string | null;
  producer_listing_id: string | null;
  request_id: string | null;
  owner_id: string | null;
  producer_id: string | null;
  script_id: string | null;
  script_metadata: ScriptMetadata;
  writer: MaybeArray<{ id: string; email: string | null }>;
  listing: MaybeArray<{ id: string; title: string | null; source: string | null }>;
  conversations: MaybeArray<{ id: string }>;
};

type IdFilter = 'all' | 'listing' | 'producer_listing' | 'request';
type Decision = 'accepted' | 'rejected' | 'on_hold' | 'purchased';

const PAGE_SIZE = 10;

export default function ProducerApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [idFilterType, setIdFilterType] = useState<IdFilter>('all');
  const [idFilterValue, setIdFilterValue] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const supabase = useMemo(getSupabaseClient, []);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    if (!supabase) {
      setApplications([]);
      setTotalCount(0);
      setFetchError('Supabase istemcisi kullanılamıyor.');
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setApplications([]);
      setTotalCount(0);
      setFetchError('Oturum doğrulanamadı. Lütfen tekrar giriş yapın.');
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const rangeStart = (currentPage - 1) * PAGE_SIZE;
    const rangeEnd = rangeStart + PAGE_SIZE - 1;

    const trimmedFilterValue = idFilterValue.trim();

    let query = supabase
      .from('applications')
      .select(`
        id,
        status,
        created_at,
        listing_id,
        producer_listing_id,
        request_id,
        owner_id,
        producer_id,
        script_id,
        script_metadata,
        listing:v_listings_unified!inner(id, title, owner_id, source),
        writer:users!applications_writer_id_fkey(id, email),
        conversations(id)
      `, { count: 'exact' })
      .or(`owner_id.eq.${user.id},producer_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .range(rangeStart, rangeEnd);

    if (trimmedFilterValue.length > 0) {
      if (idFilterType === 'all') {
        query = query.or(
          `listing_id.eq.${trimmedFilterValue},producer_listing_id.eq.${trimmedFilterValue},request_id.eq.${trimmedFilterValue}`
        );
      } else if (idFilterType === 'listing') {
        query = query.eq('listing_id', trimmedFilterValue);
      } else if (idFilterType === 'producer_listing') {
        query = query.eq('producer_listing_id', trimmedFilterValue);
      } else if (idFilterType === 'request') {
        query = query.eq('request_id', trimmedFilterValue);
      }
    }

    const { data, error, count } = (await query) as {
      data: SupabaseApplicationRow[] | null;
      error: { message: string } | null;
      count: number | null;
    };

    if (error) {
      console.error('Başvurular alınamadı:', error.message);
      setApplications([]);
      setTotalCount(0);
      setFetchError('Başvurular yüklenemedi. Lütfen daha sonra tekrar deneyin.');
    } else {
      const takeFirst = <T,>(value: MaybeArray<T>): T | null => {
        if (Array.isArray(value)) {
          return value[0] ?? null;
        }

        return value ?? null;
      };

      const formatted = (data ?? []).map((item) => {
        const listing = takeFirst(item.listing);
        const writer = takeFirst(item.writer);
        const conversation = takeFirst(item.conversations);

        const scriptMetadata =
          item.script_metadata && typeof item.script_metadata === 'object'
            ? (item.script_metadata as ScriptMetadata)
            : null;

        const rawLength = scriptMetadata?.length ?? null;
        const normalizedLength =
          typeof rawLength === 'number'
            ? rawLength
            : rawLength != null && !Number.isNaN(Number(rawLength))
            ? Number(rawLength)
            : null;

        const rawPrice = scriptMetadata?.price_cents ?? null;
        const normalizedPrice =
          typeof rawPrice === 'number'
            ? rawPrice
            : rawPrice != null && !Number.isNaN(Number(rawPrice))
            ? Number(rawPrice)
            : null;

        const rawListingId =
          item.listing_id ??
          item.producer_listing_id ??
          item.request_id ??
          listing?.id ??
          null;
        const resolvedListingId =
          rawListingId != null ? String(rawListingId) : '';

        const rawScriptId = item.script_id ?? scriptMetadata?.id ?? null;
        const resolvedScriptId =
          rawScriptId != null ? String(rawScriptId) : '';

        const scriptTitle =
          scriptMetadata?.title != null
            ? String(scriptMetadata.title)
            : '';

        const listingTitle =
          listing?.title != null ? String(listing.title) : '';

        const applicationId =
          item.id != null ? String(item.id) : '';

        const status = item.status != null ? String(item.status) : '';

        const writerEmail =
          writer?.email != null
            ? String(writer.email)
            : scriptMetadata?.writer_email != null
            ? String(scriptMetadata.writer_email)
            : null;

        return {
          application_id: applicationId,
          status,
          created_at: item.created_at,
          listing_id: resolvedListingId,
          listing_title: listingTitle,
          listing_source:
            listing?.source != null ? String(listing.source) : null,
          script_id: resolvedScriptId,
          script_title: scriptTitle,
          writer_email: writerEmail,
          length: normalizedLength,
          price_cents: normalizedPrice,
          conversation_id: conversation?.id ?? null,
        } as ApplicationRow;
      });
      setApplications(formatted);
      const resolvedCount = count ?? 0;
      setTotalCount(resolvedCount);

      if (typeof count === 'number') {
        const newTotalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
        if (currentPage > newTotalPages) {
          setCurrentPage(newTotalPages);
          setLoading(false);
          return;
        }
      }
      setFetchError(null);
    }

    setLoading(false);
  }, [currentPage, idFilterType, idFilterValue, supabase]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const resetToFirstPage = () => {
    setCurrentPage(1);
  };

  const formatPrice = (priceCents: number | null) => {
    if (priceCents == null) {
      return '—';
    }

    return (priceCents / 100).toLocaleString('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    });
  };

  const handleDecision = async (applicationId: string, decision: Decision) => {
    if (!supabase) {
      alert('Supabase istemcisi kullanılamıyor.');
      return;
    }

    const { error: updateError } = await supabase
      .from('applications')
      .update({ status: decision })
      .eq('id', applicationId);

    if (updateError) {
      alert('❌ Güncelleme hatası: ' + updateError.message);
      return;
    }

    let conversationError: string | null = null;

    let conversationId: string | null = null;

    let actingUserId = currentUserId;

    if (decision === 'accepted') {
      if (!actingUserId) {
        const {
          data: { user: freshUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          alert('❌ Oturum doğrulanamadı: ' + authError.message);
          return;
        }

        if (!freshUser) {
          alert('❌ Oturum doğrulanamadı. Lütfen tekrar giriş yapın.');
          return;
        }

        actingUserId = freshUser.id;
        setCurrentUserId(freshUser.id);
      }
    }

    if (decision === 'accepted' && actingUserId) {
      const { conversationId: ensuredConversationId, error } =
        await ensureConversationWithParticipants(
          supabase,
          applicationId,
          actingUserId
        );
      conversationError = error;
      conversationId = ensuredConversationId;
    }

    const successMessageMap: Record<Decision, string> = {
      accepted: '✅ Başvuru kabul edildi',
      rejected: '❌ Başvuru reddedildi',
      on_hold: '⏳ Başvuru beklemeye alındı',
      purchased: '🛒 Başvuru satın alma aşamasında işaretlendi',
    };

    if (conversationError) {
      alert(`⚠️ Başvuru güncellendi ancak sohbet açılamadı: ${conversationError}`);
    } else {
      alert(successMessageMap[decision]);
    }

    if (decision === 'accepted' && conversationId) {
      try {
        await router.push(`/dashboard/producer/messages?c=${conversationId}`);
        return;
      } catch (navigationError) {
        console.error('Failed to navigate to conversation view:', navigationError);
      }
    }

    fetchApplications(); // Listeyi yenile veya yönlendirme başarısız olursa yedek
  };

  const getBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="bg-yellow-50 text-yellow-800 text-xs px-2 py-1 rounded">
            İncelemede
          </span>
        );
      case 'accepted':
        return (
          <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded">
            Kabul Edildi
          </span>
        );
      case 'rejected':
        return (
          <span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded">
            Reddedildi
          </span>
        );
      case 'on_hold':
        return (
          <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded">
            Beklemeye Alındı
          </span>
        );
      case 'purchased':
        return (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
            Satın Alma
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
            Durum Bilinmiyor
          </span>
        );
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <AuthGuard allowedRoles={['producer']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">📩 İlanlarınıza Gelen Başvurular</h1>
        <p className="text-[#7a5c36]">
          İlanlarınıza gönderilen senaryo başvuruları burada listelenir.
        </p>

        <div className="flex flex-col gap-3 rounded-lg border border-[#e0d2bf] bg-[#fdf8f1] p-4">
          <h2 className="text-sm font-semibold text-[#5b4632]">
            Filtreler ve Arama
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm text-[#5b4632]">
              ID Türü
              <select
                value={idFilterType}
                onChange={(event) => {
                  setIdFilterType(event.target.value as IdFilter);
                  resetToFirstPage();
                }}
                className="rounded border border-[#d4c2a8] bg-white px-2 py-1 text-sm"
              >
                <option value="all">Hepsi</option>
                <option value="listing">İlan ID</option>
                <option value="producer_listing">Üretici İlan ID</option>
                <option value="request">Talep ID</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-[#5b4632] sm:col-span-2 lg:col-span-3">
              ID veya anahtar kelime
              <input
                type="text"
                value={idFilterValue}
                onChange={(event) => {
                  setIdFilterValue(event.target.value);
                  resetToFirstPage();
                }}
                placeholder="İlan ya da talep ID'si girin"
                className="rounded border border-[#d4c2a8] px-2 py-1 text-sm"
              />
            </label>
        </div>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {fetchError}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-[#a38d6d]">Yükleniyor...</p>
      ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#e0d2bf] bg-white p-10 text-center text-[#7a5c36]">
            <span className="text-4xl" role="img" aria-hidden>
              📭
            </span>
            <div className="space-y-1">
              <p className="text-base font-semibold text-[#5b4632]">
                Henüz başvuru bulunmuyor
              </p>
              <p className="text-sm text-[#a38d6d]">
                İlanlarınız yeni başvurular aldığında burada görebilirsiniz.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-lg border border-[#e0d2bf] bg-white"
            data-test-id="producer-application-list"
          >
            <table className="min-w-full divide-y divide-[#f1e6d7]">
              <thead className="bg-[#f9f3ea] text-left text-xs font-semibold uppercase tracking-wide text-[#5b4632]">
                <tr>
                  <th className="px-4 py-3">Senarist</th>
                  <th className="px-4 py-3">Senaryo</th>
                  <th className="px-4 py-3">İlan</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5ebde] text-sm">
                {applications.map((app) => (
                  <tr key={app.application_id} className="hover:bg-[#fdf8f1]">
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col">
                        <span className="font-medium text-[#0e5b4a]">
                          {app.writer_email ?? 'Bilinmiyor'}
                        </span>
                        <span className="text-xs text-[#a38d6d]">
                          #{app.application_id.slice(0, 8)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-[#5b4632]">
                          {app.script_title || '—'}
                        </span>
                        <span className="text-xs text-[#7a5c36]">
                          Süre: {app.length ?? '—'} · Fiyat: {formatPrice(app.price_cents)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-[#5b4632]">
                          {app.listing_title || '—'}
                        </span>
                        {app.listing_source ? (
                          <span className="text-xs uppercase tracking-wide text-[#a38d6d]">
                            {app.listing_source}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">{getBadge(app.status)}</td>
                    <td className="px-4 py-3 align-top text-xs text-[#7a5c36]">
                      {new Date(app.created_at).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <div className="flex flex-col items-end gap-2">
                        {app.status === 'pending' && (
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() =>
                                handleDecision(app.application_id, 'accepted')
                              }
                              className="btn btn-primary"
                            >
                              ✅ Kabul Et
                            </button>
                            <button
                              onClick={() =>
                                handleDecision(app.application_id, 'on_hold')
                              }
                              className="btn btn-secondary"
                            >
                              ⏳ Beklet
                            </button>
                            <button
                              onClick={() =>
                                handleDecision(app.application_id, 'purchased')
                              }
                              className="btn btn-secondary"
                            >
                              🛒 Satın Al
                            </button>
                            <button
                              onClick={() =>
                                handleDecision(app.application_id, 'rejected')
                              }
                              className="btn btn-secondary"
                            >
                              ❌ Reddet
                            </button>
                          </div>
                        )}
                        <div className="flex flex-wrap justify-end gap-2">
                          {app.conversation_id ? (
                            <Link
                              href={`/dashboard/producer/messages?c=${app.conversation_id}`}
                              className="btn btn-primary"
                            >
                              Sohbeti Aç
                            </Link>
                          ) : (
                            <span className="btn btn-secondary cursor-not-allowed opacity-60">
                              Sohbet Bekleniyor
                            </span>
                          )}
                          <Link
                            href={`/dashboard/producer/listings/${app.listing_id}`}
                            className="btn btn-secondary"
                          >
                            İlan Detayı
                          </Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-[#f1e6d7] bg-[#fdf8f1] px-4 py-3 text-sm text-[#5b4632]">
              <span>
                Toplam {totalCount.toLocaleString('tr-TR')} başvurudan sayfa {currentPage} /{' '}
                {totalPages.toLocaleString('tr-TR')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => canGoPrev && setCurrentPage((page) => page - 1)}
                  disabled={!canGoPrev}
                  className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  ← Önceki
                </button>
                <button
                  onClick={() => canGoNext && setCurrentPage((page) => page + 1)}
                  disabled={!canGoNext}
                  className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Sonraki →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
