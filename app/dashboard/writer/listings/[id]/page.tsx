'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { ProducerListing } from '@/types/db';

const currency = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 2,
});

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<ProducerListing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListing = async () => {
      const { data, error } = await supabase
        .from('producer_listings')
        .select('id, title, genre, description, budget_cents, created_at')
        .eq('id', id)
        .single();
      if (error) {
        console.error(error.message);
      }
      setListing(data as ProducerListing | null);
      setLoading(false);
    };
    fetchListing();
  }, [id]);

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>;
  if (!listing) return <p className="text-sm text-red-500">İlan bulunamadı.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🎬 {listing.title}</h1>
      <p className="text-sm text-[#7a5c36]">
        Tür: {listing.genre} · Bütçe: {currency.format(listing.budget_cents / 100)}
      </p>
      <div className="bg-white rounded-xl shadow p-6 border-l-4 border-[#f9c74f] space-y-4">
        <p className="text-[#4a3d2f]">{listing.description}</p>
        <div className="pt-6">
          <button className="btn btn-secondary" onClick={() => router.back()}>
            Geri Dön
          </button>
        </div>
      </div>
    </div>
  );
}

