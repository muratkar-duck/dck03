'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type {
  SupabaseApplicationRow,
  SupabaseApplicationScriptMetadata,
} from '@/types/supabase';

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

type IdFilter = 'all' | 'listing' | 'producer_listing' | 'request';
type Decision = 'accepted' | 'rejected' | 'on_hold' | 'purchased';

type DecisionFeedback = {
  type: 'success' | 'warning' | 'error';
  message: string;
};

const PAGE_SIZE = 10;

const normalizeSupabaseApplicationRow = (
  item: any
): SupabaseApplicationRow => {
  const listingData = Array.isArray(item?.listing)
    ? item.listing[0]
    : item?.listing;

  const rawListingSource =
    typeof listingData?.source === 'string'
      ? listingData.source.toLowerCase()
      : null;
  const listingSource =
    rawListingSource === 'request'
      ? 'request'
      : rawListingSource === 'producer'
      ? 'producer'
      : rawListingSource === 'producer_listing'
      ? 'producer'
      : null;

  const listingTitle =
    listingData?.title != null ? String(listingData.title) : null;

  const scriptMetadata =
    item?.script_metadata &&
    typeof item.script_metadata === 'object' &&
    !Array.isArray(item.script_metadata)
      ? (item.script_metadata as SupabaseApplicationScriptMetadata)
      : null;

  const writerData = Array.isArray(item?.writer)
    ? item.writer[0]
    : item?.writer;

  const writerEmail =
    writerData?.email != null
      ? String(writerData.email)
      : scriptMetadata?.writer_email != null
      ? String(scriptMetadata.writer_email)
      : null;

  const conversations = Array.isArray(item?.conversations)
    ? item.conversations.map((conversation: any) => ({
        id:
          conversation?.id != null ? String(conversation.id) : null,
      }))
    : [];

  const applicationId =
    item?.application_id != null
      ? String(item.application_id)
      : item?.id != null
      ? String(item.id)
      : null;

  return {
    application_id: applicationId,
    status: item?.status != null ? String(item.status) : null,
    created_at: item?.created_at != null ? String(item.created_at) : null,
    listing_id:
      item?.listing_id != null
        ? String(item.listing_id)
        : listingData?.id != null
        ? String(listingData.id)
        : null,
    producer_listing_id:
      item?.producer_listing_id != null
        ? String(item.producer_listing_id)
        : null,
    request_id:
      item?.request_id != null ? String(item.request_id) : null,
    request_title: listingSource === 'request' ? listingTitle : null,
    listing_title: listingTitle,
    listing_source: listingSource,
    owner_id: item?.owner_id != null ? String(item.owner_id) : null,
    producer_id: item?.producer_id != null ? String(item.producer_id) : null,
    script_id: item?.script_id != null ? String(item.script_id) : null,
    script_metadata: scriptMetadata,
    writer_email: writerEmail,
    conversations: conversations.length > 0 ? conversations : null,
  };
};

