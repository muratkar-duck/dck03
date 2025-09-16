'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function NewScriptPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [length, setLength] = useState<number | ''>(''); // dakika
  const [synopsis, setSynopsis] = useState(''); // açıklama
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/sign-in');
        return;
      }
      setUserId(user.id);
    };

    getUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const { error } = await supabase.from('scripts').insert([
      {
        title,
        genre,
        length: length === '' ? null : length,
        synopsis,
        user_id: userId,
      },
    ]);

    if (error) {
      alert('❌ Senaryo kaydedilirken hata oluştu: ' + error.message);
    } else {
      alert('✅ Senaryo başarıyla kaydedildi!');
      setTitle('');
      setGenre('');
      setLength('');
      setSynopsis('');
      router.push('/dashboard/writer/scripts');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">✍️ Yeni Senaryo Ekle</h1>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">Başlık</label>
          <input
            type="text"
            className="w-full p-2 border rounded-lg"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tür</label>
          <select
            className="w-full p-2 border rounded-lg"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            required
          >
            <option value="">Seçiniz</option>
            <option>Dram</option>
            <option>Gerilim</option>
            <option>Komedi</option>
            <option>Bilim Kurgu</option>
            <option>Belgesel</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Süre (dakika)
          </label>
          <input
            type="number"
            className="w-full p-2 border rounded-lg"
            value={length}
            onChange={(e) => setLength(e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Açıklama</label>
          <textarea
            className="w-full p-2 border rounded-lg"
            rows={5}
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            required
          ></textarea>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-[#ffaa06] text-white rounded-lg hover:bg-[#e69900] transition"
        >
          Kaydet
        </button>
      </form>
    </div>
  );
}
