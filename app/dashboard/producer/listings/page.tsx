'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { VListingUnified } from '@/types/db';

const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
});

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
});

const budgetLabel = (budget: number | null | undefined) => {
  if (typeof budget === 'number') {
    return currencyFormatter.format(budget);
  }
  return 'Belirtilmemiş';
};

const formatDeadline = (deadline: string | null | undefined) => {
  if (!deadline) {
    return '—';
  }
  return deadline.slice(0, 10);
};

const getListingBadge = (listing: VListingUnified) => {
  const listingType = listing.status ?? listing.source;

  if (listingType === 'request') {
    return 'Talep';
  }

  if (listingType === 'producer_listing') {
    return 'Yapımcı İlanı';
  }

  return null;
};

export default function ProducerListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<VListingUnified[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(getSupabaseClient, []);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      setError(null);

      if (!supabase) {
        setListings([]);
        setError('Supabase istemcisi kullanılamıyor.');
        setLoading(false);
        return;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        router.push('/auth/sign-in');
        setLoading(false);
        return;
      }

      const { data, error: listingsError } = await supabase
        .from('v_listings_unified')
        .select(
          'id,owner_id,title,genre,description,budget,created_at,deadline,status,source'
        )
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (listingsError) {
        setError(listingsError.message);
      } else {
        setListings((data ?? []) as VListingUnified[]);
      }

      setLoading(false);
    };

    fetchListings();
  }, [router, supabase]);

  return (
    <AuthGuard allowedRoles={['producer']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">🎬 İlanlarım</h1>
            <p className="text-sm text-[#7a5c36]">
              Yayınladığınız yapımcı ilanlarını buradan yönetebilirsiniz.
            </p>
          </div>
          <Link
            href="/dashboard/producer/listings/new"
            className="inline-flex items-center px-4 py-2 bg-[#0e5b4a] text-white rounded-lg hover:bg-[#0b4638] transition"
          >
            ➕ Yeni İlan
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-[#7a5c36]">İlanlar yükleniyor...</p>
        ) : error ? (
          <p className="text-sm text-red-600">❌ {error}</p>
        ) : listings.length === 0 ? (
          <div className="p-6 bg-white border border-dashed rounded-lg text-center space-y-2">
            <p className="text-lg font-semibold">Henüz ilanınız yok.</p>
            <p className="text-sm text-[#7a5c36]">
              İlk ilanınızı oluşturarak yazarlarla bağlantı kurmaya başlayın.
            </p>
            <Link
              href="/dashboard/producer/listings/new"
              className="inline-flex items-center justify-center px-4 py-2 bg-[#ffaa06] text-white rounded-lg hover:bg-[#e69900] transition"
            >
              İlk ilanını oluştur
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {listings.map((listing) => (
              <li key={listing.id}>
                <Link
                  href={`/dashboard/producer/listings/${listing.id}`}
                  className="block p-4 bg-white border rounded-lg shadow-sm space-y-2 hover:border-[#0e5b4a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e5b4a]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-[#0e5b4a]">
                      {listing.title}
                    </h2>
                    <span className="text-sm font-medium text-[#ffaa06]">
                      {budgetLabel(listing.budget)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-[#7a5c36]">
                    <span>Tür: {listing.genre}</span>
                    <span>
                      Oluşturuldu: {dateFormatter.format(new Date(listing.created_at))}
                    </span>
                    <span>Son teslim: {formatDeadline(listing.deadline)}</span>
                    {listing.source === 'request' ? (

                      <span className="text-xs uppercase tracking-wide text-[#a38d6d]">
                        {getListingBadge(listing)}
                      </span>
                    ) : null}
                  </div>
                  {listing.description ? (
                    <p className="text-sm text-[#4f3d2a]">{listing.description}</p>
                  ) : (
                    <p className="text-sm text-[#a38d6d]">Açıklama bulunamadı.</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AuthGuard>
  );
}
