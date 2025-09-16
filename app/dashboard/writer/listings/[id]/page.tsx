'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { ProducerListing } from '@/types/db';

type WriterScriptOption = {
  id: string;
  title: string;
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

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<ProducerListing | null>(null);
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
        setSelectedScript((prev) => {
          if (prev && typedScripts.some((script) => script.id === prev)) {
            return prev;
          }
          return typedScripts[0]?.id ?? '';
        });
      }

      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('id, listing_id, writer_id, script_id, status, created_at')
        .eq('listing_id', id)
        .eq('writer_id', user.id)
        .maybeSingle();

      if (appError) {
        console.error(appError.message);
      }

      if (appData) {
        const application = appData as ListingApplication;
        setExistingApplication(application);
        setSelectedScript(application.script_id);
      } else {
        setExistingApplication(null);
      }
    };

    fetchWriterResources();
  }, [id]);

  const handleApply = async () => {
    if (!selectedScript) {
      alert('Lütfen bir senaryo seçin.');
      return;
    }

    if (existingApplication || submitting) return;

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

    const { data, error } = await supabase
      .from('applications')
      .insert({
        listing_id: id,
        writer_id: user.id,
        script_id: selectedScript,
        status: 'pending',
      })
      .select('id, listing_id, writer_id, script_id, status, created_at')
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
        Tür: {listing.genre} · Bütçe: {currency.format(listing.budget_cents / 100)}
      </p>
      <div className="bg-white rounded-xl shadow p-6 border-l-4 border-[#f9c74f] space-y-4">
        <p className="text-[#4a3d2f]">{listing.description}</p>
        <div className="pt-4 space-y-3 border-t border-[#f3e5ab]">
          <label className="text-sm font-semibold text-[#4a3d2f]" htmlFor="script-select">
            Senaryonu Seç
          </label>
          <select
            id="script-select"
            className="w-full p-2 border rounded-lg bg-white"
            value={selectedScript}
            onChange={(event) => setSelectedScript(event.target.value)}
            disabled={!!existingApplication || scripts.length === 0 || submitting}
          >
            <option value="" disabled>
              Bir senaryo seçin
            </option>
            {scripts.map((script) => (
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
          <button
            className="btn btn-primary"
            onClick={handleApply}
            disabled={
              !!existingApplication || !selectedScript || submitting || scripts.length === 0
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

