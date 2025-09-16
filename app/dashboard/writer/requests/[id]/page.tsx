'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';

type Request = {
  id: string;
  title: string;
  description: string;
  genre: string;
  length: string; // duration yerine length
  budget: string | null;
  created_at: string;
  user_id: string; // ilanı açan yapımcı
  producer_id?: string | null;
};

type Script = {
  id: string;
  title: string;
  genre: string;
  length: string; // duration yerine length
};

type MyAppRow = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  script_id: string;
  created_at: string;
};

export default function WriterRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [request, setRequest] = useState<Request | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScript, setSelectedScript] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [myApplication, setMyApplication] = useState<MyAppRow | null>(null);

  useEffect(() => {
    if (id) {
      fetchRequest(id);
      fetchScripts();
      fetchMyApplication(id);
    }
  }, [id]);

  const fetchRequest = async (requestId: string) => {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!error && data) {
      setRequest(data);
    }
    setLoading(false);
  };

  const fetchScripts = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('scripts')
      .select('id, title, genre, length')
      .eq('owner_id', user.id);

    if (!error && data) {
      setScripts(data as Script[]);
    }
  };

  const fetchMyApplication = async (requestId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('applications')
      .select('id, status, script_id, created_at')
      .eq('request_id', requestId)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!error) setMyApplication((data as MyAppRow) || null);
  };

  const handleApply = async () => {
    if (!selectedScript || !request) {
      alert('Lütfen bir senaryo seçin.');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('applications').insert([
      {
        request_id: request.id,
        script_id: selectedScript,
        user_id: user.id, // writer
        producer_id: (request as any).producer_id ?? request.user_id,

        status: 'pending',
      },
    ]);

    if (error) {
      alert('❌ Başvuru başarısız: ' + error.message);
    } else {
      alert('✅ Başvurunuz başarıyla gönderildi!');
      await fetchMyApplication(request.id);
      // tercihen bildirimler sayfasına da yönlendirebilirsin
      // router.push('/dashboard/writer/notifications');
    }
  };

  if (loading) {
    return (
      <AuthGuard allowedRoles={['writer']}>
        <p>Yükleniyor...</p>
      </AuthGuard>
    );
  }

  if (!request) {
    return (
      <AuthGuard allowedRoles={['writer']}>
        <p>İlan bulunamadı.</p>
      </AuthGuard>
    );
  }

  // İlanın türüyle eşleşen senaryolar
  const eligibleScripts = scripts.filter(
    (s) => s.genre.trim().toLowerCase() === request.genre.trim().toLowerCase()
  );

  return (
    <AuthGuard allowedRoles={['writer']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{request.title}</h1>
        <p className="text-[#7a5c36]">{request.description}</p>
        <p className="text-sm text-gray-600">
          Tür: {request.genre} · Süre: {request.length}{' '}
          {request.budget && <>· Bütçe: {request.budget}</>}
        </p>
        <p className="text-xs text-gray-400">
          Yayınlanma: {new Date(request.created_at).toLocaleDateString('tr-TR')}
        </p>

        {/* Eğer daha önce başvuru yapmışsam durum ve CTA */}
        {myApplication ? (
          <div className="card flex items-center justify-between">
            <div>
              <p className="text-sm">
                Bu ilana{' '}
                <strong>
                  {new Date(myApplication.created_at).toLocaleDateString(
                    'tr-TR'
                  )}
                </strong>{' '}
                tarihinde başvurdun.
              </p>
              <p className="text-xs text-[#a38d6d]">
                Durum: {myApplication.status}
              </p>
            </div>

            <div className="flex gap-2">
              {myApplication.status === 'accepted' ? (
                // ✅ Accepted → Sohbet
                <Link
                  href={`/dashboard/writer/messages?application=${myApplication.id}`}
                  className="btn btn-primary"
                >
                  💬 Sohbeti Aç
                </Link>
              ) : (
                <Link
                  href={`/dashboard/writer/notifications/${myApplication.id}`}
                  className="btn btn-secondary"
                >
                  Bildirim Detayı
                </Link>
              )}
            </div>
          </div>
        ) : eligibleScripts.length === 0 ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700 mb-2">
              Bu türe uygun bir senaryonuz yok. Başvuru yapmak için senaryo
              eklemelisiniz.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => router.push('/dashboard/writer/scripts/new')}
            >
              ✍️ Senaryo Ekle
            </button>
          </div>
        ) : (
          // İlk kez başvuru yapıyorum
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Başvurmak istediğiniz senaryoyu seçin:
            </label>
            <select
              className="p-2 border rounded-lg w-full"
              value={selectedScript}
              onChange={(e) => setSelectedScript(e.target.value)}
            >
              <option value="">-- Senaryo Seçin --</option>
              {eligibleScripts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.genre}, {s.length})
                </option>
              ))}
            </select>
            <button onClick={handleApply} className="btn btn-primary">
              📤 Başvur
            </button>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
