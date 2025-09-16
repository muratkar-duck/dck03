'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function SignUpWriterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // 1. Supabase Auth kaydı
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'writer' } }, // user_metadata
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

    // 2. public.users tablosuna ekle
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
    <div className="space-y-6 max-w-md mx-auto py-12">
      <h1 className="text-2xl font-bold text-center">
        Senarist Olarak Kayıt Ol
      </h1>
      <form className="space-y-4" onSubmit={handleSignUp}>
        <div>
          <label className="block font-semibold mb-1">E-posta</label>
          <input
            type="email"
            className="w-full p-3 border rounded-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Şifre</label>
          <input
            type="password"
            className="w-full p-3 border rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={loading}
        >
          {loading ? 'Kaydoluyor...' : 'Kayıt Ol'}
        </button>
      </form>
    </div>
  );
}
