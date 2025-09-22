'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function EditScriptPage() {
  const { id } = useParams();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [length, setLength] = useState<number | ''>(''); // Supabase alanı
  const [synopsis, setSynopsis] = useState(''); // kısa özet
  const [description, setDescription] = useState('');
  const [priceCents, setPriceCents] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const supabase = useMemo(getSupabaseClient, []);

  const fetchScript = useCallback(async () => {
    if (!id) return;

    setErrorMessage(null);
    const { data, error } = await supabase
      .from('scripts')
      .select(
        'id, title, genre, length, synopsis, description, price_cents, owner_id, created_at'
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Veri alınamadı:', error.message);
      setErrorMessage(error.message ?? 'Senaryo bilgileri alınamadı.');
    } else if (!data) {
      setErrorMessage('Senaryo bulunamadı.');
    } else if (data) {
      setTitle(data.title);
      setGenre(data.genre);
      setLength(data.length ?? '');
      setSynopsis(data.synopsis ?? '');
      setDescription(data.description ?? '');
      setPriceCents(data.price_cents ?? '');
    }
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    fetchScript();
  }, [fetchScript]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('scripts')
      .update({
        title,
        genre,
        length: length === '' ? null : length,
        synopsis,
        description,
        price_cents: priceCents === '' ? null : priceCents,
      })
      .eq('id', id);

    if (error) {
      alert('Güncelleme başarısız: ' + error.message);
    } else {
      router.push(`/dashboard/writer/scripts/${id}`);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>;

  if (errorMessage) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{errorMessage}</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.push('/dashboard/writer/scripts')}
        >
          Senaryolara Dön
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">✏️ Senaryoyu Düzenle</h1>

      <form className="space-y-4" onSubmit={handleUpdate}>
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
            onChange={(e) =>
              setLength(e.target.value === '' ? '' : Number(e.target.value))
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Kısa Özet (2-3 cümle)
          </label>
          <textarea
            className="w-full p-2 border rounded-lg"
            rows={3}
            maxLength={350}
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            required
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Detaylı Açıklama</label>
          <textarea
            className="w-full p-2 border rounded-lg"
            rows={7}
            minLength={50}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Fiyat (₺)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full p-2 border rounded-lg"
            value={priceCents === '' ? '' : priceCents / 100}
            onChange={(e) => {
              const value = e.target.value;
              setPriceCents(value === '' ? '' : Math.round(Number(value) * 100));
            }}
            required
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-[#ffaa06] text-white rounded-lg hover:bg-[#e69900] transition"
          >
            Kaydet
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/writer/scripts/${id}`)}
            className="px-4 py-2 bg-gray-300 text-black rounded-lg hover:bg-gray-400 transition"
          >
            Vazgeç
          </button>
        </div>
      </form>
    </div>
  );
}
