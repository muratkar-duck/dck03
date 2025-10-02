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

type ScriptMetadata = {
  id?: unknown;
  title?: unknown;
  length?: unknown;
  price_cents?: unknown;
  writer_email?: unknown;
} | null;

type RpcApplicationRow = {
  application_id: string | null;
  status: string | null;
  created_at: string | null;
  listing_id: string | null;
  producer_listing_id: string | null;
  request_id: string | null;
  owner_id: string | null;
  producer_id: string | null;
  script_id: string | null;
  script_metadata: ScriptMetadata;
  listing_title: string | null;
  listing_source: string | null;
  writer_email: string | null;
  conversation_id: string | null;
};

type IdFilter = 'all' | 'listing' | 'producer_listing' | 'request';
type Decision = 'accepted' | 'rejected' | 'on_hold' | 'purchased';

const PAGE_SIZE = 10;

export default function ProducerApplicationsPage() {
  const router = useRouter();
  const [rawApplications, setRawApplications] = useState<RpcApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [idFilterType, setIdFilterType] = useState<IdFilter>('all');
  const [idFilterValue, setIdFilterValue] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const supabase = useMemo(getSupabaseClient, []);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    if (!supabase) {
      setFetchError('Supabase istemcisi kullanılamıyor.');
      setRawApplications([]);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setRawApplications([]);
      setFetchError('Oturum doğrulanamadı. Lütfen tekrar giriş yapın.');
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const { data, error } = await supabase.rpc('get_producer_applications', {
      p_producer_id: user.id,
    });

    if (error) {
      console.error('Başvurular alınamadı:', error.message);
      setRawApplications([]);
      setFetchError(`Supabase hatası: ${error.message}`);
    } else {
      const rows = Array.isArray(data) ? (data as RpcApplicationRow[]) : [];
      setRawApplications(rows);
      setFetchError(null);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const trimmedFilterValue = idFilterValue.trim();

  const filteredApplications = useMemo(() => {
    if (!trimmedFilterValue) {
      return rawApplications;
    }

    const matchesValue = (value: string | null | undefined) =>
      value != null && String(value).trim() === trimmedFilterValue;

    return rawApplications.filter((item) => {
      if (idFilterType === 'all') {
        return (
          matchesValue(item.listing_id) ||
          matchesValue(item.producer_listing_id) ||
          matchesValue(item.request_id)
        );
      }

      if (idFilterType === 'listing') {
        return matchesValue(item.listing_id);
      }

      if (idFilterType === 'producer_listing') {
        return matchesValue(item.producer_listing_id);
      }

      if (idFilterType === 'request') {
        return matchesValue(item.request_id);
      }

      return true;
    });
  }, [rawApplications, idFilterType, trimmedFilterValue]);

  const totalCount = filteredApplications.length;

  useEffect(() => {
    if (loading) {
      return;
    }

    const newTotalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    if (currentPage > newTotalPages) {
      setCurrentPage(newTotalPages);
    }
  }, [currentPage, loading, totalCount]);

  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredApplications.slice(start, end);
  }, [currentPage, filteredApplications]);

  const applications: ApplicationRow[] = useMemo(() => {
    return paginatedApplications.map((item) => {
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
        item.listing_id ?? item.producer_listing_id ?? item.request_id ?? null;
      const resolvedListingId = rawListingId != null ? String(rawListingId) : '';

      const rawScriptId = item.script_id ?? scriptMetadata?.id ?? null;
      const resolvedScriptId = rawScriptId != null ? String(rawScriptId) : '';

      const scriptTitle =
        scriptMetadata?.title != null ? String(scriptMetadata.title) : '';

      const listingTitle =
        item.listing_title != null ? String(item.listing_title) : '';

      const applicationId =
        item.application_id != null ? String(item.application_id) : '';

      const status = item.status != null ? String(item.status) : '';

      const writerEmail =
        item.writer_email != null
          ? String(item.writer_email)
          : scriptMetadata?.writer_email != null
          ? String(scriptMetadata.writer_email)
          : null;

      return {
        application_id: applicationId,
        status,
        created_at: item.created_at ?? new Date().toISOString(),
        listing_id: resolvedListingId,
        listing_title: listingTitle,
        listing_source:
          item.listing_source != null ? String(item.listing_source) : null,
        script_id: resolvedScriptId,
        script_title: scriptTitle,
        writer_email: writerEmail,
        length: normalizedLength,
        price_cents: normalizedPrice,
        conversation_id:
          item.conversation_id != null ? String(item.conversation_id) : null,
      } as ApplicationRow;
    });
  }, [paginatedApplications]);

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

    const payload: Record<string, unknown> = {
      p_application_id: applicationId,
      p_status: decision,
    };

    if (actingUserId) {
      payload.p_actor_id = actingUserId;
    }

    const { error: updateError } = await supabase.rpc(
      'mark_application_status',
      payload
    );

    if (updateError) {
      alert('❌ Güncelleme hatası: ' + updateError.message);
      return;
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
