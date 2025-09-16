'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AuthGuard from '@/components/AuthGuard';

type Script = {
  id: string;
  title: string;
  genre: string | null;
  length: string | number | null;
  synopsis: string | null;
  created_at: string;
  owner_id: string;
  description: string | null;
  price_cents: number | null;
  // Not: Şu an veri modelinizde dosya yolu alanı yok.
  // İleride storage kullanırsak ör. file_path veya pdf_url ekleyebiliriz.
};

export default function ProducerScriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [script, setScript] = useState<Script | null>(null);

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso));

  const formatPrice = (price: number | null) => {
    if (price == null) return 'Belirtilmemiş';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 2,
    }).format(price / 100);
  };

  const fetchAll = useCallback(async (scriptId: string) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // 1) Giriş yapan yapımcıyı al
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) {
        setErrorMsg('Giriş yapılmamış görünüyor.');
        return;
      }

      // 2) Erişim kontrolü: Bu yapımcı, bu script için "ACCEPTED" başvuruya sahip mi?
      const { data: gateRows, error: gateErr } = await supabase
        .from('applications')
        .select('id, requests!inner(producer_id)')
        .eq('script_id', scriptId)
        .eq('status', 'accepted')
        .eq('requests.producer_id', user.id)
        .limit(1);

      if (gateErr) throw gateErr;

      const allowed = Array.isArray(gateRows) && gateRows.length > 0;
      setHasAccess(allowed);

      // 3) Script detayını çek
      const { data: scData, error: scErr } = await supabase
        .from('scripts')
        .select(
          'id, title, genre, length, synopsis, description, price_cents, created_at, owner_id'
        )
        .eq('id', scriptId)
        .single();

      if (scErr) throw scErr;
      setScript(scData as Script);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || 'Veriler alınırken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) fetchAll(id);
  }, [id, fetchAll]);

  if (loading) {
    return (
      <AuthGuard allowedRoles={['producer']}>
        <p>Yükleniyor...</p>
      </AuthGuard>
    );
  }

  if (!script) {
    return (
      <AuthGuard allowedRoles={['producer']}>
        <div className="space-y-3">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">
              {errorMsg}
            </div>
          )}
          <p>Senaryo bulunamadı.</p>
          <button className="btn btn-secondary" onClick={() => router.back()}>
            ← Geri
          </button>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles={['producer']}>
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{script.title}</h1>
            <p className="text-sm text-gray-600">
              Tür: {script.genre || '—'} · Süre: {script.length ?? '—'} · Fiyat:{' '}
              {formatPrice(script.price_cents)}
            </p>
            <p className="text-xs text-gray-400">
              Oluşturulma: {fmtDate(script.created_at)}
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => id && fetchAll(id)}
          >
            Yenile
          </button>
        </div>

        {!hasAccess ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
            Bu senaryonun tamamına erişim yetkiniz bulunmuyor.
            <div className="mt-2 text-xs text-gray-600">
              Not: Erişim, yalnızca bu senaryoya ait <b>kabul edilmiş</b>{' '}
              başvurular için açılır.
            </div>
            <button
              className="btn btn-secondary mt-3"
              onClick={() => router.back()}
            >
              ← İlan Detayına Dön
            </button>
          </div>
        ) : (
          <>
            {/* Senaryo özeti (mevcut alan) */}
            <div className="rounded-lg border p-4 bg-white/80">
              <h2 className="text-lg font-semibold mb-2">Senaryonun Özeti</h2>
              <p className="text-[#4a3d2f] whitespace-pre-wrap">
                {script.synopsis || 'Özet bulunamadı.'}
              </p>
            </div>

            <div className="rounded-lg border p-4 bg-white/80">
              <h2 className="text-lg font-semibold mb-2">Senaryonun Açıklaması</h2>
              <p className="text-[#4a3d2f] whitespace-pre-wrap">
                {script.description || 'Açıklama bulunamadı.'}
              </p>
            </div>

            {/* 👇 YENİ: PDF / Ek Dosyalar için yer hazır */}
            <div className="rounded-lg border p-4 bg-white/80">
              <h2 className="text-lg font-semibold mb-2">
                Ek Dosyalar (hazır alan)
              </h2>
              <p className="text-sm text-gray-600">
                Burada PDF/dosya görüntüleme veya indirme butonu yer alacak.
              </p>
              {/* 
                İLERİDE:
                - Supabase Storage'a 'scripts' bucketı aç.
                - Dosya yolu olarak ör. scripts/{script.id}.pdf yükle.
                - Burada signed URL üret: 
                    const { data } = await supabase
                      .storage.from('scripts')
                      .createSignedUrl(`$${script.id}.pdf`, 60);
                - Sonra bir <a href={data?.signedUrl} className="btn btn-primary">PDF'yi İndir</a> göster.
              */}
              <button className="btn btn-primary mt-2" disabled>
                PDF’yi İndir (yakında)
              </button>
            </div>
          </>
        )}
      </div>
    </AuthGuard>
  );
}
