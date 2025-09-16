'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AuthGuard from '@/components/AuthGuard';

export default function NewRequestPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [length, setLength] = useState('');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
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

    const { error } = await supabase.from('requests').insert([
      {
        title,
        genre,
        length,
        budget: parseFloat(budget),
        deadline,
        description,
        producer_id: userId,
      },
    ]);

    if (error) {
      alert('❌ İlan eklenirken hata oluştu: ' + error.message);
    } else {
      alert('✅ İlan başarıyla yayınlandı!');
      router.push('/dashboard/producer/my-requests');
    }
  };

  return (
    <AuthGuard allowedRoles={['producer']}>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold">📢 Yeni İlan Yayınla</h1>

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
            <label className="block text-sm font-medium mb-1">Süre/Format</label>
            <select
              className="w-full p-2 border rounded-lg"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              required
            >
              <option value="">Seçiniz</option>
              <option>Kısa Film (0-30 dk)</option>
              <option>Orta Metraj (30-60 dk)</option>
              <option>Uzun Metraj (60+ dk)</option>
              <option>Mini Dizi (2-6 bölüm)</option>
              <option>Dizi (7+ bölüm)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bütçe (₺)</label>
            <input
              type="number"
              className="w-full p-2 border rounded-lg"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Teslim Tarihi
            </label>
            <input
              type="date"
              className="w-full p-2 border rounded-lg"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Açıklama</label>
            <textarea
              className="w-full p-2 border rounded-lg"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="İlanınızı detaylı olarak açıklayın..."
              required
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-[#ffaa06] text-white rounded-lg hover:bg-[#e69900] transition"
          >
            Yayınla
          </button>
        </form>
      </div>
    </AuthGuard>
  );
}