'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';

type AuthGuardProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
};

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const { session, loading } = useSession();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!session) {
      setAuthorized(false);
      router.push('/');
      return;
    }

    const role = session.user?.user_metadata?.role;

    if (allowedRoles && !allowedRoles.includes(role)) {
      setAuthorized(false);
      router.push('/');
    } else {
      setAuthorized(true);
    }
  }, [session, loading, allowedRoles, router]);

  if (authorized === null || loading) {
    return <p className="text-center py-10">🔐 Yükleniyor...</p>;
  }

  if (!authorized) {
    return <p className="text-center py-10 text-red-600">🚫 Erişiminiz yok.</p>;
  }

  return <>{children}</>;
}
