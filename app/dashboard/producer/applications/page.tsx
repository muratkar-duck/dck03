'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { ensureConversationWithParticipants } from '@/lib/conversations';
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
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

    setCurrentUserId(user.id);

    const { data, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        created_at,
        listing_id,
        producer_listing_id,
        request_id,
        owner_id,
        producer_id,
        script_id,
        script_metadata,
        listing:v_listings_unified!inner(id, title, owner_id, source),
        scripts!inner(id, title, genre, length, price_cents),
        conversations(id)
      `)
      .or(
        [
          `and(listing_id.not.is.null,listing.owner_id.eq.${user.id})`,
          `and(producer_listing_id.not.is.null,listing.owner_id.eq.${user.id})`,
          `and(request_id.not.is.null,listing.owner_id.eq.${user.id})`,
        ].join(',')
      )
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

        const scriptMetadata =
          item.script_metadata && typeof item.script_metadata === 'object'
            ? (item.script_metadata as Record<string, any>)
            : null;

        const rawLength =
          script?.length ?? scriptMetadata?.length ?? null;
        const normalizedLength =
          typeof rawLength === 'number'
            ? rawLength
            : rawLength != null && !Number.isNaN(Number(rawLength))
            ? Number(rawLength)
            : null;

        const rawPrice =
          script?.price_cents ?? scriptMetadata?.price_cents ?? null;
        const normalizedPrice =
          typeof rawPrice === 'number'
            ? rawPrice
            : rawPrice != null && !Number.isNaN(Number(rawPrice))
            ? Number(rawPrice)
            : null;

        const rawListingId =
          item.listing_id ??
          item.producer_listing_id ??
          item.request_id ??
          listing?.id ??
          null;
        const resolvedListingId =
          rawListingId != null ? String(rawListingId) : '';

        const rawScriptId =
          item.script_id ?? script?.id ?? scriptMetadata?.id ?? null;
        const resolvedScriptId =
          rawScriptId != null ? String(rawScriptId) : '';

        const scriptTitle =
          (script?.title != null ? String(script.title) : null) ??
          (scriptMetadata?.title != null
            ? String(scriptMetadata.title)
            : '');

        const scriptGenre =
          (script?.genre != null ? String(script.genre) : null) ??
          (scriptMetadata?.genre != null
            ? String(scriptMetadata.genre)
            : '');

        const listingTitle =
          listing?.title != null ? String(listing.title) : '';

        const applicationId =
          item.id != null ? String(item.id) : '';

        const status = item.status != null ? String(item.status) : '';

        return {
          application_id: applicationId,
          status,
          created_at: item.created_at,
          listing_id: resolvedListingId,
          listing_title: listingTitle,
          script_id: resolvedScriptId,
          script_title: scriptTitle,
          script_genre: scriptGenre,
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

    let conversationId: string | null = null;

    let actingUserId = currentUserId;

    if (decision === 'accepted') {
      if (!actingUserId) {
        const {
          data: { user: freshUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          alert('❌ Oturum doğrulanamadı: ' + authError.message);
          return;
        }

        if (!freshUser) {
          alert('❌ Oturum doğrulanamadı. Lütfen tekrar giriş yapın.');
          return;
        }

        actingUserId = freshUser.id;
        setCurrentUserId(freshUser.id);
      }
    }

    if (decision === 'accepted' && actingUserId) {
      const { conversationId: ensuredConversationId, error } =
        await ensureConversationWithParticipants(
          supabase,
          applicationId,
          actingUserId
        );
      conversationError = error;
      conversationId = ensuredConversationId;
    }

    if (conversationError) {
      alert(`⚠️ Başvuru kabul edildi ancak sohbet açılamadı: ${conversationError}`);
    } else {
      alert(
        `✅ Başvuru ${decision === 'accepted' ? 'kabul edildi' : 'reddedildi'}`
      );
    }

    if (decision === 'accepted' && conversationId) {
      try {
        await router.push(`/dashboard/producer/messages?c=${conversationId}`);
        return;
      } catch (navigationError) {
        console.error('Failed to navigate to conversation view:', navigationError);
      }
    }

    fetchApplications(); // Listeyi yenile veya yönlendirme başarısız olursa yedek
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
