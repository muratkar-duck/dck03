'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AuthCard } from '@/components/AuthCard';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function SignUpWriterPage() {
  const router = useRouter();
  const supabase = useMemo(getSupabaseClient, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!supabase) {
      setErrorMsg('Supabase istemcisi kullanılamıyor.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'writer' } },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setErrorMsg('Kullanıcı ID alınamadı.');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('users').insert({
      id: userId,
      email,
      role: 'writer',
    });

    if (insertError) {
      setErrorMsg(insertError.message);
    } else {
      router.push('/auth/sign-in');
    }

    setLoading(false);
  };

  return (
    <section className="py-12">
      <AuthCard title="Senarist Olarak Kayıt Ol">
        <form className="space-y-4" onSubmit={handleSignUp}>
          <div>
            <label className="block font-semibold mb-1">E-posta</label>
            <input
              type="email"
              className="w-full rounded-lg border p-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Şifre</label>
            <input
              type="password"
              className="w-full rounded-lg border p-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Kaydoluyor...' : 'Kayıt Ol'}
          </button>
        </form>
      </AuthCard>
    </section>
  );
}
