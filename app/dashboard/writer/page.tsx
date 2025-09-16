'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabaseClient';

type OrderRow = {
  amount_cents: number | null;
  scripts: {
    owner_id: string;
  };
};

const formatCurrency = (cents: number | null) => {
  if (cents === null) {
    return '—';
  }

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};

export default function WriterDashboardPage() {
  const [salesCount, setSalesCount] = useState<number | null>(null);
  const [totalRevenueCents, setTotalRevenueCents] = useState<number | null>(null);
  const [loadingSales, setLoadingSales] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSales = async () => {
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
            setSalesCount(0);
            setTotalRevenueCents(0);
          }
          return;
        }

        const { data, error } = await supabase
          .from('orders')
          .select('amount_cents, scripts!inner(owner_id)')
          .eq('scripts.owner_id', user.id);

        if (error) {
          throw error;
        }

        const rows: OrderRow[] = data ?? [];
        const count = rows.length;
        const total = rows.reduce(
          (acc, order) => acc + (order.amount_cents ?? 0),
          0
        );

        if (isMounted) {
          setSalesCount(count);
          setTotalRevenueCents(total);
        }
      } catch (err) {
        console.error('Satış bilgileri alınamadı:', err);
        if (isMounted) {
          setSalesCount(0);
          setTotalRevenueCents(0);
        }
      } finally {
        if (isMounted) {
          setLoadingSales(false);
        }
      }
    };

    fetchSales();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AuthGuard allowedRoles={['writer']}>
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">Merhaba, Senarist!</h1>
        <p className="text-[#7a5c36]">
          Senaryo yolculuğuna hoş geldin. Aşağıdan son durumu inceleyebilirsin
          👇
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Senaryo Sayısı */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-2">
              📄 Yüklediğin Senaryolar
            </h2>
            <p className="text-3xl font-bold text-[#0e5b4a]">3</p>
          </div>

          {/* Talepler */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-2">📩 Yapımcı Talepleri</h2>
            <p className="text-3xl font-bold text-[#ffaa06]">1</p>
          </div>

          {/* Üyelik Durumu */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-2">💳 Üyelik Planın</h2>
            <p className="text-xl font-bold text-[#7a5c36]">Pro</p>
            <p className="text-sm text-[#7a5c36]">
              Sonraki yenileme: 31 Ağustos 2025
            </p>
          </div>

          {/* Satış Adedi */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-2">🛒 Satış Adedi</h2>
            <p className="text-3xl font-bold text-[#0e5b4a]">
              {loadingSales ? 'Yükleniyor…' : (salesCount ?? 0)}
            </p>
            <p className="text-sm text-[#7a5c36]">
              Onaylanmış siparişlerden toplam adet.
            </p>
          </div>

          {/* Toplam Gelir */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-2">💰 Toplam Gelir</h2>
            <p className="text-3xl font-bold text-[#0e5b4a]">
              {loadingSales ? 'Yükleniyor…' : formatCurrency(totalRevenueCents)}
            </p>
            <p className="text-sm text-[#7a5c36]">
              Satışlar sonrası elde edilen toplam tutar.
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
