'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { Listing } from '@/types/db';

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
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [scripts, setScripts] = useState<WriterScriptOption[]>([]);
  const [selectedScript, setSelectedScript] = useState('');
  const [existingApplication, setExistingApplication] =
    useState<ListingApplication | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) {
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
      setListing((data as Listing | null) ?? null);
      setLoading(false);
    };
    fetchListing();
  }, [id]);

  useEffect(() => {
    const fetchWriterResources = async () => {
      if (!id) return;

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
      } else {
        const typedScripts = (scriptData as WriterScriptOption[]) || [];
        setScripts(typedScripts);
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
    };

    fetchWriterResources();
  }, [id]);

  const matchingScripts = useMemo(() => {
    if (!listing) return [] as WriterScriptOption[];

    const listingGenre = listing.genre?.trim().toLowerCase() ?? '';

    return scripts.filter((script) => {
      const scriptGenre = script.genre?.trim().toLowerCase() ?? '';
      return scriptGenre === listingGenre;
    });
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

    if (listing?.source === 'requests') {
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
        <div className="pt-4 space-y-3 border-t border-[#f3e5ab]">
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
            disabled={
              !!existingApplication ||
              submitting ||
              scripts.length === 0 ||
              matchingScripts.length === 0
            }
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
          {scripts.length === 0 && (
            <p className="text-xs text-[#a38d6d]">
              Henüz kaydedilmiş bir senaryon bulunmuyor.
            </p>
          )}
          {scripts.length > 0 && matchingScripts.length === 0 && (
            <p className="text-xs text-[#a38d6d]">
              Bu ilanın türüyle eşleşen kayıtlı bir senaryon bulunmuyor.
            </p>
          )}
          <button
            className="btn btn-primary"
            onClick={handleApply}
            disabled={
              !!existingApplication ||
              !selectedScript ||
              submitting ||
              matchingScripts.length === 0
            }
          >
            {submitting ? 'Gönderiliyor...' : 'Senaryomla Başvur'}
          </button>
          {existingApplication && (
            <p className="text-xs text-[#a38d6d]">
              Bu ilana zaten başvurdun. Durum: {existingApplication.status}
            </p>
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
