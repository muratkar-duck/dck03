'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { ProducerListing } from '@/types/db';

const currency = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 2,
});

export default function BrowseListingsPage() {
  const [listings, setListings] = useState<ProducerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Tüm Türler');

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('producer_listings')
        .select('id, title, genre, description, budget_cents, created_at')
        .order('created_at', { ascending: false });
      if (error) {
        setError(error.message);
        setListings([]);
      } else {
        setListings((data as ProducerListing[]) || []);
      }
      setLoading(false);
    };
    fetchListings();
  }, []);

  const filtered = useMemo(() => {
    let arr = [...listings];
    if (search.trim()) {
      arr = arr.filter((l) =>
        l.title.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (selectedGenre !== 'Tüm Türler') {
      arr = arr.filter((l) =>
        (l.genre || '').toLowerCase().includes(selectedGenre.toLowerCase())
      );
    }
    return arr;
  }, [listings, search, selectedGenre]);

  const excerpt = (text: string, max = 160) =>
    text.length > max ? text.slice(0, max).trim() + '…' : text;

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
                Tür: {l.genre} · Bütçe: {currency.format(l.budget_cents / 100)}
              </p>
              {l.description && (
                <p className="text-sm text-[#4a3d2f]">{excerpt(l.description)}</p>
              )}
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

