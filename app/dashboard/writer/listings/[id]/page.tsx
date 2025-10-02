'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { VListingUnified } from '@/types/db';

type WriterScriptOption = {
  id: string;
  title: string;
  genre: string | null;
};

type ListingApplication = {
  id: string;
  script_id: string;
  status: string;
};

const currency = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 2,
});

const budgetLabel = (budgetCents: number | null | undefined) => {
  if (typeof budgetCents === 'number') {
    return currency.format(budgetCents / 100);
  }
  return 'Belirtilmemiş';
};

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<VListingUnified | null>(null);
  const [loading, setLoading] = useState(true);
  const [scripts, setScripts] = useState<WriterScriptOption[]>([]);
  const [selectedScript, setSelectedScript] = useState('');
  const [existingApplication, setExistingApplication] =
    useState<ListingApplication | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const previousScriptIdsRef = useRef<Set<string>>(new Set());
  const previousMatchingCountRef = useRef(0);
  const listingRef = useRef<VListingUnified | null>(null);
  const supabase = useMemo(getSupabaseClient, []);

  const normalizeGenre = (genre: string | null | undefined) =>
    genre?.trim().toLowerCase() ?? '';

  useEffect(() => {
    listingRef.current = listing;

    if (!listing) {
      previousMatchingCountRef.current = 0;
      return;
    }

    const listingGenre = normalizeGenre(listing.genre);
    const matchingCount = scripts.filter(
      (script) => normalizeGenre(script.genre) === listingGenre
    ).length;

    previousMatchingCountRef.current = matchingCount;
  }, [listing, scripts]);

  useEffect(() => {
    previousScriptIdsRef.current = new Set();
    previousMatchingCountRef.current = 0;
  }, [id]);

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('v_listings_unified')
        .select(
          'id, owner_id, title, genre, description, budget_cents, created_at, source'
        )
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.error(error.message);
      }
      setListing((data as VListingUnified | null) ?? null);
      setLoading(false);
    };
    fetchListing();
  }, [id, supabase]);

  const fetchWriterResources = useCallback(
    async (options?: { reason?: 'initial' | 'visibility' }) => {
      if (!id) return;

      if (!supabase) {
        return;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error(authError.message);
        return;
      }

      if (!user) return;

      const { data: scriptData, error: scriptError } = await supabase
        .from('scripts')
        .select('id, title, genre, length, price_cents, created_at')
        .eq('owner_id', user.id);

      if (scriptError) {
        console.error(scriptError.message);
        setScripts([]);
        setSelectedScript('');
        previousScriptIdsRef.current = new Set();
        previousMatchingCountRef.current = 0;
      } else {
        const typedScripts = (scriptData as WriterScriptOption[]) || [];
        setScripts(typedScripts);

        const hasNewScript = typedScripts.some(
          (script) => !previousScriptIdsRef.current.has(script.id)
        );

        const listingGenre = normalizeGenre(listingRef.current?.genre);
        const matchingCount = listingGenre
          ? typedScripts.filter(
              (script) => normalizeGenre(script.genre) === listingGenre
            ).length
          : 0;

        if (
          options?.reason === 'visibility' &&
          hasNewScript &&
          matchingCount > 0 &&
          previousMatchingCountRef.current === 0
        ) {
          alert('🎉 Senaryo eklendi! Uygun türdeki seçenek otomatik olarak seçildi.');
        }

        previousScriptIdsRef.current = new Set(
          typedScripts.map((script) => script.id)
        );
        previousMatchingCountRef.current = matchingCount;
      }

      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select(
          'id, listing_id, producer_listing_id, request_id, writer_id, script_id, status, created_at'
        )
        .eq('writer_id', user.id)
        .or(
          `listing_id.eq.${id},producer_listing_id.eq.${id},request_id.eq.${id}`
        )
        .order('created_at', { ascending: false })
        .limit(1);

      if (appError) {
        console.error(appError.message);
      }

      if (appData && appData.length > 0) {
        const application = appData[0] as ListingApplication & {
          script_id: string;
        };
        setExistingApplication(application);
        setSelectedScript(application.script_id);
      } else {
        setExistingApplication(null);
      }
    },
    [id, supabase]
  );

  useEffect(() => {
    fetchWriterResources({ reason: 'initial' });
  }, [fetchWriterResources]);

  useEffect(() => {
    const runRefreshCheck = () => {
      if (typeof window === 'undefined') return;

      const shouldRefresh = window.sessionStorage.getItem(
        'writerRefreshScriptsAfterNew'
      );

      if (shouldRefresh) {
        window.sessionStorage.removeItem('writerRefreshScriptsAfterNew');
        fetchWriterResources({ reason: 'visibility' });
      }
    };

    runRefreshCheck();

    const handleFocus = () => {
      runRefreshCheck();
    };

    const handlePopState = () => {
      runRefreshCheck();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [fetchWriterResources]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchWriterResources({ reason: 'visibility' });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchWriterResources]);

  const matchingScripts = useMemo(() => {
    if (!listing) return [] as WriterScriptOption[];

    const listingGenre = normalizeGenre(listing.genre);

    return scripts.filter(
      (script) => normalizeGenre(script.genre) === listingGenre
    );
  }, [listing, scripts]);

  useEffect(() => {
    if (!listing) return;

    setSelectedScript((prev) => {
      if (existingApplication) {
        return prev;
      }

      if (prev && matchingScripts.some((script) => script.id === prev)) {
        return prev;
      }

      return matchingScripts[0]?.id ?? '';
    });
  }, [listing, matchingScripts, existingApplication]);

  const handleApply = async () => {
    if (!selectedScript) {
      alert('Lütfen bir senaryo seçin.');
      return;
    }

    if (existingApplication || submitting) return;

    if (!listing) {
      alert('İlan bilgisi alınamadı.');
      return;
    }

    if (!supabase) {
      alert('Supabase istemcisi kullanılamıyor.');
      return;
    }

    const listingGenre = listing.genre?.trim().toLowerCase() ?? '';
    const selectedScriptDetails = scripts.find(
      (script) => script.id === selectedScript
    );

    if (
      selectedScriptDetails &&
      (selectedScriptDetails.genre?.trim().toLowerCase() ?? '') !== listingGenre
    ) {
      alert(
        'Seçtiğiniz senaryo bu ilanla aynı türde değil. Lütfen uygun türde bir senaryo seçin.'
      );
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error(authError.message);
      alert('Kullanıcı bilgisi alınamadı.');
      setSubmitting(false);
      return;
    }

    if (!user) {
      alert('Kullanıcı bulunamadı.');
      setSubmitting(false);
      return;
    }

    // Senaryo doğrulama (explicit sorgu)
    const { data: scriptRow, error: scriptRowError } = await supabase
      .from('scripts')
      .select('id, genre, owner_id')
      .eq('id', selectedScript)
      .single();

    if (scriptRowError) {
      console.error(scriptRowError.message);
      alert('Senaryo bilgisi doğrulanamadı: ' + scriptRowError.message);
      setSubmitting(false);
      return;
    }

    if (!scriptRow) {
      alert('Seçtiğiniz senaryo bulunamadı.');
      setSubmitting(false);
      return;
    }

    if (scriptRow.owner_id && scriptRow.owner_id !== user.id) {
      alert('Bu senaryo size ait görünmüyor.');
      setSubmitting(false);
      return;
    }

    const scriptGenre = scriptRow?.genre?.trim().toLowerCase() ?? '';
    if (listingGenre && scriptGenre !== listingGenre) {
      alert(
        'Seçtiğiniz senaryo bu ilanla aynı türde değil. Lütfen uygun türde bir senaryo seçin.'
      );
      setSubmitting(false);
      return;
    }

    // Başvuru payload'u
    const payload: Record<string, unknown> = {
      writer_id: user.id,
      script_id: selectedScript,
      status: 'pending',
      owner_id: listing?.owner_id ?? null,
    };

    if (listing?.source === 'request') {
      (payload as any).request_id = id;
      (payload as any).producer_id = listing?.owner_id ?? null;
    } else {
      (payload as any).listing_id = id;
      (payload as any).producer_listing_id = id;
    }

    const { data, error } = await supabase
      .from('applications')
      .insert(payload)
      .select(
        'id, listing_id, producer_listing_id, request_id, writer_id, script_id, status, created_at'
      )
      .single();

    if (error) {
      console.error(error.message);
      alert('Başvuru gönderilemedi: ' + error.message);
    } else if (data) {
      setExistingApplication(data as ListingApplication);
      alert('Başvurunuz başarıyla gönderildi!');
    }

    setSubmitting(false);
  };

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>;
  if (!listing) return <p className="text-sm text-red-500">İlan bulunamadı.</p>;

  const hasScripts = scripts.length > 0;
  const hasMatchingScripts = matchingScripts.length > 0;

  const matchingStateTestId = hasMatchingScripts
    ? 'matching-state-has-matches'
    : 'matching-state-empty';

  const handleNewScriptClick = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('writerRefreshScriptsAfterNew', 'true');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🎬 {listing.title}</h1>
      <p className="text-sm text-[#7a5c36]">
        Tür: {listing.genre} · Bütçe: {budgetLabel(listing.budget_cents)}
      </p>
      <div className="bg-white rounded-xl shadow p-6 border-l-4 border-[#f9c74f] space-y-4">
        <p className="text-[#4a3d2f]">
          {listing.description || 'Açıklama bulunamadı.'}
        </p>
        <div
          className="pt-4 space-y-3 border-t border-[#f3e5ab]"
          data-test-id={matchingStateTestId}
        >
          {hasMatchingScripts ? (
            <>
              <label
                className="text-sm font-semibold text-[#4a3d2f]"
                htmlFor="script-select"
              >
                Senaryonu Seç
              </label>
              <select
                id="script-select"
                className="w-full p-2 border rounded-lg bg-white"
                value={selectedScript}
                onChange={(event) => setSelectedScript(event.target.value)}
                disabled={!!existingApplication || submitting}
              >
                <option value="" disabled>
                  Bir senaryo seçin
                </option>
                {matchingScripts.map((script) => (
                  <option key={script.id} value={script.id}>
                    {script.title}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary"
                onClick={handleApply}
                disabled={
                  !!existingApplication || !selectedScript || submitting
                }
              >
                {submitting ? 'Gönderiliyor...' : 'Senaryomla Başvur'}
              </button>
              {existingApplication && (
                <p className="text-xs text-[#a38d6d]">
                  Bu ilana zaten başvurdun. Durum: {existingApplication.status}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-[#a38d6d]">
                {hasScripts
                  ? 'Bu ilanın türüyle eşleşen bir senaryon bulunmuyor. Aşağıdaki butonla yeni ve uygun türde bir senaryo oluşturabilirsin.'
                  : 'Henüz kaydedilmiş bir senaryon bulunmuyor. Yeni bir senaryo oluşturarak ilana uygun bir başvuru yapabilirsin.'}
              </p>
              <Link
                className="btn btn-secondary w-fit"
                href="/dashboard/writer/scripts/new"
                onClick={handleNewScriptClick}
              >
                Yeni Senaryo Oluştur
              </Link>
            </div>
          )}
        </div>
        <div className="pt-6">
          <button className="btn btn-secondary" onClick={() => router.back()}>
            Geri Dön
          </button>
        </div>
      </div>
    </div>
  );
}
