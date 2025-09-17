'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Request = {
  id: string;
  title: string;
  genre: string;
  length: string; // ✅ duration yerine length
  deadline: string;
  description: string;
  producer_name: string;
  producer_id: string;
};

type Script = {
  id: string;
  title: string;
  genre: string;
  length: string; // ✅ duration yerine length
};

export default function WriterRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [writerId, setWriterId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setWriterId(user.id);

    // Talepleri çek
    const { data: reqData } = await supabase
      .from('requests')
      .select(`
        id,
        title,
        description,
        genre,
        length,
        budget,
        deadline,
        created_at,
        producer_id,
        users!inner(email)
      `)
      .order('deadline', { ascending: false });

    // Kullanıcının senaryolarını çek
    const { data: scrData } = await supabase
      .from('scripts')
      .select('id, title, genre, length, price_cents, created_at, owner_id')
      .eq('owner_id', user.id);

    // Veriyi düzenle
    const formattedRequests = (reqData || []).map((req: any) => ({
      ...req,
      producer_name: req.users?.email || 'Bilinmeyen Yapımcı'
    }));
    
    setRequests(formattedRequests);
    setScripts(scrData || []);
    setLoading(false);
  };

  const openApplyModal = (request: Request) => {
    setSelectedRequest(request);
    setSelectedScriptId(null);
  };

  const handleApply = async () => {
    if (!selectedRequest || !selectedScriptId || !writerId) return;

    // İlan sahibinin (producer) id'sini çek
    const { data: reqDetails } = await supabase
      .from('requests')
      .select('producer_id')
      .eq('id', selectedRequest.id)
      .single();

    if (!reqDetails) {
      alert('❌ İlan bilgisi bulunamadı.');
      return;
    }

    const { error } = await supabase.from('applications').insert([
      {
        request_id: selectedRequest.id,
        script_id: selectedScriptId,
        writer_id: writerId,
        producer_id: reqDetails.producer_id,
        status: 'pending',
      },
    ]);

    if (error) {
      alert('❌ Başvuru başarısız: ' + error.message);
    } else {
      alert('✅ Başvurunuz gönderildi!');
      setSelectedRequest(null);
      setSelectedScriptId(null);
    }
  };

  if (loading) {
    return (
      <AuthGuard allowedRoles={['writer']}>
        <p className="text-sm text-[#a38d6d]">Yükleniyor...</p>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles={['writer']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">📢 Açık Yapımcı Talepleri</h1>
        <p className="text-[#7a5c36]">
          Yapımcıların ihtiyaç duyduğu senaryoları aşağıda bulabilirsin. Uygun
          olduğunu düşündüğün projelere senaryonu önerebilirsin.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((req) => (
            <div key={req.id} className="card space-y-2">
              <h2 className="text-lg font-semibold">{req.title}</h2>
              <p className="text-sm text-[#7a5c36]">
                Yapımcı: {req.producer_name}
              </p>
              <p className="text-sm text-[#7a5c36]">Tür: {req.genre}</p>
              <p className="text-sm text-[#7a5c36]">Süre: {req.length}</p>
              <p className="text-sm text-[#7a5c36]">
                Teslim Tarihi:{' '}
                {new Date(req.deadline).toLocaleDateString('tr-TR')}
              </p>
              <p className="text-sm text-[#4a3d2f]">{req.description}</p>
              <div className="flex gap-2 mt-2">
                <Link
                  href={`/dashboard/writer/requests/${req.id}`}
                  className="btn btn-secondary"
                >
                  Detaylar
                </Link>
                <button
                  onClick={() => openApplyModal(req)}
                  className="btn btn-primary"
                >
                  Başvur
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Başvuru Modalı */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full space-y-4">
            <h2 className="text-xl font-bold">
              📤 {selectedRequest.title} için Başvuru
            </h2>

            {scripts.filter((s) => s.genre === selectedRequest.genre).length >
            0 ? (
              <>
                <p className="text-sm text-gray-600">
                  Lütfen göndermek istediğiniz senaryoyu seçin:
                </p>
                <select
                  className="w-full p-2 border rounded-lg"
                  value={selectedScriptId || ''}
                  onChange={(e) => setSelectedScriptId(e.target.value)}
                >
                  <option value="">Seçiniz</option>
                  {scripts
                    .filter((s) => s.genre === selectedRequest.genre)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({s.length})
                      </option>
                    ))}
                </select>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="btn btn-secondary"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={handleApply}
                    className="btn btn-primary"
                    disabled={!selectedScriptId}
                  >
                    Gönder
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-red-600">
                  ❌ Uygun türde bir senaryonuz yok.
                </p>
                <button
                  onClick={() => router.push('/dashboard/writer/scripts/new')}
                  className="btn btn-primary w-full"
                >
                  ➕ Yeni Senaryo Ekle
                </button>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="btn btn-secondary w-full"
                >
                  Vazgeç
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