export default function ProducerApplicationsPage() {
  const router = useRouter();
  const [rawApplications, setRawApplications] = useState<SupabaseApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [idFilterType, setIdFilterType] = useState<IdFilter>('all');
  const [idFilterValue, setIdFilterValue] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [decisionLoadingId, setDecisionLoadingId] = useState<string | null>(null);
  const [decisionFeedback, setDecisionFeedback] = useState<DecisionFeedback | null>(
    null
  );
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
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

    const rangeStart = (currentPage - 1) * PAGE_SIZE;
    const rangeEnd = rangeStart + PAGE_SIZE - 1;

    const trimmedFilterValue = idFilterValue.trim();

    let query = supabase
      .from('applications')
      .select(
        `
        application_id:id,
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
      `,
        { count: 'exact' }
      )
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

    const { data, error } = await query;

    if (error) {
      console.error('Başvurular alınamadı:', error.message);
      setRawApplications([]);
      setFetchError(`Supabase hatası: ${error.message}`);
    } else {
      const rows: SupabaseApplicationRow[] = Array.isArray(data)
        ? data.map((item) => normalizeSupabaseApplicationRow(item))
        : [];
      setRawApplications(rows);
      setFetchError(null);
    }

    setLoading(false);
  }, [supabase, currentPage, idFilterType, idFilterValue]);


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

  const mapApplicationRow = useCallback(
    (item: SupabaseApplicationRow): ApplicationRow => {
      const scriptMetadata: SupabaseApplicationScriptMetadata =
        item.script_metadata && typeof item.script_metadata === 'object'
          ? item.script_metadata
          : null;

      const rawLength = scriptMetadata?.length ?? null;
      const normalizedLength = (() => {
        if (typeof rawLength === 'number') {
          return rawLength;
        }

        if (typeof rawLength === 'string' && rawLength.trim() !== '') {
          const parsed = Number(rawLength);
          return Number.isNaN(parsed) ? null : parsed;
        }

        return null;
      })();

      const rawPrice = scriptMetadata?.price_cents ?? null;
      const normalizedPrice = (() => {
        if (typeof rawPrice === 'number') {
          return rawPrice;
        }

        if (typeof rawPrice === 'string' && rawPrice.trim() !== '') {
          const parsed = Number(rawPrice);
          return Number.isNaN(parsed) ? null : parsed;
        }

        return null;
      })();

      const rawListingId =
        item.listing_id ?? item.producer_listing_id ?? item.request_id ?? null;
      const resolvedListingId = rawListingId != null ? String(rawListingId) : '';

      const rawScriptId =
        item.script_id ?? (scriptMetadata?.id != null ? scriptMetadata.id : null);
      const resolvedScriptId = rawScriptId != null ? String(rawScriptId) : '';

      const scriptTitle =
        scriptMetadata?.title != null ? String(scriptMetadata.title) : '';

      const listingTitle =
        item.listing_title != null
          ? String(item.listing_title)
          : item.request_title != null
          ? String(item.request_title)
          : '';

      const applicationId =
        item.application_id != null
          ? String(item.application_id)
          : '';

      const status = item.status != null ? String(item.status) : '';

      const writerEmail =
        item.writer_email != null
          ? String(item.writer_email)
          : scriptMetadata?.writer_email != null
          ? String(scriptMetadata.writer_email)
          : null;

      const listingSource = item.listing_source;

      const conversationId = Array.isArray(item.conversations)
        ? item.conversations.find((conversation) => conversation?.id)?.id
        : null;

      return {
        application_id: applicationId,
        status,
        created_at: item.created_at ?? new Date().toISOString(),
        listing_id: resolvedListingId,
        listing_title: listingTitle,
        listing_source: listingSource,
        script_id: resolvedScriptId,
        script_title: scriptTitle,
        writer_email: writerEmail,
        length: normalizedLength,
        price_cents: normalizedPrice,
        conversation_id:
          conversationId != null ? String(conversationId) : null,
      };
    },
    []
  );

  useEffect(() => {
    const mapped = paginatedApplications.map(mapApplicationRow);
    setApplications(mapped);
  }, [mapApplicationRow, paginatedApplications]);

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
      const message = 'Supabase istemcisi kullanılamıyor.';
      setDecisionFeedback({ type: 'error', message });
      alert(message);
      return;
    }

    setDecisionLoadingId(applicationId);
    setDecisionFeedback(null);

    const { data: updatedApplication, error: updateError } = await supabase.rpc(
      'mark_application_status',
      {
        p_application_id: applicationId,
        p_status: decision,
      }
    );

    if (updateError) {
      const message = `❌ Başvuru güncellenemedi: ${updateError.message}`;
      setDecisionFeedback({ type: 'error', message });
      alert(message);
      setDecisionLoadingId(null);
      return;
    }

    const updatedStatus =
      (updatedApplication as { status?: string } | null)?.status ?? decision;

    let conversationError: string | null = null;
    let conversationId: string | null = null;

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

    setRawApplications((previous) =>
      previous.map((application) => {
        const normalizedId =
          application.application_id != null
            ? String(application.application_id)
            : '';

        if (normalizedId !== applicationId) {
          return application;
        }

        return {
          ...application,
          status: updatedStatus,
          conversations:
            decision === 'accepted' && conversationId
              ? [{ id: conversationId }]
              : application.conversations,
        };
      })
    );

    setDecisionLoadingId(null);


    const successMessageMap: Record<Decision, string> = {
      accepted: '✅ Başvuru kabul edildi',
      rejected: '❌ Başvuru reddedildi',
      on_hold: '⏳ Başvuru beklemeye alındı',
      purchased: '🛒 Başvuru satın alma aşamasında işaretlendi',
    };

    const feedbackTypeMap: Record<Decision, DecisionFeedback['type']> = {
      accepted: 'success',
      rejected: 'warning',
      on_hold: 'warning',
      purchased: 'success',
    };

    if (conversationError) {
      const message = `⚠️ Başvuru güncellendi ancak sohbet açılamadı: ${conversationError}`;
      setDecisionFeedback({ type: 'warning', message });
      alert(message);
    } else {
      const message = successMessageMap[decision];
      setDecisionFeedback({ type: feedbackTypeMap[decision], message });
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

    fetchApplications();
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
      {decisionFeedback ? (
        <div
          className={`rounded-lg border p-3 text-sm ${
            decisionFeedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : decisionFeedback.type === 'warning'
              ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {decisionFeedback.message}
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
                              disabled={decisionLoadingId === app.application_id}
                              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              ✅ Kabul Et
                            </button>
                            <button
                              onClick={() =>
                                handleDecision(app.application_id, 'on_hold')
                              }
                              disabled={decisionLoadingId === app.application_id}
                              className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              ⏳ Beklet
                            </button>
                            <button
                              onClick={() =>
                                handleDecision(app.application_id, 'purchased')
                              }
                              disabled={decisionLoadingId === app.application_id}
                              className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              🛒 Satın Al
                            </button>
                            <button
                              onClick={() =>
                                handleDecision(app.application_id, 'rejected')
                              }
                              disabled={decisionLoadingId === app.application_id}
                              className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
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
