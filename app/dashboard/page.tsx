'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardIndexRedirect() {
  const [msg, setMsg] = useState('Yükleniyor…');
  const [showChoice, setShowChoice] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: ures, error: uerr } = await supabase.auth.getUser();
        if (uerr) throw uerr;

        const user = ures?.user;
        if (!user) {
          window.location.href = '/auth/sign-in';
          return;
        }

        const { data: row, error: rerr } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (rerr) throw rerr;

        const role = (row?.role as 'producer' | 'writer' | null) ?? null;

        if (role === 'producer') {
          window.location.href = '/dashboard/producer';
          return;
        }
        if (role === 'writer') {
          window.location.href = '/dashboard/writer';
          return;
        }

        // rol yoksa otomatik yönlendirme yapma; seçenek göster
        setShowChoice(true);
        setMsg('Rol bulunamadı. Devam etmek için seçin.');
      } catch (e: any) {
        console.error(e);
        setShowChoice(true);
        setMsg(e?.message || 'Yönlendirme yapılamadı.');
      }
    };
    run();
  }, []);

  return (
    <main className="max-w-xl mx-auto p-6 text-center">
      <h1 className="text-xl font-semibold">Panel</h1>
      <p className="text-sm text-[#a38d6d] mt-2">{msg}</p>

      {showChoice && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <a className="btn btn-primary" href="/dashboard/producer">
            Ben Yapımcıyım
          </a>
          <a className="btn btn-secondary" href="/dashboard/writer">
            Ben Senaristim
          </a>
        </div>
      )}
    </main>
  );
}
