'use client';

import AuthGuard from '@/components/AuthGuard';
import { useSession } from '@/hooks/useSession'; // ✅ Bunu ekledik
import { useEffect } from 'react';

export default function ProducerDashboardPage() {
  const session = useSession();

  useEffect(() => {
    console.log('SESSION BİLGİLERİ:', session);
  }, [session]);

  return (
    <AuthGuard allowedRoles={['producer']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Hoş geldiniz, Yapımcı!</h1>
        <p className="text-[#7a5c36]">
          Aradığınız senaryoyu bulmak için hazırsınız. Aşağıda hesabınıza ait
          genel durumu görebilirsiniz.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Beğenilen Senaryolar */}
          <div className="card text-center">
            <h2 className="text-lg font-semibold mb-2">
              📁 Beğenilen Senaryolar
            </h2>
            <p className="text-4xl font-bold text-[#0e5b4a]">8</p>
          </div>

          {/* Başvurular */}
          <div className="card text-center">
            <h2 className="text-lg font-semibold mb-2">
              📩 Gönderilen Başvurular
            </h2>
            <p className="text-4xl font-bold text-[#ffaa06]">3</p>
          </div>

          {/* Üyelik Planı */}
          <div className="card text-center">
            <h2 className="text-lg font-semibold mb-2">💳 Plan</h2>
            <p className="text-xl font-bold text-[#7a5c36]">Basic</p>
            <p className="text-xs text-[#a38d6d]">Yenileme: 01 Ağustos 2025</p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
