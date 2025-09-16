'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import AuthGuard from '@/components/AuthGuard';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabaseClient';

const formatCurrency = (cents: number | null) => {
  if (cents == null) {
    return '—';
  }

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};

const normalizeAmount = (
  value: number | string | null | undefined
): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

type OrderSummary = {
  id: string;
  scriptTitle: string;
  amountCents: number | null;
  createdAt: string;
};

type ListingSummary = {
  id: string;
  title: string;
  pending: number;
  accepted: number;
  rejected: number;
};

export default function ProducerDashboardPage() {
  const { session, loading: sessionLoading } = useSession();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [listingsSummary, setListingsSummary] = useState<ListingSummary[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    let isCancelled = false;

    const loadData = async () => {
      setLoadingData(true);
      setError(null);

      const userId = session?.user?.id;

      if (!userId) {
        if (!isCancelled) {
          setOrders([]);
          setListingsSummary([]);
          setLoadingData(false);
        }
        return;
      }

      try {
        const [ordersResponse, listingsResponse] = await Promise.all([
          supabase
            .from('orders')
            .select(
              'id, script_id, buyer_id, amount_cents, created_at, scripts!inner(id, title, price_cents, created_at)'
            )
            .eq('buyer_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('producer_listings')
            .select(
              'id, title, genre, budget_cents, created_at, applications(status)'
            )
            .eq('owner_id', userId)
            .order('created_at', { ascending: false }),
        ]);

        if (isCancelled) {
          return;
        }

        const nextErrors: string[] = [];

        let nextOrders: OrderSummary[] = [];
        if (ordersResponse.error) {
          console.error('Satın alma verileri alınamadı:', ordersResponse.error);
          nextErrors.push('Satın alma verileri yüklenemedi.');
        } else {
          const rawOrders = (ordersResponse.data ?? []) as Array<{
            id: string;
            amount_cents: number | string | null;
            created_at: string;
            scripts?:
              | { title?: string | null }
              | Array<{ title?: string | null }>
              | null;
          }>;

          nextOrders = rawOrders.map((order) => {
            const scriptData = Array.isArray(order.scripts)
              ? order.scripts[0]
              : order.scripts;
            const amountCents = normalizeAmount(order.amount_cents);

            return {
              id: String(order.id),
              scriptTitle: scriptData?.title ?? 'Bilinmeyen Senaryo',
              amountCents,
              createdAt: order.created_at,
            };
          });
        }

        let nextListings: ListingSummary[] = [];
        if (listingsResponse.error) {
          console.error(
            'İlan ve başvuru verileri alınamadı:',
            listingsResponse.error
          );
          nextErrors.push('İlan ve başvuru verileri yüklenemedi.');
        } else {
          const rawListings = (listingsResponse.data ?? []) as Array<{
            id: string;
            title: string | null;
            applications?: Array<{ status?: string | null }> | null;
          }>;

          nextListings = rawListings.map((listing) => {
            const applicationsArray = Array.isArray(listing.applications)
              ? listing.applications
              : [];

            const counts = applicationsArray.reduce(
              (acc, application) => {
                const status = String(
                  application?.status ?? 'pending'
                ).toLowerCase();

                if (status === 'accepted') {
                  acc.accepted += 1;
                } else if (status === 'rejected') {
                  acc.rejected += 1;
                } else {
                  acc.pending += 1;
                }

                return acc;
              },
              { pending: 0, accepted: 0, rejected: 0 }
            );

            return {
              id: String(listing.id),
              title: listing.title ?? 'İsimsiz İlan',
              pending: counts.pending,
              accepted: counts.accepted,
              rejected: counts.rejected,
            };
          });
        }

        if (!isCancelled) {
          setOrders(nextOrders);
          setListingsSummary(nextListings);
          setError(nextErrors.length > 0 ? nextErrors.join(' ') : null);
        }
      } catch (fetchError) {
        console.error('Üretici paneli verileri alınırken hata oluştu:', fetchError);
        if (!isCancelled) {
          setOrders([]);
          setListingsSummary([]);
          setError('Veriler alınırken bir hata oluştu.');
        }
      } finally {
        if (!isCancelled) {
          setLoadingData(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [session, sessionLoading]);

  const isLoading = sessionLoading || loadingData;

  const totalCounts = useMemo(
    () =>
      listingsSummary.reduce(
        (acc, listing) => {
          acc.pending += listing.pending;
          acc.accepted += listing.accepted;
          acc.rejected += listing.rejected;
          return acc;
        },
        { pending: 0, accepted: 0, rejected: 0 }
      ),
    [listingsSummary]
  );

  const totalOrders = orders.length;
  const totalListings = listingsSummary.length;
  const totalApplications =
    totalCounts.pending + totalCounts.accepted + totalCounts.rejected;

  const totalSpentCents = useMemo(
    () => orders.reduce((sum, order) => sum + (order.amountCents ?? 0), 0),
    [orders]
  );

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  return (
    <AuthGuard allowedRoles={['producer']}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Hoş geldiniz, Yapımcı!</h1>
            <p className="text-[#7a5c36]">
              Aradığınız senaryoyu bulmak için hazırsınız. Aşağıda hesabınıza ait
              genel durumu görebilirsiniz.
            </p>
          </div>
          <Link
            href="/dashboard/producer/messages"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0e5b4a] px-4 py-2 text-white transition hover:bg-[#0b4638] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e5b4a]"
          >
            💬 Mesajlara Git
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <div className="card text-center">
            <h2 className="mb-2 text-lg font-semibold">🛒 Satın Alma Sayısı</h2>
            <p className="text-4xl font-bold text-[#0e5b4a]">
              {isLoading ? '…' : totalOrders}
            </p>
            <p className="text-xs text-[#7a5c36]">
              Toplam sipariş adediniz.
            </p>
          </div>

          <div className="card text-center">
            <h2 className="mb-2 text-lg font-semibold">🎬 İlanlarınız</h2>
            <p className="text-4xl font-bold text-[#0e5b4a]">
              {isLoading ? '…' : totalListings}
            </p>
            <p className="text-xs text-[#7a5c36]">Yayınladığınız ilan sayısı.</p>
          </div>

          <div className="card text-center">
            <h2 className="mb-2 text-lg font-semibold">⏳ Bekleyen Başvurular</h2>
            <p className="text-4xl font-bold text-[#0e5b4a]">
              {isLoading ? '…' : totalCounts.pending}
            </p>
            <p className="text-xs text-[#7a5c36]">
              Kabul: {isLoading ? '…' : totalCounts.accepted} · Reddedilen: {isLoading ? '…' : totalCounts.rejected}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">🛍️ Son Satın Alımlar</h2>
              {!isLoading && totalOrders > 0 && (
                <span className="text-xs text-[#7a5c36]">
                  Toplam harcama: {formatCurrency(totalSpentCents)}
                </span>
              )}
            </div>
            {isLoading ? (
              <p className="text-sm text-[#a38d6d]">Yükleniyor...</p>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-[#a38d6d]">
                Henüz herhangi bir senaryo satın almadınız.
              </p>
            ) : (
              <ul className="space-y-3">
                {recentOrders.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center justify-between gap-4 border-b border-[#f0e6d9] pb-2 last:border-b-0 last:pb-0"
                  >
                    <span className="font-medium text-[#0e5b4a]">
                      {order.scriptTitle}
                    </span>
                    <span className="text-sm text-[#7a5c36]">
                      {formatCurrency(order.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card space-y-4">
            <div>
              <h2 className="text-lg font-semibold">📊 Başvuru Özeti</h2>
              {!isLoading && (
                <p className="text-sm text-[#7a5c36]">
                  Toplam başvuru: {totalApplications} · Kabul edilen:{' '}
                  {totalCounts.accepted} · Reddedilen: {totalCounts.rejected}
                </p>
              )}
            </div>
            {isLoading ? (
              <p className="text-sm text-[#a38d6d]">Yükleniyor...</p>
            ) : listingsSummary.length === 0 ? (
              <p className="text-sm text-[#a38d6d]">
                Henüz ilanınız bulunmuyor. İlan oluşturarak başvuruları takip
                edebilirsiniz.
              </p>
            ) : (
              <ul className="space-y-3">
                {listingsSummary.map((listing) => (
                  <li
                    key={listing.id}
                    className="space-y-2 rounded-lg border border-[#f0e6d9] p-3"
                  >
                    <p className="font-medium text-[#0e5b4a]">{listing.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-yellow-800">
                        Bekleyen: {listing.pending}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-green-800">
                        Kabul: {listing.accepted}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-red-800">
                        Reddedilen: {listing.rejected}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
