'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ScriptDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [script, setScript] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScript();
  }, []);

  const fetchScript = async () => {
    const { data, error } = await supabase
      .from('scripts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Hata:', error.message);
    } else {
      setScript(data);
    }
    setLoading(false);
  };

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>;
  if (!script)
    return <p className="text-sm text-red-500">Senaryo bulunamadı.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🎬 {script.title}</h1>
      <p className="text-sm text-[#7a5c36]">
        Tür: {script.genre} &middot; Süre: {script.duration}
      </p>

      <div className="bg-white rounded-xl shadow p-6 border-l-4 border-[#f9c74f] space-y-4">
        <h2 className="text-lg font-semibold">Senaryo Açıklaması</h2>
        <p className="text-[#4a3d2f]">{script.description}</p>

        <div className="pt-6">
          <button className="btn btn-secondary" onClick={() => router.back()}>
            Geri Dön
          </button>
        </div>
      </div>
    </div>
  );
}
