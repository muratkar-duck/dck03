'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ScriptDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [script, setScript] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id || typeof id !== 'string') {
        setScript(null);
        setHasPurchased(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setHasPurchased(false);
      setPurchaseMessage(null);
      setPurchaseError(null);

      try {
        const { data, error } = await supabase
          .from('scripts')
          .select(
            'id, title, genre, length, price_cents, description, created_at, owner_id'
          )
          .eq('id', id)
          .single();

        if (error || !data) {
          if (error) {
            console.error('Hata:', error.message);
          }
          setScript(null);
          return;
        }

        setScript(data);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!userError && user) {
          const { data: existingOrder, error: orderError } = await supabase
            .from('orders')
            .select('id, script_id, buyer_id, amount_cents, created_at')
            .eq('script_id', id)
            .eq('buyer_id', user.id)
            .maybeSingle();

          if (orderError) {
            console.error('Sipariş kontrol hatası:', orderError.message);
          } else if (existingOrder) {
            setHasPurchased(true);
          }
        }
      } catch (err) {
        console.error('Hata:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handlePurchase = async () => {
    if (!id || typeof id !== 'string') {
      setPurchaseError('Geçersiz senaryo.');
      return;
    }

    if (!script) {
      setPurchaseError('Satın alınacak senaryo bulunamadı.');
      return;
    }

    setPurchaseMessage(null);
    setPurchaseError(null);
    setIsPurchasing(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setPurchaseError('Satın alma işlemi için giriş yapmalısınız.');
        return;
      }

      const { error: orderError } = await supabase.from('orders').insert({
        script_id: id,
        buyer_id: user.id,
        amount_cents: script.price_cents,
      });

      if (orderError) {
        setPurchaseError(orderError.message || 'Satın alma işlemi başarısız.');
        return;
      }

      setPurchaseMessage('Satın alma işlemi başarıyla tamamlandı.');
      setHasPurchased(true);
    } catch (error) {
      console.error('Satın alma hatası:', error);
      setPurchaseError('Satın alma işlemi sırasında beklenmeyen bir hata oluştu.');
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
