'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function SignOutPage() {
  useEffect(() => {
    const run = async () => {
      try {
        // rol çerezini temizle
        document.cookie = 'dt_role=; Path=/; Max-Age=0; SameSite=Lax';
        document.cookie = 'dt_role=; Path=/dashboard; Max-Age=0; SameSite=Lax';
        // supabase oturumunu kapat
        await supabase.auth.signOut();
      } finally {
        window.location.href = '/';
      }
    };
    run();
  }, []);

  return (
    <main className="max-w-md mx-auto p-6 text-center">
      <h1 className="text-xl font-semibold">Çıkış yapılıyor…</h1>
    </main>
  );
}
