'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

type Script = {
  id: string;
  title: string;
  genre: string;
  length?: number | null;
  synopsis?: string | null;
  owner_id?: string;
  description?: string | null;
  price_cents?: number | null;
  created_at?: string;
};

const formatPrice = (priceCents?: number | null) => {
  if (priceCents === null || priceCents === undefined) {
    return '—';
  }

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
};

export default function MyScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(getSupabaseClient, []);

  const fetchScripts = useCallback(async (ownerId: string, showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('scripts')
        .select(
          'id,title,genre,length,synopsis,description,price_cents,created_at'
        )
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Veri alınamadı:', error.message);
        setScripts([]);
      } else {
        setScripts(data ?? []);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [supabase]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const initialize = async () => {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) {
        console.error('Kullanıcı bilgisi alınamadı:', userErr.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        router.push('/auth/sign-in');
        return;
      }

      await fetchScripts(user.id, true);

      channel = supabase
        .channel(`scripts-owner-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'scripts',
            filter: `owner_id=eq.${user.id}`,
          },
          () => {
            fetchScripts(user.id);
          }
        )
        .subscribe();
    };

    initialize().catch((err) => {
      console.error('Beklenmeyen bir hata oluştu:', err);
      setLoading(false);
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [router, fetchScripts, supabase]);

  const handleDelete = async (id: string) => {
    const confirmed = confirm(
      'Bu senaryoyu silmek istediğinizden emin misiniz?'
    );
    if (!confirmed) return;

    // Tekrar güvenlik için oturumdaki kullanıcıyı al
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      alert('Kullanıcı doğrulanamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    // Sadece kendi kaydını silmesini sağla
    const { error } = await supabase
      .from('scripts')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id);

    if (error) {
      alert('Silme başarısız: ' + error.message);
    } else {
      setScripts((prev) => prev.filter((s) => s.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📚 Senaryolarım</h1>
      <p className="text-[#7a5c36]">
        Daha önce eklediğiniz senaryolar aşağıda listelenmiştir.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      ) : scripts.length === 0 ? (
        <p className="text-sm text-gray-500">Henüz senaryo eklenmemiş.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {scripts.map((s) => (
            <div key={s.id} className="card space-y-2">
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="text-sm text-[#7a5c36]">
                Tür: {s.genre} {s.length ? `· Süre: ${s.length} dk` : ''}
              </p>
              <p className="text-sm text-[#4a3d2f]">{s.synopsis ?? ''}</p>
              <p className="text-sm font-medium text-[#4a3d2f]">
                Fiyat: {formatPrice(s.price_cents)}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    router.push(`/dashboard/writer/scripts/${s.id}`)
                  }
                >
                  Detay
                </button>
                <button
                  className="btn btn-warning"
                  onClick={() =>
                    router.push(`/dashboard/writer/scripts/edit/${s.id}`)
                  }
                >
                  Düzenle
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(s.id)}
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
