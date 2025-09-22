'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function NewProducerListingPage() {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const supabase = useMemo(getSupabaseClient, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (!supabase) {
        setOwnerId(null);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/sign-in');
        return;
      }

      setOwnerId(user.id);
    };

    fetchUser();
  }, [router, supabase]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ownerId) return;

    if (!supabase) {
      alert('Supabase istemcisi kullanılamıyor.');
      return;
    }

    setSubmitting(true);

    const numericBudget = Number(budget);

    if (!Number.isFinite(numericBudget)) {
      alert('Lütfen geçerli bir bütçe değeri girin.');
      setSubmitting(false);
      return;
    }

    const budgetCents = Math.round(numericBudget * 100);

    const { error } = await supabase.from('producer_listings').insert([
      {
        owner_id: ownerId,
        title,
        description,
        genre,
        budget_cents: budgetCents,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      alert('❌ İlan oluşturulamadı: ' + error.message);
    } else {
      alert('✅ İlan başarıyla oluşturuldu!');
      router.push('/dashboard/producer/listings');
    }

    setSubmitting(false);
  };

  return (
    <AuthGuard allowedRoles={['producer']}>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold">🎬 Yeni Yapımcı İlanı</h1>
        <p className="text-sm text-[#7a5c36]">
          Projelerinizi duyurun ve yazarlarla iletişime geçin.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium mb-1">Başlık</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tür</label>
            <select
              className="w-full p-2 border rounded-lg"
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
              required
            >
              <option value="">Tür seçin</option>
              <option value="dram">Dram</option>
              <option value="gerilim">Gerilim</option>
              <option value="komedi">Komedi</option>
              <option value="bilim-kurgu">Bilim Kurgu</option>
              <option value="belgesel">Belgesel</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bütçe (₺)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full p-2 border rounded-lg"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              required
            />
            <p className="text-xs text-[#a38d6d] mt-1">
              Lütfen bütçeyi Türk Lirası cinsinden girin. Kuruş bilgisi opsiyoneldir.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Açıklama</label>
            <textarea
              className="w-full p-2 border rounded-lg"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-[#0e5b4a] text-white rounded-lg hover:bg-[#0b4638] transition"
            disabled={submitting || !ownerId}
          >
            {submitting ? 'Kaydediliyor...' : 'İlanı Yayınla'}
          </button>
        </form>
      </div>
    </AuthGuard>
  );
}
