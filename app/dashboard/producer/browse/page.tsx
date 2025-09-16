'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Script = {
  id: string;
  title: string;
  genre: string;
  length: number | null; // dakika varsayımı
  synopsis: string | null;
  created_at: string;
  price_cents: number | null;
};

export default function BrowseScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Basit istemci tarafı filtre/sort state (şimdilik demo; sunucuya gönderilmiyor)
  const [selectedGenre, setSelectedGenre] = useState<string>('Tüm Türler');
  const [selectedFormat, setSelectedFormat] = useState<string>('Süre'); // Kısa/Uzun/Dizi vb. (elde veri yoksa no-op)
  const [selectedSort, setSelectedSort] = useState<string>('En Yeni');

  const fetchScripts = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('scripts')
        .select('id, title, genre, length, synopsis, created_at, price_cents')
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
  }, []);

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

    // Tür filtresi (basit eşleşme)
    if (selectedGenre !== 'Tüm Türler') {
      arr = arr.filter((s) =>
        (s.genre || '').toLowerCase().includes(selectedGenre.toLowerCase())
      );
    }

    // Format filtresi: elde net bir alan olmadığı için şimdilik no-op.
    // İleride script.type/format alanı gelirse burada filtreleriz.
    // if (selectedFormat !== 'Süre') { ... }

    // Sıralama
    if (selectedSort === 'En Yeni') {
      arr.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    // “En Çok Görüntülenen” gibi bir alan yok → şimdilik yalnızca “En Yeni”
    return arr;
  }, [scripts, selectedGenre, selectedFormat, selectedSort]);

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

  return (
    <div className="space-y-6">
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
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value)}
          aria-label="Format/Süre filtreleme"
        >
          <option>Süre</option>
          <option>Kısa Film</option>
          <option>Uzun Metraj</option>
          <option>Dizi</option>
          <option>Mini Dizi</option>
        </select>

        <select
          className="p-2 border rounded-lg"
          value={selectedSort}
          onChange={(e) => setSelectedSort(e.target.value)}
          aria-label="Sıralama"
        >
          <option>En Yeni</option>
          {/* <option>En Çok Görüntülenen</option>  // veri yoksa gizli tut */}
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
              <div className="flex gap-2 mt-2">
                {/* Not: “İlgilen” aksiyonu için henüz net bir endpoint/tablo verilmedi.
                    Şimdilik klikte kullanıcıya basit bir bildirim veriyoruz.
                    Endpoint hazır olduğunda buraya insert/RPC çağrısı eklenir. */}
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                      alert('Lütfen giriş yapın.');
                      return;
                    }
                    
                    // Basit bir favorites tablosu olduğunu varsayalım
                    // Şimdilik sadece bilgi verici mesaj
                    alert(`${s.title} senaryosuna ilgi gösterdiniz. Senarist bilgilendirilecek.`);
                  }}
                >
                  İlgi Göster
                </button>
                <Link
                  href={`/dashboard/producer/browse/${s.id}`}
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
