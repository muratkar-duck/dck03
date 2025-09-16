'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';

type Request = {
  id: string;
  title: string;
  description: string;
  genre: string;
  length: string;
  budget: string | null;
  created_at: string;
  user_id: string; // ilanı açan yapımcı
};

type Application = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  script: {
    id: string;
    title: string;
    genre: string;
    length: number | null;
    price_cents: number | null;
  } | null;
  writer: {
    id: string;
    username: string | null;
    email?: string | null;
  } | null;
};

export default function ProducerRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<Request | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchRequest(id);
      fetchApplications(id);
    }
  }, [id]);

  const fetchRequest = async (requestId: string) => {
    const { data, error } = await supabase
      .from('requests')
      .select(
        'id, title, description, genre, length, budget, created_at, user_id, producer_id'
      )
      .eq('id', requestId)
      .single();

    if (!error && data) {
      setRequest(data);
    }
    setLoading(false);
  };

  const fetchApplications = async (requestId: string) => {
    const { data, error } = await supabase
      .from('applications')
      .select(
        `
        id,
        request_id,
        listing_id,
        writer_id,
        status,
        script:scripts ( id, title, genre, length, price_cents ),
        writer:users ( id, email )
      `
      )
      .eq('request_id', requestId);

    if (!error && data) {
      // Supabase ilişkiler array döndürebilir → tek elemana indir
      const cleaned = (data as any[]).map((row) => {
        const script = row.script?.[0] || null;

        return {
          id: row.id,
          status: row.status,
          script:
            script !== null
              ? {
                  ...script,
                  length:
                    typeof script.length === 'number'
                      ? script.length
                      : script.length != null
                      ? Number(script.length)
                      : null,
                  price_cents:
                    typeof script.price_cents === 'number'
                      ? script.price_cents
                      : script.price_cents != null
                      ? Number(script.price_cents)
                      : null,
                }
              : null,
          writer: row.writer?.[0] || null,
        };
      }) as Application[];

      setApplications(cleaned);
    }
  };

  const handleDecision = async (
    applicationId: string,
    decision: 'accepted' | 'rejected'
  ) => {
    const { error: updateError } = await supabase
      .from('applications')
      .update({ status: decision })
      .eq('id', applicationId);

    if (updateError) {
      alert('❌ Güncelleme hatası: ' + updateError.message);
      return;
    }

    if (decision === 'accepted') {
      const { error: upsertError } = await supabase
        .from('conversations')
        .upsert(
          { application_id: applicationId },
          { onConflict: 'application_id' }
        );

      if (upsertError) {
        console.error(upsertError);
        alert('❌ Sohbet başlatma hatası: ' + upsertError.message);
      }
    }

    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId ? { ...app, status: decision } : app
      )
    );
  };

  const getBadge = (status: string) => {
    if (status === 'accepted')
      return (
        <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded">
          Kabul
        </span>
      );
    if (status === 'rejected')
      return (
        <span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded">
          Red
        </span>
      );
    return (
      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
        Beklemede
      </span>
    );
  };

  const formatPrice = (priceCents: number | null | undefined) => {
    if (priceCents == null) {
      return '—';
    }

    return (priceCents / 100).toLocaleString('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    });
  };

  if (loading) {
    return (
      <AuthGuard allowedRoles={['producer']}>
        <p>Yükleniyor...</p>
      </AuthGuard>
    );
  }

  if (!request) {
    return (
      <AuthGuard allowedRoles={['producer']}>
        <p>İlan bulunamadı.</p>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles={['producer']}>
      <div className="space-y-6">
        {/* İlan detayları */}
        <h1 className="text-2xl font-bold">{request.title}</h1>
        <p className="text-[#7a5c36]">{request.description}</p>
        <p className="text-sm text-gray-600">
          Tür: {request.genre} · Süre: {request.length}{' '}
          {request.budget && <>· Bütçe: {request.budget}</>}
        </p>
        <p className="text-xs text-gray-400">
          Yayınlanma: {new Date(request.created_at).toLocaleDateString('tr-TR')}
        </p>

        {/* Başvurular listesi */}
        <h2 className="text-xl font-semibold mt-6">📩 Gelen Başvurular</h2>
        {applications.length === 0 ? (
          <p className="text-gray-600">Henüz başvuru yapılmamış.</p>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="border rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{app.script?.title || '—'}</p>
                  <p className="text-sm text-gray-600">
                    Yazar: {app.writer?.email || 'Bilinmiyor'} · Tür:{' '}
                    {app.script?.genre || '—'} · Süre:{' '}
                    {app.script?.length ?? '—'} · Fiyat:{' '}
                    {formatPrice(app.script?.price_cents)}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-2">
                    Durum: {getBadge(app.status)}
                  </p>
                </div>

                {/* Aksiyonlar */}
                {app.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDecision(app.id, 'accepted')}
                      className="btn btn-success"
                    >
                      ✅ Kabul Et
                    </button>
                    <button
                      onClick={() => handleDecision(app.id, 'rejected')}
                      className="btn btn-danger"
                    >
                      ❌ Reddet
                    </button>
                  </div>
                ) : app.status === 'accepted' ? (
                  <div className="flex gap-2">
                    {/* ✅ Accepted → Sohbet */}
                    <Link
                      href={`/dashboard/producer/messages?application=${app.id}`}
                      className="btn btn-primary"
                    >
                      💬 Sohbeti Aç
                    </Link>
                    <Link
                      href={`/dashboard/producer/scripts/${
                        app.script?.id || ''
                      }`}
                      className="btn btn-secondary"
                    >
                      Senaryoya Git
                    </Link>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {/* Reddedildiyse yine de detaylara gitme imkanı */}
                    <Link
                      href={`/dashboard/producer/scripts/${
                        app.script?.id || ''
                      }`}
                      className="btn btn-secondary"
                    >
                      Senaryoya Git
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
