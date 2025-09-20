'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { usePlanData } from '@/hooks/usePlanData';
import { supabase } from '@/lib/supabaseClient';

type OrderRow = {
  amount_cents: number | null;
};

type ScriptQueryRow = {
  id: string;
  title: string;
  price_cents: number | null;
  orders?: OrderRow[] | OrderRow | null;
};

type ScriptStat = {
  id: string;
  title: string;
  price_cents: number | null;
  salesCount: number;
  revenueCents: number;
};

type ListingRow = {
  id: string;
  title: string;
  genre: string | null;
  budget_cents: number | null;
  created_at: string | null;
  source: string | null;
};

type ApplicationQueryRow = {
  id: string;
  listing_id: string | null;
  status: string | null;
};

type ApplicationSummary = {
  id: string;
  status: string;
  listingId: string | null;
  listingTitle: string;
  listing: ListingRow | null;
};

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  accepted: 'Kabul edildi',
  rejected: 'Reddedildi',
};

const formatCurrency = (cents: number | null | undefined) => {
  if (cents === null || cents === undefined) {
    return '—';
  }

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};

const toArray = <T,>(value: T | T[] | null | undefined): T[] => {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

const getStatusLabel = (status: string) =>
  APPLICATION_STATUS_LABELS[status] ?? status;

export default function WriterDashboardPage() {
  const [scriptStats, setScriptStats] = useState<ScriptStat[]>([]);
  const [loadingScripts, setLoadingScripts] = useState(true);
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    selection: planSelection,
    loading: planLoading,
    plans: availablePlans,
  } = usePlanData();

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoadingScripts(true);
      setLoadingApplications(true);
      setErrorMessage(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          if (isMounted) {
            setScriptStats([]);
            setApplications([]);
          }
          return;
        }

        const { data: scriptData, error: scriptError } = await supabase
          .from('scripts')
          .select(
            'id,title,genre,length,price_cents,created_at,orders(amount_cents)'
          )
          .or(`owner_id.eq.${user.id},user_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (scriptError) {
          throw scriptError;
        }

        const scripts = (scriptData as ScriptQueryRow[] | null) ?? [];
        const normalizedScripts = scripts.map<ScriptStat>((script) => {
          const orders = toArray(script.orders);
          const salesCount = orders.length;
          const revenueCents = orders.reduce(
            (acc, order) => acc + (order?.amount_cents ?? 0),
            0
          );

          return {
            id: script.id,
            title: script.title,
            price_cents: script.price_cents ?? null,
            salesCount,
            revenueCents,
          };
        });

        const { data: applicationData, error: applicationError } = await supabase
          .from('applications')
          .select(
            `
              id,
              listing_id,
              status,
              created_at
            `
          )
          .eq('writer_id', user.id)
          .order('created_at', { ascending: false });

        if (applicationError) {
          throw applicationError;
        }

        const applicationRows = (applicationData as ApplicationQueryRow[] | null) ?? [];
        const listingIds = Array.from(
          new Set(
            applicationRows
              .map((app) => app.listing_id)
              .filter((id): id is string => typeof id === 'string' && id.length > 0)
          )
        );

        let listingsById = new Map<string, ListingRow>();

        if (listingIds.length > 0) {
          const { data: listingsData, error: listingsError } = await supabase
            .from('v_listings_unified')
            .select('id,title,genre,budget_cents,created_at,source')
            .in('id', listingIds);

          if (listingsError) {
            throw listingsError;
          }

          const listings = (listingsData as ListingRow[] | null) ?? [];
          listingsById = new Map(listings.map((listing) => [listing.id, listing]));
        }

        const normalizedApplications = applicationRows.map((app) => {
          const listing = app.listing_id
            ? listingsById.get(app.listing_id) ?? null
            : null;

          return {
            id: app.id,
            status: app.status ?? 'pending',
            listingId: app.listing_id,
            listingTitle: listing?.title ?? '—',
            listing,
          };
        });

        if (isMounted) {
          setScriptStats(normalizedScripts);
          setApplications(normalizedApplications);
        }
      } catch (error) {
        console.error('Dashboard verileri alınamadı:', error);
        if (isMounted) {
          setScriptStats([]);
          setApplications([]);
          setErrorMessage(
            'Veriler alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
          );
        }
      } finally {
        if (isMounted) {
          setLoadingScripts(false);
          setLoadingApplications(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const scriptCount = scriptStats.length;

  const totalSalesCount = useMemo(
    () => scriptStats.reduce((acc, script) => acc + script.salesCount, 0),
    [scriptStats]
  );

  const totalRevenueCents = useMemo(
    () => scriptStats.reduce((acc, script) => acc + script.revenueCents, 0),
    [scriptStats]
  );

  const activePlan = useMemo(
    () => availablePlans.find((plan) => plan.id === planSelection?.planId) ?? null,
    [availablePlans, planSelection?.planId]
  );

  return (
    <AuthGuard allowedRoles={['writer']}>
      <div
        className="space-y-8"
        data-test-id="WRITER_DASH_FIX_V2"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Merhaba, Senarist!</h1>
            <p className="text-[#7a5c36]">
              Senaryo yolculuğuna hoş geldin. Aşağıdan son durumu
              inceleyebilirsin 👇
            </p>
          </div>
          <Link href="/dashboard/writer/messages" className="btn btn-primary">
            💬 Mesajlara Git
          </Link>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <div className="card">
            <h2 className="mb-2 text-lg font-semibold">📄 Yüklediğin Senaryolar</h2>
            <p className="text-3xl font-bold text-[#0e5b4a]">
              {loadingScripts ? 'Yükleniyor…' : scriptCount}
            </p>
          </div>

          <div className="card">
            <h2 className="mb-2 text-lg font-semibold">📩 Yapımcı Talepleri</h2>
            <p className="text-3xl font-bold text-[#ffaa06]">
              {loadingApplications ? 'Yükleniyor…' : applications.length}
            </p>
          </div>

          <div className="card">
            <h2 className="mb-2 text-lg font-semibold">💳 Üyelik Planın</h2>
            <p className="text-xl font-bold text-[#7a5c36]">
              {planLoading
                ? 'Yükleniyor…'
                : activePlan
                  ? `${activePlan.icon} ${activePlan.name}`
                  : 'Plan bilgisi bulunamadı'}
            </p>
            <p className="text-sm text-[#7a5c36]">
              {planLoading
                ? 'Plan bilgilerin alınıyor.'
                : planSelection?.renewsAt
                  ? `Sonraki yenileme: ${planSelection.renewsAt}`
                  : 'Yenileme tarihi henüz belirlenmedi.'}
            </p>
          </div>

          <div className="card">
            <h2 className="mb-2 text-lg font-semibold">🛒 Satış Adedi</h2>
            <p className="text-3xl font-bold text-[#0e5b4a]">
              {loadingScripts ? 'Yükleniyor…' : totalSalesCount}
            </p>
            <p className="text-sm text-[#7a5c36]">
              Onaylanmış siparişlerden toplam adet.
            </p>
          </div>

          <div className="card">
            <h2 className="mb-2 text-lg font-semibold">💰 Toplam Gelir</h2>
            <p className="text-3xl font-bold text-[#0e5b4a]">
              {loadingScripts ? 'Yükleniyor…' : formatCurrency(totalRevenueCents)}
            </p>
            <p className="text-sm text-[#7a5c36]">
              Satışlar sonrası elde edilen toplam tutar.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card overflow-hidden p-0">
            <div className="border-b border-[#f0e6da] bg-[#f9f4ee] px-6 py-4">
              <h2 className="text-lg font-semibold text-[#4a3d2f]">
                Senaryo Satış Performansı
              </h2>
              <p className="text-sm text-[#7a5c36]">
                Satış adetleri ve gelirlerini senaryo bazında incele.
              </p>
            </div>
            {loadingScripts ? (
              <p className="px-6 py-4 text-sm text-gray-500">Yükleniyor...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#f0e6da] text-sm">
                  <thead className="bg-[#fbf7f2] text-left text-xs uppercase tracking-wider text-[#7a5c36]">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Senaryo</th>
                      <th className="px-6 py-3 font-semibold">Fiyat</th>
                      <th className="px-6 py-3 font-semibold">Satış</th>
                      <th className="px-6 py-3 font-semibold">Gelir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0e6da] text-[#4a3d2f]">
                    {scriptStats.length === 0 ? (
                      <tr>
                        <td
                          className="px-6 py-4 text-center text-sm text-gray-500"
                          colSpan={4}
                        >
                          Henüz senaryo performans verisi yok.
                        </td>
                      </tr>
                    ) : (
                      scriptStats.map((script) => (
                        <tr key={script.id} className="even:bg-[#fdf9f3]">
                          <td className="px-6 py-4 font-medium">{script.title}</td>
                          <td className="px-6 py-4">
                            {formatCurrency(script.price_cents)}
                          </td>
                          <td className="px-6 py-4">{script.salesCount}</td>
                          <td className="px-6 py-4 font-semibold text-[#0e5b4a]">
                            {formatCurrency(script.revenueCents)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-[#4a3d2f]">
              Başvurduğun Yapımcı İlanları
            </h2>
            <p className="mb-4 text-sm text-[#7a5c36]">
              Başvuru durumlarını buradan takip edebilirsin.
            </p>
            {loadingApplications ? (
              <p className="text-sm text-gray-500">Yükleniyor...</p>
            ) : applications.length === 0 ? (
              <p className="text-sm text-gray-500">
                Henüz bir ilana başvuru yapmadın.
              </p>
            ) : (
              <ul className="space-y-3">
                {applications.map((application) => (
                  <li
                    key={application.id}
                    className="rounded-lg border border-[#f0e6da] bg-[#fbf7f2] px-4 py-3"
                  >
                    <p className="font-medium text-[#4a3d2f]">
                      {application.listingTitle}
                    </p>
                    <p className="text-sm text-[#7a5c36]">
                      Durum: {getStatusLabel(application.status)}
                    </p>
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
