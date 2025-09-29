'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AuthCard } from '@/components/AuthCard';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function SignUpProducerPage() {
  const router = useRouter();
  const supabase = useMemo(getSupabaseClient, []);
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!supabase) {
      setErrorMsg('Supabase istemcisi kullanılamıyor.');
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { role: 'producer' } },
    });

    if (signUpError) {
      setErrorMsg(signUpError.message);
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('users').insert({
      id: data.user?.id,
      email: form.email,
      role: 'producer',
    });

    if (insertError) {
      setErrorMsg(insertError.message);
      setLoading(false);
      return;
    }

    router.push('/auth/sign-in');
  };

  return (
    <section className="py-12">
      <AuthCard title="Yapımcı Olarak Kayıt Ol">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">E-posta</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-lg border p-3"
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Şifre</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-lg border p-3"
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
