'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Script = {
  id: string;
  title: string;
  genre: string;
  length: number; // Supabase alanı
  synopsis: string; // Supabase alanı
  user_id: string;
};

export default function ScriptDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchScript();
  }, [id]);

  const fetchScript = async () => {
    const { data, error } = await supabase
      .from('scripts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Veri alınamadı:', error.message);
    } else {
      setScript(data);
    }
    setLoading(false);
  };

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>;
  if (!script)
    return <p className="text-sm text-gray-500">Senaryo bulunamadı.</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-bold">{script.title}</h1>
      <p className="text-[#7a5c36] text-lg">
        Tür: {script.genre} &middot; Süre: {script.length} dakika
      </p>
      <p className="text-[#4a3d2f] whitespace-pre-line">{script.synopsis}</p>

      <div className="flex gap-2 mt-6">
        <button
          className="px-4 py-2 bg-[#ffaa06] text-white rounded-lg hover:bg-[#e69900] transition"
          onClick={() =>
            router.push(`/dashboard/writer/scripts/edit/${script.id}`)
          }
        >
          Düzenle
        </button>
        <button
          className="px-4 py-2 bg-gray-300 text-black rounded-lg hover:bg-gray-400 transition"
          onClick={() => router.push('/dashboard/writer/scripts')}
        >
          Listeye Dön
        </button>
      </div>
    </div>
  );
}
