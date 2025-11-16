'use client';
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Check = { id: string; label: string; run: () => Promise<string | null> };

export default function HealthPage() {
  const [results, setResults] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [loading, setLoading] = useState(true);

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
        if (!data?.user) return '⚠️ Giriş yok (bu sayfayı girişten sonra da kontrol et)';
        return null;
      },
    },
    {
      id: 'tables',
      label: 'Gerekli tablolar mevcut mu?',
      run: async () => {
        for (const t of requiredTables) {
          const { error } = await supabase.from(t).select('*').limit(1);
          if (error) return `❌ ${t} erişim/sorgu hatası: ${error.message}`;
        }
        return null;
      },
    },
    {
      id: 'columns',
      label: 'Kritik kolonlar mevcut mu?',
      run: async () => {
        for (const [t, c] of requiredColumns) {
          const { error } = await supabase.from(t).select(c).limit(1);
          if (error) return `❌ ${t}.${c} yok veya erişilemiyor: ${error.message}`;
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
          if (error) {
            const msg = (error.message || '').toLowerCase();

            // "Parametresiz varyant yok" vb. mesajları VAR (parametreli) kabul et
            const existsSignals = [
              'require',               // requires/required
              'argument',              // argument(s) expected
              'expects',               // expects ...
              'invalid input syntax',  // yanlış param ama fonksiyon var
              'without parameters',    // "without parameters in the schema cache"
              'schema cache',          // postgrest cache uyarıları
            ];

            const probablyExists = existsSignals.some((s) => msg.includes(s));
            const permissionIssue = msg.includes('permission');

            if (!probablyExists && !permissionIssue) {
              return `❌ RPC ${fn} çağrısı başarısız: ${error.message}`;
            }
            // else: VAR ama parametre/izin gerekli → OK say
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
      label: 'Örnek sorgu: applications → users embed (writer/producer ayrımı)',
      run: async () => {
        // Birden fazla ilişki olduğu için ilişki ipucu veriyoruz:
        // - writer: users!writer_id(...)
        // - producer: users!producer_id(...)
        // Eğer FK adlarıyla kullanmak istersen: users!applications_writer_id_fkey vb.
        const { data, error } = await supabase
          .from('applications')
          .select(
            `
            id, status,
            writer:users!writer_id ( id, email ),
            producer:users!producer_id ( id, email )
          `
          )
          .limit(1);
        if (error) {
          // Bu hatayı açıkça gösterelim
          return `❌ ${error.message}`;
        }
        if (!Array.isArray(data)) return '⚠️ Beklenen dizi dönmedi';
        return null;
      },
    },
    {
      id: 'messages_insert_rls',
      label: 'Mesaj insert (RLS sinyali, mevcut conversation ile)',
      run: async () => {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) return '⚠️ Giriş yok; bu kontrol giriş sonrası geçerli';

        // Erişilebilir ilk conversation'ı bul
        const { data: conv, error: convErr } = await supabase
          .from('conversations')
          .select('id')
          .limit(1)
          .maybeSingle();

        if (convErr) {
          // RLS nedeniyle conversation okunamıyorsa, bu da sinyaldir.
          const m = convErr.message.toLowerCase();
          if (m.includes('row-level security') || m.includes('rls')) {
            return null; // RLS aktif → OK (sinyal alındı)
          }
          return `❌ conversations erişim hatası: ${convErr.message}`;
        }

        if (!conv?.id) {
          return '⚠️ Test atlandı: erişilebilir conversation bulunamadı.';
        }

        // Bu noktada gerçek insert deniyoruz.
        const { error: insErr } = await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: auth.user.id,
          body: '[HEALTH] test',
        });

        if (insErr) {
          const m = insErr.message.toLowerCase();
          if (m.includes('row-level security') || m.includes('rls')) {
            return null; // RLS engelledi → beklenen sinyal
          }
          return `❌ messages insert beklenmeyen hata: ${insErr.message}`;
        }

        // Mesaj atılabildiyse RLS çok gevşek olabilir; uyarı ver.
        return '⚠️ Insert RLS tarafından engellenmedi (test mesajı oluşturuldu).';
      },
    },
  ];

  useEffect(() => {
    (async () => {
      const res: Record<string, { ok: boolean; msg: string }> = {};
      for (const c of checks) {
        try {
          const err = await c.run();
          res[c.id] = { ok: !err, msg: err || '✅ OK' };
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
        Oturum/şema/RPC ve örnek sorgular için canlı teşhis.
      </p>

      {loading ? (
        <p>Yükleniyor…</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(results).map(([id, r]) => (
            <div
              key={id}
              className={`p-3 rounded border ${r.ok ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}
            >
              <div className="font-medium">
                {(
                  [
                    ['auth', 'Auth oturumu'],
                    ['tables', 'Gerekli tablolar mevcut mu?'],
                    ['columns', 'Kritik kolonlar mevcut mu?'],
                    ['rpcs', 'Gerekli RPC fonksiyonları mevcut mu?'],
                    ['browse_scripts_demo', 'Örnek sorgu: browse_scripts RPC (liste çekimi)'],
                    ['apps_join_demo', 'Örnek sorgu: applications → users embed (writer/producer ayrımı)'],
                    ['messages_insert_rls', 'Mesaj insert (RLS sinyali, mevcut conversation ile)'],
                  ] as const
                ).find((x) => x[0] === id)?.[1] || id}
              </div>
              <div className="text-sm mt-1">{r.ok ? '✅ OK' : r.msg}</div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs opacity-60 pt-4">
        Not: Bazı kontroller kasıtlı olarak RLS veya parametre ihtiyacını tetikler; ❌ yerine ⚠️ olarak raporlanır.
      </div>
    </main>
  );
}

