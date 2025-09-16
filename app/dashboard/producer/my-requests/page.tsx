'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';

export default function ProducerMyRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error('Kullanıcı oturumu bulunamadı.');
      return;
    }

    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('producer_id', user.id)
      .order('deadline', { ascending: false });

    if (error) {
      console.error('Supabase Hatası:', error.message);
    } else {
      setRequests(data);
    }

    setLoading(false);
  };

  return (
    <AuthGuard allowedRoles={['producer']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">📋 Yayındaki İlanlarım</h1>
        <p className="text-[#7a5c36]">
          Daha önce yayınladığınız ilanları buradan takip edebilirsiniz.
        </p>

        {loading ? (
          <p className="text-sm text-[#a38d6d]">Yükleniyor...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-[#a38d6d]">
            Henüz yayınladığınız bir ilan yok.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {requests.map((req) => (
              <div key={req.id} className="card space-y-2">
                <h2 className="text-lg font-semibold">{req.title}</h2>
                <p className="text-sm text-[#7a5c36]">
                  Tür: {req.genre} <br />
                  Bütçe: ₺{req.budget?.toLocaleString('tr-TR')} <br />
                  Teslim: {new Date(req.deadline).toLocaleDateString('tr-TR')}
                </p>
                {req.description && (
                  <p className="text-sm text-[#4a3d2f]">{req.description}</p>
                )}
                <p className="text-sm text-[#4a3d2f]">
                  Gelen Öneri Sayısı: <strong>0</strong>
                </p>
                <div className="pt-2">
                  <Link
                    href={`/dashboard/producer/requests/${slugify(req.title)}`}
                    className="btn btn-secondary"
                  >
                    Detaylar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
