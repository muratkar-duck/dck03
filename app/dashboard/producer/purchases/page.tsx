'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { getSupabaseClient } from '@/lib/supabaseClient';

type OrderRow = {
  id: string;
  buyer_id: string;
  created_at: string;
  amount_cents: number | null;
  script_title: string;
  script_price_cents: number | null;
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

export const calculateTaxBreakdown = (priceCents: number | null) => {
  if (priceCents == null) {
    return null;
  }

  const netCents = priceCents;
  const vatCents = Math.round(netCents * 0.2);
  const grossCents = netCents + vatCents;

  return {
    netCents,
    vatCents,
    grossCents,
  } as const;
};

const formatDateTime = (isoString: string) => {
  try {
    return new Date(isoString).toLocaleString('tr-TR');
  } catch (error) {
    return isoString;
  }
};

export default function ProducerPurchasesPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(getSupabaseClient, []);

  const fetchOrders = useCallback(async () => {
    if (!supabase) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, buyer_id, amount_cents, created_at, scripts!inner(id,title,price_cents)'
      )
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Satın alımlar alınamadı:', error.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    const formatted = (data || []).map((item: any) => ({
      id: item.id,
      buyer_id: item.buyer_id,
      created_at: item.created_at,
      amount_cents:
        typeof item.amount_cents === 'number'
          ? item.amount_cents
          : item.amount_cents != null
          ? Number(item.amount_cents)
          : null,
      script_title: item.scripts?.title || 'Bilinmeyen Senaryo',
      script_price_cents:
        typeof item.scripts?.price_cents === 'number'
          ? item.scripts.price_cents
          : item.scripts?.price_cents != null
          ? Number(item.scripts.price_cents)
          : null,
    }));

    setOrders(formatted);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  return (
    <AuthGuard allowedRoles={['producer']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">🧾 Satın Aldığım Senaryolar</h1>
        <p className="text-[#7a5c36]">
          Satın aldığınız senaryoların geçmişini tarih ve ödeme tutarıyla birlikte
          görüntüleyin.
        </p>

        {loading ? (
          <p className="text-sm text-[#a38d6d]">Yükleniyor...</p>
        ) : orders.length === 0 ? (
          <div className="card">
            <p className="text-sm text-[#a38d6d]">
              Henüz herhangi bir senaryo satın almadınız.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const effectivePriceCents =
                order.amount_cents ?? order.script_price_cents ?? null;
              const taxDetails = calculateTaxBreakdown(effectivePriceCents);

              return (
                <div key={order.id} className="card space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[#0e5b4a]">
                        {order.script_title}
                      </h2>
                      <p className="text-sm text-[#7a5c36]">
                        Satın alma tarihi: {formatDateTime(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-[#a38d6d]">
                        Ödenen Tutar
                      </p>
                      <p className="text-lg font-bold text-[#0e5b4a]">
                        {formatPrice(effectivePriceCents)}
                      </p>
                    </div>
                  </div>
                  {taxDetails && (
                    <dl className="grid grid-cols-1 gap-3 text-sm text-[#0e5b4a] sm:grid-cols-3">
                      <div className="rounded-lg bg-[#f8f2ea] p-3">
                        <dt className="text-xs uppercase tracking-wide text-[#a38d6d]">
                          Bedel (Net)
                        </dt>
                        <dd className="font-semibold">
                          {formatPrice(taxDetails.netCents)}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-[#f8f2ea] p-3">
                        <dt className="text-xs uppercase tracking-wide text-[#a38d6d]">
                          KDV (%20)
                        </dt>
                        <dd className="font-semibold">
                          {formatPrice(taxDetails.vatCents)}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-[#f8f2ea] p-3">
                        <dt className="text-xs uppercase tracking-wide text-[#a38d6d]">
                          Toplam (Brüt)
                        </dt>
                        <dd className="font-semibold">
                          {formatPrice(taxDetails.grossCents)}
                        </dd>
                      </div>
                    </dl>
                  )}
                  {order.script_price_cents != null && (
                    <p className="text-xs text-[#a38d6d]">
                      Liste fiyatı: {formatPrice(order.script_price_cents)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
