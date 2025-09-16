'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Script = {
  id: string;
  title: string;
  genre: string;
  length?: number;
  synopsis?: string;
  user_id?: string;
  created_at?: string;
};

export default function MyScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchScripts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchScripts = async () => {
    setLoading(true);

    // Oturumdaki kullanıcıyı al
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
      // Oturum yoksa giriş sayfasına yönlendir
      router.push('/auth/sign-in');
      return;
    }

    // Sadece oturum açmış kullanıcıya ait senaryoları çek
    const { data, error } = await supabase
      .from('scripts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Veri alınamadı:', error.message);
      setScripts([]);
    } else {
      setScripts(data ?? []);
    }

    setLoading(false);
  };

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
      .eq('user_id', user.id);

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
