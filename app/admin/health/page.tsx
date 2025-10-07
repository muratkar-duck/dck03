'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Check = { id: string; label: string; run: () => Promise<string | null> };

export default function HealthPage() {
  const [results, setResults] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [loading, setLoading] = useState(true);

  // GEREKLİ KAYNAK LİSTESİ — projede sık geçenler
  const requiredTables = [
    'users',
    'scripts',
    'requests',
    'applications',
    'conversations',
    'messages',
  ];
  const requiredColumns: Array<[table: string, column: string]> = [
    ['users', 'role'],
    ['requests', 'deadline'],
    ['requests', 'genre'],
    ['requests', 'budget'],
    ['scripts', 'title'],
    ['scripts', 'genre'],
    ['scripts', 'length'],
  ];
  const requiredRPCs = [
    'browse_scripts',
    'get_producer_applications',
  ];

  const checks: Check[] = [
    {
      id: 'auth',
      label: 'Auth oturumu',
      run: async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error) return `❌ ${error.message}`;
        if (!data?.user) return '⚠️ Giriş yok (bu sayfayı test için girişten sonra da kontrol et)';
        return null;
      },
    },
    {
      id: 'tables',
      label: 'Gerekli tablolar mevcut mu?',
      run: async () => {
        const { data, error } = await supabase
          .from('pg_tables' as any) // Supabase istemcisi system catalog’u doğrudan izin vermez; fallback: information_schema
          .select('*')
          .limit(1);
        // Yukarıdaki yöntem RLS/İzin nedeniyle çoğu ortamda bloklanır. Bunun yerine
        // ufak denemeler yapalım:
        for (const t of requiredTables) {
          const { error: e2 } = await supabase.from(t).select('*').limit(1);
          if (e2) return `❌ ${t} erişim/sorgu hatası: ${e2.message}`;
        }
        return null;
      },
    },
    {
      id: 'columns',
      label: 'Kritik kolonlar mevcut mu?',
      run: async () => {
        for (const [t, c] of requiredColumns) {
          const { data, error } = await supabase.from(t).select(c).limit(1);
          if (error) return `❌ ${t}.${c} yok veya erişilemiyor: ${error.message}`;
          // data dönüyorsa kolon erişilebilir kabul ediyoruz
        }
        return null;
      },
    },
    {
      id: 'rpcs',
      label: 'Gerekli RPC fonksiyonları mevcut mu?',
      run: async () => {
        for (const fn of requiredRPCs) {
          const { error } = await supabase.rpc(fn as any, {} as any);
          // Not: Parametre bekleyen RPC'lerde boş nesne hata verebilir; burada salt "var mı/çalışır mı" denetliyoruz.
          // Eğer "function xyz requires parameter" gibi bir hata dönerse bu VAR demektir.
          if (error) {
            const msg = error.message?.toLowerCase() || '';
            const probablyExists =
              msg.includes('required') ||
              msg.includes('argument') ||
              msg.includes('expects') ||
              msg.includes('invalid input syntax'); // var ama yanlış input
            if (!probablyExists && !msg.includes('permission')) {
              return `❌ RPC ${fn} çağrısı başarısız: ${error.message}`;
            }
          }
        }
        return null;
      },
    },
    {
      id: 'browse_scripts_demo',
      label: 'Örnek sorgu: browse_scripts RPC (liste çekimi)',
      run: async () => {
        const { data, error } = await supabase.rpc('browse_scripts', {} as any);
        if (error) return `❌ ${error.message}`;
        if (!Array.isArray(data)) return '⚠️ Beklenen dizi dönmedi';
        return null;
      },
    },
    {
      id: 'apps_join_demo',
      label: 'Örnek sorgu: applications join (mesaj akışlarına zemin)',
      run: async () => {
        const { data, error } = await supabase
          .from('applications')
          .select(
            `
            id, status,
            scripts(id,title),
            requests(id,title),
            writer:users(id,email)
          `
          )
          .limit(1);
        if (error) return `❌ ${error.message}`;
        if (!Array.isArray(data)) return '⚠️ Beklenen dizi dönmedi';
        return null;
      },
    },
    {
      id: 'messages_insert_rls',
      label: 'Mesaj insert (RLS sinyali)',
      run: async () => {
        // RLS yüzünden büyük ihtimalle hata alacağız — bu da bize politika sinyali verir.
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) return '⚠️ Giriş yok; bu kontrol giriş sonrası geçerli';
        const { error } = await supabase.from('messages').insert({
          conversation_id: '00000000-0000-0000-0000-000000000000', // sahte
          sender_id: auth.user.id,
          body: '[HEALTH] test',
        });
        if (error) {
          const m = error.message.toLowerCase();
          if (m.includes('new row violates row-level security') || m.includes('rls')) {
            return null; // RLS aktif ve blokluyor → beklenen sinyal
          }
          // başka hata geldiyse raporla
          return `❌ messages insert beklenmeyen hata: ${error.message}`;
        }
        return '⚠️ Insert RLS tarafından engellenmedi (politika zayıf olabilir)';
      },
    },
  ];

  useEffect(() => {
    (async () => {
      const res: Record<string, { ok: boolean; msg: string }> = {};
      for (const c of checks) {
        try {
          const err = await c.run();
          res[c.id] = { ok: !err, msg: err || 'OK' };
        } catch (e: any) {
          res[c.id] = { ok: false, msg: e?.message || 'Bilinmeyen hata' };
        }
      }
      setResults(res);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">🩺 Ducktylo Health Check</h1>
      <p className="text-sm opacity-70">
        Bu sayfa, oturum/şema/RPC ve örnek sorgular için canlı teşhis yapar.
      </p>

      {loading ? (
        <p>Yükleniyor…</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(results).map(([id, r]) => (
            <div key={id} className={`p-3 rounded border ${r.ok ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
              <div className="font-medium">{checks.find(c => c.id === id)?.label}</div>
              <div className="text-sm mt-1">{r.ok ? '✅ OK' : r.msg}</div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs opacity-60 pt-4">
        Not: RLS hatası görüyorsan bu normal olabilir (politikalar devrede demektir). Hatanın türüne göre eksik entegrasyonu anlarız.
      </div>
    </main>
  );
}

