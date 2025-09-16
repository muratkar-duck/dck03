'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ScriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [script, setScript] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const fetchScript = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('scripts')
      .select('id, title, genre, length, price_cents, description')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Hata:', error.message);
    } else {
      setScript(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchScript();
  }, [fetchScript]);

  const checkPurchaseStatus = useCallback(async () => {
    if (!id) return;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error('Satın alma durumu alınırken hata:', authError.message);
        return;
      }

      if (!user) {
        setHasPurchased(false);
        return;
      }

      const { data: existingOrders, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('script_id', id)
        .eq('buyer_id', user.id)
        .limit(1);

      if (orderError) {
        console.error('Satın alma durumu alınırken hata:', orderError.message);
        return;
      }

      setHasPurchased(!!existingOrders && existingOrders.length > 0);
    } catch (error) {
      console.error('Satın alma durumu alınırken beklenmeyen hata:', error);
    }
  }, [id]);

  useEffect(() => {
    checkPurchaseStatus();
  }, [checkPurchaseStatus]);

  const handlePurchase = async () => {
    if (!id || !script) return;

    setPurchaseError(null);
    setPurchaseMessage(null);
    setIsPurchasing(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setPurchaseError('Satın alma işlemi için giriş yapmalısınız.');
        return;
      }

      const { error: insertError } = await supabase.from('orders').insert({
        script_id: id,
        buyer_id: user.id,
        amount_cents: script.price_cents ?? 0,
      });

      if (insertError) throw insertError;

      setHasPurchased(true);
      setPurchaseMessage('Satın alma başarılı! Senaryo hesabınıza eklendi.');
      await checkPurchaseStatus();
    } catch (error: any) {
      console.error('Satın alma işlemi sırasında hata:', error);
      setPurchaseError(
        error?.message || 'Satın alma işlemi sırasında bir sorun oluştu.'
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>;
  if (!script)
    return <p className="text-sm text-red-500">Senaryo bulunamadı.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🎬 {script.title}</h1>
      <p className="text-sm text-[#7a5c36]">
        Tür: {script.genre} &middot; Süre: {script.length} &middot; Fiyat: ₺
        {(script.price_cents / 100).toFixed(2)}
      </p>

      <div className="bg-white rounded-xl shadow p-6 border-l-4 border-[#f9c74f] space-y-4">
        <h2 className="text-lg font-semibold">Senaryo Açıklaması</h2>
        <p className="text-[#4a3d2f]">{script.description}</p>

        <div className="pt-6 space-y-3">
          {purchaseMessage && (
            <p className="text-sm text-green-600">{purchaseMessage}</p>
          )}
          {purchaseError && (
            <p className="text-sm text-red-600">{purchaseError}</p>
          )}
          <div className="flex gap-3">
            <button
              className="btn btn-primary"
              onClick={handlePurchase}
              disabled={isPurchasing || hasPurchased}
            >
              {hasPurchased ? 'Satın Alındı' : 'Satın Al'}
            </button>
            <button className="btn btn-secondary" onClick={() => router.back()}>
              Geri Dön
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
