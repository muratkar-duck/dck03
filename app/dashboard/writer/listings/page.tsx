'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { VListingUnified } from '@/types/supabase';

const currency = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 2,
});

const budgetLabel = (budget: number | null) => {
  if (typeof budget === 'number') {
    return currency.format(budget);
  }
  return 'Belirtilmemiş';
};

const normalizeListing = (row: any): VListingUnified => {
  const rawBudget = row?.budget;
  const normalizedBudget =
    typeof rawBudget === 'number'
      ? rawBudget
      : rawBudget != null && !Number.isNaN(Number(rawBudget))
      ? Number(rawBudget)
      : null;

  const rawSource = typeof row?.source === 'string' ? row.source.toLowerCase() : null;
  const normalizedSource = rawSource === 'request' ? 'request' : 'producer';

  return {
    id: row?.id != null ? String(row.id) : '',
    owner_id: row?.owner_id != null ? String(row.owner_id) : null,
    title: row?.title != null ? String(row.title) : '',
    description: row?.description != null ? String(row.description) : null,
    genre: row?.genre != null ? String(row.genre) : null,
    budget: normalizedBudget,
    created_at:
      row?.created_at != null ? String(row.created_at) : new Date().toISOString(),
    deadline: row?.deadline != null ? String(row.deadline) : null,
    status:
      typeof row?.status === 'string' && row.status.trim() !== ''
        ? row.status
        : null,
    source: normalizedSource,
  };
};

export default function BrowseListingsPage() {
  const [listings, setListings] = useState<VListingUnified[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Tüm Türler');
  const supabase = useMemo(getSupabaseClient, []);

  useEffect(() => {
    const fetchListings = async () => {
      if (!supabase) {
        setLoading(false);
        setError('Supabase istemcisi kullanılamıyor.');
        setListings([]);
        return;
      }

      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('v_listings_unified')
        .select('id, owner_id, title, genre, description, budget, created_at, source')
        .order('created_at', { ascending: false });
      if (error) {
        setError(error.message);
        setListings([]);
      } else {
        const rows = Array.isArray(data)
          ? data.map((item) => normalizeListing(item))
          : [];
        setListings(rows);
      }
      setLoading(false);
    };
    fetchListings();
  }, [supabase]);

  const filtered = useMemo(() => {
    let arr = [...listings];
    if (search.trim()) {
      arr = arr.filter((l) =>
        (l.title || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    if (selectedGenre !== 'Tüm Türler') {
      arr = arr.filter((l) =>
        (l.genre || '').toLowerCase().includes(selectedGenre.toLowerCase())
      );
    }
    return arr;
  }, [listings, search, selectedGenre]);

  const excerpt = (text: string | null, max = 160) => {
    if (!text) return '—';
    return text.length > max ? text.slice(0, max).trim() + '…' : text;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">🎯 Yapımcı İlanları</h1>
          <p className="text-[#7a5c36]">
            Yazarlar için açılmış yapımcı ilanlarına göz atın.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">❌ {error}</p>
      )}

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
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">Uygun ilan bulunamadı.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((l) => (
            <div className="card space-y-2" key={l.id}>
              <h2 className="text-lg font-semibold">{l.title}</h2>
              <p className="text-sm text-[#7a5c36]">
                Tür: {l.genre} · Bütçe: {budgetLabel(l.budget ?? null)}
              </p>
              <p className="text-sm text-[#4a3d2f]">{excerpt(l.description)}</p>
              <div className="mt-2">
                <Link
                  href={`/dashboard/writer/listings/${l.id}`}
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

