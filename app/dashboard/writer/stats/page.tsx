'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useSession } from '@/hooks/useSession';

type WriterStats = {
  applicationsLast30Days: number;
  acceptedApplications: number;
  totalOrders: number;
  totalOrderAmountCents: number;
  lastFetchedAtIso: string;
};

export default function WriterStatsPage() {
  const { session, loading: sessionLoading } = useSession();
  const [stats, setStats] = useState<WriterStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(getSupabaseClient, []);

  useEffect(() => {
    let active = true;

    if (sessionLoading) {
      return () => {
        active = false;
      };
    }

    const userId = session?.user?.id;

    if (!userId) {
      setStats(null);
      setStatsLoading(false);
      return () => {
        active = false;
      };
    }

    if (!supabase) {
      setStats(null);
      setStatsLoading(false);
      setError('Supabase istemcisi kullanılamıyor.');
      return () => {
        active = false;
      };
    }

    const fetchStats = async () => {
      if (!supabase) {
        setStats(null);
        setStatsLoading(false);
        setError('Supabase istemcisi kullanılamıyor.');
        return;
      }

      setStatsLoading(true);
      setError(null);

      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

        const [applicationsLast30Response, acceptedApplicationsResponse] = await Promise.all([
          supabase
            .from('applications')
            .select('id', { count: 'exact', head: true })
            .eq('writer_id', userId)
            .gte('created_at', thirtyDaysAgoIso),
          supabase
            .from('applications')
            .select('id', { count: 'exact', head: true })
            .eq('writer_id', userId)
            .eq('status', 'accepted'),
        ]);

        if (applicationsLast30Response.error) {
          throw applicationsLast30Response.error;
        }

        if (acceptedApplicationsResponse.error) {
          throw acceptedApplicationsResponse.error;
        }

        const { data: scriptRows, error: scriptsError } = await supabase
          .from('scripts')
          .select('id')
          .eq('owner_id', userId);

        if (scriptsError) {
          throw scriptsError;
        }

        const scriptIds = (scriptRows ?? []).map((row) => row.id);

        let totalOrders = 0;
        let totalOrderAmountCents = 0;

        if (scriptIds.length > 0) {
          const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('id, amount_cents, script_id')
            .in('script_id', scriptIds);

          if (ordersError) {
            throw ordersError;
          }

          const resolvedOrders = ordersData ?? [];
          totalOrders = resolvedOrders.length;
          totalOrderAmountCents = resolvedOrders.reduce(
            (sum, order) => sum + (order.amount_cents ?? 0),
            0
          );
        }

        if (!active) {
          return;
        }

        setStats({
          applicationsLast30Days: applicationsLast30Response.count ?? 0,
          acceptedApplications: acceptedApplicationsResponse.count ?? 0,
          totalOrders,
          totalOrderAmountCents,
          lastFetchedAtIso: new Date().toISOString(),
        });
      } catch (fetchError) {
        console.error('Writer stats fetch failed:', fetchError);
        if (!active) {
          return;
        }
        setError('İstatistikler yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.');
        setStats(null);
      } finally {
        if (active) {
          setStatsLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      active = false;
    };
  }, [session?.user?.id, sessionLoading, supabase]);

  const lastUpdatedDisplay = useMemo(() => {
    if (!stats?.lastFetchedAtIso) {
      return null;
    }

    const parsed = new Date(stats.lastFetchedAtIso);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(parsed);
  }, [stats?.lastFetchedAtIso]);

  const formatCurrency = (valueInCents: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(valueInCents / 100);

  const emptyState =
    !!stats &&
    stats.applicationsLast30Days === 0 &&
    stats.acceptedApplications === 0 &&
    stats.totalOrders === 0 &&
    stats.totalOrderAmountCents === 0;

  return (
    <AuthGuard allowedRoles={['writer']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">📊 İstatistikler</h1>
        <p className="text-[#7a5c36]">
          Senaryolarının performansına dair genel bir bakış:
        </p>

        {statsLoading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="card text-center space-y-3 animate-pulse">
                <div className="h-4 bg-neutral-200 rounded mx-auto w-1/2" />
                <div className="h-10 bg-neutral-200 rounded mx-auto w-1/3" />
                <div className="h-3 bg-neutral-100 rounded mx-auto w-2/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-center text-red-600">{error}</p>
        ) : stats ? (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card text-center space-y-2">
                <h2 className="text-lg font-semibold">📝 Son 30 Gündeki Başvurular</h2>
                <p className="text-4xl font-bold text-[#0e5b4a]">
                  {stats.applicationsLast30Days.toLocaleString('tr-TR')}
                </p>
                <p className="text-sm text-[#a38d6d]">
                  {stats.applicationsLast30Days > 0
                    ? 'Son 30 gün içinde gönderdiğin başvuru sayısı.'
                    : 'Son 30 gün içerisinde henüz başvuru göndermedin.'}
                </p>
              </div>

              <div className="card text-center space-y-2">
                <h2 className="text-lg font-semibold">✅ Kabul Edilen Başvurular</h2>
                <p className="text-4xl font-bold text-[#ffaa06]">
                  {stats.acceptedApplications.toLocaleString('tr-TR')}
                </p>
                <p className="text-sm text-[#a38d6d]">
                  {stats.acceptedApplications > 0
                    ? 'Prodüksiyon tarafından onaylanan başvurularının toplamı.'
                    : 'Henüz kabul edilen bir başvurun bulunmuyor.'}
                </p>
              </div>

              <div className="card text-center space-y-2">
                <h2 className="text-lg font-semibold">💼 Siparişler</h2>
                <p className="text-4xl font-bold text-[#7a5c36]">
                  {stats.totalOrders.toLocaleString('tr-TR')}
                </p>
                <p className="text-sm text-[#a38d6d]">
                  {stats.totalOrders > 0
                    ? `Toplam kazanç: ${formatCurrency(stats.totalOrderAmountCents)}`
                    : 'Henüz sipariş alınmadı.'}
                </p>
              </div>
            </div>

            {emptyState ? (
              <p className="text-center text-[#a38d6d]">
                İlk istatistiklerini görmek için başvuru gönder veya senaryolarını paylaş.
              </p>
            ) : null}

            {lastUpdatedDisplay ? (
              <div className="text-sm text-[#a38d6d] text-center mt-4">
                Son güncelleme: {lastUpdatedDisplay}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-center text-[#a38d6d]">
            Gösterilecek istatistik bulunamadı.
          </p>
        )}
      </div>
    </AuthGuard>
  );
}
