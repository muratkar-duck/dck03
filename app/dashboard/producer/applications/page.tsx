'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabaseClient';

type ApplicationRow = {
  application_id: string;
  status: string;
  created_at: string;
  request_id: string;
  request_title: string;
  script_id: string;
  script_title: string;
  script_genre: string;
  length: number | null;
  price_cents: number | null;
};

export default function ProducerApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        created_at,
        request_id,
        script_id,
        requests!inner(id, title),
        scripts!inner(id, title, genre, length, price_cents)
      `)
      .eq('producer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Başvurular alınamadı:', error.message);
      setApplications([]);
    } else {
      // Veriyi düzenle
      const formatted = (data || []).map((item: any) => ({
        application_id: item.id,
        status: item.status,
        created_at: item.created_at,
        request_id: item.request_id,
        request_title: item.requests?.title || '',
        script_id: item.script_id,
        script_title: item.scripts?.title || '',
        script_genre: item.scripts?.genre || '',
        length:
          typeof item.scripts?.length === 'number'
            ? item.scripts.length
            : item.scripts?.length != null
            ? Number(item.scripts.length)
            : null,
        price_cents:
          typeof item.scripts?.price_cents === 'number'
            ? item.scripts.price_cents
            : item.scripts?.price_cents != null
            ? Number(item.scripts.price_cents)
            : null,
      }));
      setApplications(formatted);
    }

    setLoading(false);
  };

  const formatPrice = (priceCents: number | null) => {
    if (priceCents == null) {
      return '—';
    }

    return (priceCents / 100).toLocaleString('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    });
  };

  const handleDecision = async (
    applicationId: string,
    decision: 'accepted' | 'rejected'
  ) => {
    const { error } = await supabase
      .from('applications')
      .update({ status: decision })
      .eq('id', applicationId);

    if (error) {
      alert('❌ Güncelleme hatası: ' + error.message);
    } else {
      alert(
        `✅ Başvuru ${decision === 'accepted' ? 'kabul edildi' : 'reddedildi'}`
      );
      fetchApplications(); // Listeyi yenile
    }
  };

  const getBadge = (status: string) => {
    if (status === 'accepted')
      return (
        <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded">
          Kabul Edildi
        </span>
      );
    if (status === 'rejected')
      return (
        <span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded">
          Reddedildi
        </span>
      );
    return (
      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
        Beklemede
      </span>
    );
  };

  return (
    <AuthGuard allowedRoles={['producer']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">📩 İlanlarınıza Gelen Başvurular</h1>
        <p className="text-[#7a5c36]">
          İlanlarınıza gönderilen senaryo başvuruları burada listelenir.
        </p>

        {loading ? (
          <p className="text-sm text-[#a38d6d]">Yükleniyor...</p>
        ) : applications.length === 0 ? (
          <p className="text-sm text-[#a38d6d]">
            Henüz ilanınıza gelen başvuru yok.
          </p>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.application_id} className="card">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h2 className="text-lg font-semibold">
                      🎬 Senaryo:{' '}
                      <span className="text-[#0e5b4a]">{app.script_title}</span>
                    </h2>
                    <p className="text-sm text-[#7a5c36]">
                      Tür: {app.script_genre} · Süre:{' '}
                      {app.length ?? '—'}
                    </p>
                    <p className="text-sm text-[#7a5c36]">
                      Fiyat: {formatPrice(app.price_cents)}
                    </p>
                    <p className="text-sm text-[#7a5c36]">
                      İlan: {app.request_title}
                    </p>
                    <p className="text-xs text-[#a38d6d]">
                      Başvuru:{' '}
                      {new Date(app.created_at).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  {getBadge(app.status)}
                </div>

                {/* ✅ Pending başvurular için karar butonları */}
                {app.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() =>
                        handleDecision(app.application_id, 'accepted')
                      }
                      className="btn btn-primary"
                    >
                      ✅ Kabul Et
                    </button>
                    <button
                      onClick={() =>
                        handleDecision(app.application_id, 'rejected')
                      }
                      className="btn btn-secondary"
                    >
                      ❌ Reddet
                    </button>
                  </div>
                )}

                {/* Sabit butonlar */}
                <div className="mt-3 flex gap-2">
                  <button className="btn btn-secondary">Mesaj Gönder</button>
                  <button className="btn btn-primary">Detayları Gör</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
