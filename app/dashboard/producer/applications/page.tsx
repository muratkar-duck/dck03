'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabaseClient';

type ApplicationRow = {
  application_id: string;
  status: string;
  created_at: string;
  listing_id: string;
  listing_title: string;
  script_id: string;
  script_title: string;
  script_genre: string;
  length: number | null;
  price_cents: number | null;
  conversation_id: string | null;
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
        listing_id,
        script_id,
        listing:v_listings_unified!inner(id, title, owner_id, source),
        scripts!inner(id, title, genre, length, price_cents),
        conversations(id)
      `)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Başvurular alınamadı:', error.message);
      setApplications([]);
    } else {
      // Veriyi düzenle
      const formatted = (data || []).map((item: any) => {
        const listing = Array.isArray(item.listing)
          ? item.listing[0]
          : item.listing;
        const script = Array.isArray(item.scripts)
          ? item.scripts[0]
          : item.scripts;
        const conversation = Array.isArray(item.conversations)
          ? item.conversations[0]
          : item.conversations;

        const normalizedLength =
          typeof script?.length === 'number'
            ? script.length
            : script?.length != null
            ? Number(script.length)
            : null;

        const normalizedPrice =
          typeof script?.price_cents === 'number'
            ? script.price_cents
            : script?.price_cents != null
            ? Number(script.price_cents)
            : null;

        return {
          application_id: item.id,
          status: item.status,
          created_at: item.created_at,
          listing_id: item.listing_id ?? listing?.id ?? '',
          listing_title: listing?.title ?? '',
          script_id: item.script_id ?? script?.id ?? '',
          script_title: script?.title ?? '',
          script_genre: script?.genre ?? '',
          length: normalizedLength,
          price_cents: normalizedPrice,
          conversation_id: conversation?.id ?? null,
        } as ApplicationRow;
      });
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
    const { error: updateError } = await supabase
      .from('applications')
      .update({ status: decision })
      .eq('id', applicationId);

    if (updateError) {
      alert('❌ Güncelleme hatası: ' + updateError.message);
      return;
    }

    let conversationError: string | null = null;

    if (decision === 'accepted') {
      const { data: applicationData, error: applicationFetchError } = await supabase
        .from('applications')
        .select('writer_id, owner_id')
        .eq('id', applicationId)
        .single();

      if (applicationFetchError) {
        console.error(applicationFetchError);
        conversationError = applicationFetchError.message;
      } else {
        const { data: conversationData, error: upsertError } = await supabase
          .from('conversations')
          .upsert(
            { application_id: applicationId },
            { onConflict: 'application_id' }
          )
          .select()
          .single();

        if (upsertError || !conversationData) {
          console.error(upsertError);
          conversationError = upsertError?.message || 'Sohbet oluşturulamadı';
        } else {
          const participants = [] as {
            conversation_id: string;
            user_id: string;
            role: 'writer' | 'producer';
          }[];

          if (applicationData?.writer_id) {
            participants.push({
              conversation_id: conversationData.id,
              user_id: applicationData.writer_id,
              role: 'writer',
            });
          }

          if (applicationData?.owner_id) {
            participants.push({
              conversation_id: conversationData.id,
              user_id: applicationData.owner_id,
              role: 'producer',
            });
          }

          if (participants.length > 0) {
            const { error: participantsError } = await supabase
              .from('conversation_participants')
              .upsert(participants, { onConflict: 'conversation_id,user_id' });

            if (participantsError) {
              console.error(participantsError);
              conversationError = participantsError.message;
            }
          }
        }
      }
    }

    if (conversationError) {
      alert(`⚠️ Başvuru kabul edildi ancak sohbet açılamadı: ${conversationError}`);
    } else {
      alert(
        `✅ Başvuru ${decision === 'accepted' ? 'kabul edildi' : 'reddedildi'}`
      );
    }

    fetchApplications(); // Listeyi yenile
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
                      İlan: {app.listing_title || '—'}
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
                  {app.conversation_id ? (
                    <Link
                      href={`/dashboard/producer/messages?c=${app.conversation_id}`}
                      className="btn btn-primary"
                    >
                      Sohbeti Aç
                    </Link>
                  ) : (
                    <span className="btn btn-secondary cursor-not-allowed opacity-60">
                      Sohbet Bekleniyor
                    </span>
                  )}
                  <Link
                    href={`/dashboard/producer/listings/${app.listing_id}`}
                    className="btn btn-secondary"
                  >
                    İlan Detayı
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
