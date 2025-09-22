'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Link from 'next/link';
import { handleInterest as handleInterestAction } from './handle-interest';

type Script = {
  id: string;
  title: string;
  genre: string;
  length: number | null; // dakika varsayımı
  synopsis: string | null;
  created_at: string;
  price_cents: number | null;
  owner_id: string | null;
};

export default function BrowseScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const supabase = useMemo(getSupabaseClient, []);

  // Basit istemci tarafı filtre/sort state (şimdilik demo; sunucuya gönderilmiyor)
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('Tüm Türler');
  const [selectedLength, setSelectedLength] = useState<string>('Tüm Süreler');
  const [selectedPrice, setSelectedPrice] = useState<string>('Tüm Fiyatlar');
  const [selectedSort, setSelectedSort] = useState<string>('En Yeni');

  const [toast, setToast] = useState<
    { type: 'success' | 'error'; message: string } | null
  >(null);
  const [pendingInterestId, setPendingInterestId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback(
    (type: 'success' | 'error', message: string) => {
      setToast({ type, message });
    },
    []
  );

  const notifyWriterOfInterest = useCallback(
    async (params: { writerId: string; script: Script; producerId: string }) => {
      const { writerId, script, producerId } = params;

      if (!supabase) {
        return false;
      }

      try {
        const { error } = await supabase.rpc('enqueue_notification', {
          recipient_id: writerId,
          template: 'producer_interest_registered',
          payload: {
            script_id: script.id,
            script_title: script.title,
            producer_id: producerId,
          },
        });

        if (error) {
          throw error;
        }

        return true;
      } catch (error) {
        console.error('İlgi bildirimi kuyruğa eklenemedi:', error);
        return false;
      }
    },
    [supabase]
  );

  const fetchScripts = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    if (!supabase) {
      setScripts([]);
      setErrorMsg('Supabase istemcisi kullanılamıyor.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('scripts')
        .select(
          'id, title, genre, length, synopsis, created_at, price_cents, owner_id'
        )
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setScripts((data as Script[]) || []);
    } catch (e: any) {
      console.error('Veri alınamadı:', e?.message || e);
      setScripts([]);
      setErrorMsg(e?.message || 'Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await fetchScripts();
    })();
    return () => {
      mounted = false;
    };
  }, [fetchScripts]);

  const filtered = useMemo(() => {
    let arr = [...scripts];

    // Başlık arama
    if (search.trim()) {
      arr = arr.filter((s) =>
        s.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Tür filtresi
    if (selectedGenre !== 'Tüm Türler') {
      arr = arr.filter((s) =>
        (s.genre || '').toLowerCase().includes(selectedGenre.toLowerCase())
      );
    }

    // Süre filtresi
    if (selectedLength !== 'Tüm Süreler') {
      arr = arr.filter((s) => {
        const len = s.length ?? 0;
        if (selectedLength === '0-30 dk') return len <= 30;
        if (selectedLength === '31-90 dk') return len > 30 && len <= 90;
        if (selectedLength === '90+ dk') return len > 90;
        return true;
      });
    }

    // Fiyat filtresi
    if (selectedPrice !== 'Tüm Fiyatlar') {
      arr = arr.filter((s) => {
        const price = s.price_cents ?? 0;
        if (selectedPrice === '0-1000₺') return price <= 100000; // cents
        if (selectedPrice === '1000-5000₺')
          return price > 100000 && price <= 500000;
        if (selectedPrice === '5000₺+') return price > 500000;
        return true;
      });
    }

    // Sıralama
    if (selectedSort === 'En Yeni') {
      arr.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (selectedSort === 'Fiyat Artan') {
      arr.sort((a, b) => (a.price_cents ?? 0) - (b.price_cents ?? 0));
    } else if (selectedSort === 'Fiyat Azalan') {
      arr.sort((a, b) => (b.price_cents ?? 0) - (a.price_cents ?? 0));
    }

    return arr;
  }, [scripts, search, selectedGenre, selectedLength, selectedPrice, selectedSort]);

  const formatMinutes = (m: number | null) => {
    if (m == null) return '-';
    return `${m} dk`;
  };

  const formatPrice = (price: number | null) => {
    if (price == null) return 'Belirtilmemiş';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 2,
    }).format(price / 100);
  };

  const excerpt = (text: string | null, max = 180) => {
    if (!text) return 'Açıklama bulunmuyor.';
    return text.length > max ? text.slice(0, max).trim() + '…' : text;
  };

  const handleInterest = useCallback(
    async (script: Script) => {
      setPendingInterestId(script.id);
      try {
        await handleInterestAction(script, {
          supabase,
          notifyWriterOfInterest,
          showToast,
        });
      } catch (err) {
        console.error('İlgi kaydedilemedi:', err);
      } finally {
        setPendingInterestId(null);
      }
    },
    [notifyWriterOfInterest, showToast, supabase]
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed right-6 bottom-6 z-50 max-w-xs rounded-lg border px-4 py-3 text-sm shadow-lg transition-opacity ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
          role="status"
          aria-live={toast.type === 'success' ? 'polite' : 'assertive'}
        >
          <div className="flex items-start gap-3">
            <span aria-hidden className="text-lg">
              {toast.type === 'success' ? '✅' : '⚠️'}
            </span>
            <p className="flex-1 leading-5">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-xs font-semibold uppercase tracking-wide"
              aria-label="Bildirimi kapat"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">🔍 Senaryo Ara</h1>
          <p className="text-[#7a5c36]">
            İlgilendiğiniz türde senaryoları keşfedin. Dilerseniz filtreleme
            seçeneklerini kullanabilirsiniz.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchScripts}
          className="btn btn-secondary"
          aria-label="Listeyi yenile"
        >
          Yenile
        </button>
      </div>

      {/* Hata mesajı */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">
          {errorMsg}
        </div>
      )}

      {/* Filtreler */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          className="p-2 border rounded-lg flex-1 min-w-[150px]"
          placeholder="Başlık ara"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Başlık arama"
        />

        <select
          className="p-2 border rounded-lg"
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          aria-label="Tür filtreleme"
        >
          <option>Tüm Türler</option>
          <option>Dram</option>
          <option>Komedi</option>
          <option>Gerilim</option>
          <option>Bilim Kurgu</option>
          <option>Belgesel</option>
        </select>

        <select
          className="p-2 border rounded-lg"
          value={selectedLength}
          onChange={(e) => setSelectedLength(e.target.value)}
          aria-label="Süre filtreleme"
        >
          <option>Tüm Süreler</option>
          <option>0-30 dk</option>
          <option>31-90 dk</option>
          <option>90+ dk</option>
        </select>

        <select
          className="p-2 border rounded-lg"
          value={selectedPrice}
          onChange={(e) => setSelectedPrice(e.target.value)}
          aria-label="Fiyat filtreleme"
        >
          <option>Tüm Fiyatlar</option>
          <option>0-1000₺</option>
          <option>1000-5000₺</option>
          <option>5000₺+</option>
        </select>

        <select
          className="p-2 border rounded-lg"
          value={selectedSort}
          onChange={(e) => setSelectedSort(e.target.value)}
          aria-label="Sıralama"
        >
          <option>En Yeni</option>
          <option>Fiyat Artan</option>
          <option>Fiyat Azalan</option>
        </select>
      </div>

      {/* Senaryo Kartları */}
      {loading ? (
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">
          Filtrenize uyan senaryo bulunamadı.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <div className="card space-y-2" key={s.id}>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="text-sm text-[#7a5c36]">
                Tür: {s.genre || '-'} · Süre: {formatMinutes(s.length)} · Fiyat:{' '}
                {formatPrice(s.price_cents)}
              </p>
              <p className="text-sm text-[#4a3d2f]">{excerpt(s.synopsis)}</p>
              <div
                className="flex gap-2 mt-2"
                data-test-id={`script-${s.id}-interest-actions`}
              >
                <button
                  className="btn btn-primary"
                  onClick={() => handleInterest(s)}
                  disabled={pendingInterestId === s.id}
                  aria-busy={pendingInterestId === s.id}
                >
                  {pendingInterestId === s.id ? 'Kaydediliyor…' : 'İlgi Göster'}
                </button>
                <Link
                  href={`/dashboard/producer/scripts/${s.id}`}
                  className="btn btn-secondary"
                >
                  Detaylar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
