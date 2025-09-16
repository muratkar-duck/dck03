'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      setErrorMsg('Kullanıcı bulunamadı.');
      setLoading(false);
      return;
    }

    // users.role oku
    const { data: profile } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role as 'producer' | 'writer' | null;

    if (role === 'producer') router.push('/dashboard/producer');
    else if (role === 'writer') router.push('/dashboard/writer');
    else router.push('/dashboard'); // rol yoksa seçim butonları

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <h1 className="text-2xl font-bold text-center">🔐 Giriş Yap</h1>
      <form className="space-y-4" onSubmit={handleSignIn}>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            className="w-full p-2 border rounded-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Şifre</label>
          <input
            type="password"
            className="w-full p-2 border rounded-lg"
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
          {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}
