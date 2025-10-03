'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getListingSourceLabel, getListingStatusLabel } from '@/lib/listings';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Link from 'next/link';

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

type UnifiedListing = {
  id: string;
  owner_id: string | null;
  title: string | null;
  description: string | null;
  genre: string | null;
  budget: number | null;
  created_at: string | null;
  deadline: string | null;
  status: string | null;
  source: string | null;
};

type FilterState = {
  search: string;
  genre: string;
  length: string;
  price: string;
  sort: string;
};

const createDefaultFilters = (): FilterState => ({
  search: '',
  genre: 'Tüm Türler',
  length: 'Tüm Süreler',
  price: 'Tüm Fiyatlar',
  sort: 'En Yeni',
});

export default function BrowseScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(true);
  const [scriptsErrorMsg, setScriptsErrorMsg] = useState<string | null>(null);
  const [listings, setListings] = useState<UnifiedListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsErrorMsg, setListingsErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scripts' | 'listings'>('scripts');
  const supabase = useMemo(getSupabaseClient, []);

  // Basit istemci tarafı filtre/sort state (şimdilik demo; sunucuya gönderilmiyor)
  const [filters, setFilters] = useState<FilterState>(() => createDefaultFilters());

  const [toast, setToast] = useState<
    { type: 'success' | 'error'; message: string } | null
  >(null);
  const [pendingInterestId, setPendingInterestId] = useState<string | null>(
    null
  );
  const interestedScriptIdsRef = useRef<Set<string>>(new Set());

  const updateFilter = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

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
        console.error('İlgi bildirimi tetiklenemedi:', error);
        return false;
      }
    },
    [supabase]
  );

  const fetchScripts = useCallback(async () => {
    setScriptsLoading(true);
    setScriptsErrorMsg(null);

    if (!supabase) {
      setScripts([]);
      setScriptsErrorMsg('Supabase istemcisi kullanılamıyor.');
      setScriptsLoading(false);
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
      setScriptsErrorMsg(e?.message || 'Beklenmeyen bir hata oluştu.');
    } finally {
      setScriptsLoading(false);
    }
  }, [supabase]);

  const fetchListings = useCallback(async () => {
    setListingsLoading(true);
    setListingsErrorMsg(null);

    if (!supabase) {
      setListings([]);
      setListingsErrorMsg('Supabase istemcisi kullanılamıyor.');
      setListingsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('v_listings_unified')
        .select(
          'id,owner_id,title,description,genre,budget,created_at,deadline,status,source'
        );

      if (error) throw error;
      setListings((data as UnifiedListing[]) || []);
    } catch (e: any) {
      console.error('İlanlar alınamadı:', e?.message || e);
      setListings([]);
      setListingsErrorMsg(e?.message || 'Beklenmeyen bir hata oluştu.');
    } finally {
      setListingsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchScripts();
    void fetchListings();
  }, [fetchListings, fetchScripts]);

  const resetFilters = useCallback(() => {
    setFilters(createDefaultFilters());
    void fetchScripts();
  }, [fetchScripts]);

  const filtered = useMemo(() => {
    let arr = [...scripts];

    // Başlık arama
    if (filters.search.trim()) {
      arr = arr.filter((s) =>
        s.title.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Tür filtresi
    if (filters.genre !== 'Tüm Türler') {
      arr = arr.filter((s) =>
        (s.genre || '').toLowerCase().includes(filters.genre.toLowerCase())
      );
    }

    // Süre filtresi
    if (filters.length !== 'Tüm Süreler') {
      arr = arr.filter((s) => {
        const len = s.length ?? 0;
        if (filters.length === '0-30 dk') return len <= 30;
        if (filters.length === '31-90 dk') return len > 30 && len <= 90;
        if (filters.length === '90+ dk') return len > 90;
        return true;
      });
    }

    // Fiyat filtresi
    if (filters.price !== 'Tüm Fiyatlar') {
      arr = arr.filter((s) => {
        const price = s.price_cents ?? 0;
        if (filters.price === '0-1000₺') return price <= 100000; // cents
        if (filters.price === '1000-5000₺')
          return price > 100000 && price <= 500000;
        if (filters.price === '5000₺+') return price > 500000;
        return true;
      });
    }

    // Sıralama
    if (filters.sort === 'En Yeni') {
      arr.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (filters.sort === 'Fiyat Artan') {
      arr.sort((a, b) => (a.price_cents ?? 0) - (b.price_cents ?? 0));
    } else if (filters.sort === 'Fiyat Azalan') {
      arr.sort((a, b) => (b.price_cents ?? 0) - (a.price_cents ?? 0));
    }

    return arr;
  }, [filters, scripts]);

  const isDefaultFilters = useMemo(() => {
    const defaults = createDefaultFilters();
    return (
      filters.search === defaults.search &&
      filters.genre === defaults.genre &&
      filters.length === defaults.length &&
      filters.price === defaults.price &&
      filters.sort === defaults.sort
    );
  }, [filters]);

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
        if (!supabase) {
          throw new Error('Supabase istemcisi kullanılamıyor.');
        }

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          showToast('error', 'Lütfen giriş yapın.');
          return;
        }

        if (!script.owner_id) {
          showToast('error', 'Senaryo sahibine ulaşılamadı.');
          return;
        }

        const alreadyInterested = interestedScriptIdsRef.current.has(script.id);

        const { error: markInterestError } = await supabase.rpc(
          'rpc_mark_interest',
          {
            p_script_id: script.id,
          }
        );

        if (markInterestError) {
          throw markInterestError;
        }

        if (alreadyInterested) {
          showToast(
            'success',
            `${script.title} senaryosuna olan ilginiz zaten kayıtlı.`
          );
          return;
        }

        const notified = await notifyWriterOfInterest({
          writerId: script.owner_id,
          script,
          producerId: user.id,
        });

        if (!notified) {
          showToast(
            'error',
            `${script.title} senaryosuna ilginiz kaydedildi ancak senaristi bilgilendirme denemesi başarısız oldu.`
          );
          return;
        }

        interestedScriptIdsRef.current.add(script.id);
        showToast(
          'success',
          `${script.title} senaryosuna ilgi gösterdiniz. Senarist bilgilendirildi.`
        );
      } catch (err: any) {
        console.error('İlgi kaydedilemedi:', err);
        showToast(
          'error',
          err?.message || 'İlgi kaydedilirken beklenmeyen bir hata oluştu.'
        );
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
          <h1 className="text-2xl font-bold">
            {activeTab === 'scripts' ? '🔍 Senaryo Ara' : '📋 İlanları İncele'}
          </h1>
          <p className="text-[#7a5c36]">
            {activeTab === 'scripts'
              ? 'İlgilendiğiniz türde senaryoları keşfedin. Dilerseniz filtreleme seçeneklerini kullanabilirsiniz.'
              : 'Yapımcılar için toplanmış ilanları keşfedin ve detaylarını inceleyin.'}
          </p>
        </div>
        {activeTab === 'scripts' ? (
          <button
            type="button"
            onClick={fetchScripts}
            className="btn btn-secondary"
            aria-label="Listeyi yenile"
          >
            Yenile
          </button>
        ) : (
          <button
            type="button"
            onClick={fetchListings}
            className="btn btn-secondary"
            aria-label="İlanları yenile"
          >
            Yenile
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b pb-2" role="tablist">
        <button
          type="button"
          role="tab"
          id="scripts-tab"
          className={`px-4 py-2 text-sm font-semibold rounded-t ${
            activeTab === 'scripts'
              ? 'bg-white border border-b-0 border-[#d6c1a6] text-[#4a3d2f]'
              : 'bg-[#f5efe6] text-[#7a5c36]'
          }`}
          aria-selected={activeTab === 'scripts'}
          onClick={() => setActiveTab('scripts')}
        >
          Senaryolar
        </button>
        <button
          type="button"
          role="tab"
          id="listings-tab"
          className={`px-4 py-2 text-sm font-semibold rounded-t ${
            activeTab === 'listings'
              ? 'bg-white border border-b-0 border-[#d6c1a6] text-[#4a3d2f]'
              : 'bg-[#f5efe6] text-[#7a5c36]'
          }`}
          aria-selected={activeTab === 'listings'}
          onClick={() => setActiveTab('listings')}
        >
          İlanlar
        </button>
      </div>

      {activeTab === 'scripts' ? (
        <div role="tabpanel" aria-labelledby="scripts-tab" className="space-y-6">
          {scriptsErrorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">
              {scriptsErrorMsg}
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-end gap-4">
            <input
              type="text"
              className="p-2 border rounded-lg flex-1 min-w-[150px]"
              placeholder="Başlık ara"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              aria-label="Başlık arama"
            />

            <select
              className="p-2 border rounded-lg"
              value={filters.genre}
              onChange={(e) => updateFilter('genre', e.target.value)}
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
              value={filters.length}
              onChange={(e) => updateFilter('length', e.target.value)}
              aria-label="Süre filtreleme"
            >
              <option>Tüm Süreler</option>
              <option>0-30 dk</option>
              <option>31-90 dk</option>
              <option>90+ dk</option>
            </select>

            <select
              className="p-2 border rounded-lg"
              value={filters.price}
              onChange={(e) => updateFilter('price', e.target.value)}
              aria-label="Fiyat filtreleme"
            >
              <option>Tüm Fiyatlar</option>
              <option>0-1000₺</option>
              <option>1000-5000₺</option>
              <option>5000₺+</option>
            </select>

            <select
              className="p-2 border rounded-lg"
              value={filters.sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              aria-label="Sıralama"
            >
              <option>En Yeni</option>
              <option>Fiyat Artan</option>
              <option>Fiyat Azalan</option>
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="btn btn-secondary"
              disabled={isDefaultFilters}
            >
              Filtreleri Kaldır
            </button>
          </div>

          {scriptsLoading ? (
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
                    Tür: {s.genre || '-'} · Süre: {formatMinutes(s.length)} ·
                    Fiyat: {formatPrice(s.price_cents)}
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
                      {pendingInterestId === s.id
                        ? 'Kaydediliyor…'
                        : 'İlgi Göster'}
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
      ) : (
        <div role="tabpanel" aria-labelledby="listings-tab" className="space-y-6">
          {listingsErrorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">
              {listingsErrorMsg}
            </div>
          )}

          {listingsLoading ? (
            <p className="text-sm text-gray-500">İlanlar yükleniyor...</p>
          ) : listings.length === 0 ? (
            <p className="text-sm text-gray-500">Henüz ilan bulunmuyor.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {listings.map((listing) => {
                const statusLabel =
                  getListingStatusLabel(listing.status) ??
                  (listing.status ? String(listing.status) : null);
                const sourceLabel =
                  getListingSourceLabel(listing.source) ??
                  (listing.source ? String(listing.source) : null);
                const formattedDeadline = listing.deadline
                  ? new Date(listing.deadline).toISOString().slice(0, 10)
                  : '—';
                return (
                  <div className="card space-y-3" key={listing.id}>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">
                        {listing.title || 'Başlıksız İlan'}
                      </h2>
                      <span className="text-xs font-medium uppercase tracking-wide text-[#7a5c36]">
                        {statusLabel || 'Durum Bilinmiyor'}
                      </span>
                    </div>
                    <p className="text-sm text-[#4a3d2f]">
                      {listing.description || 'Açıklama eklenmemiş.'}
                    </p>
                    <dl className="grid grid-cols-2 gap-2 text-sm text-[#7a5c36]">
                      <div>
                        <dt className="font-semibold">Tür</dt>
                        <dd>{listing.genre || 'Belirtilmemiş'}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold">Bütçe</dt>
                        <dd>
                          {listing.budget == null
                            ? 'Belirtilmemiş'
                            : new Intl.NumberFormat('tr-TR', {
                                style: 'currency',
                                currency: 'TRY',
                                maximumFractionDigits: 0,
                              }).format(listing.budget)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold">Son Tarih</dt>
                        <dd>{formattedDeadline}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold">Kaynak</dt>
                        <dd>{sourceLabel || 'Bilinmiyor'}</dd>
                      </div>
                    </dl>
                    <p className="text-xs text-gray-500">
                      Oluşturulma: {listing.created_at || '—'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
