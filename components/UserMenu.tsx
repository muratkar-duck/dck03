'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Link from 'next/link';
import type { Role } from '@/types/db';

export default function UserMenu() {
  const router = useRouter();
  const supabase = useMemo(getSupabaseClient, []);
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);


  // 🔔 Sayaçlar
  const [notifCount, setNotifCount] = useState<number>(0); // Bildirim sayacı
  const [chatCount, setChatCount] = useState<number>(0); // Sohbet (accepted başvuru) sayacı

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      getUser();
      // auth değiştiğinde sayaçları sıfırla; tekrar yüklenir
      setNotifCount(0);
      setChatCount(0);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);


  // Sayaçları role’e göre yükle
  useEffect(() => {
    if (!supabase) {
      return;
    }

    const loadCounts = async () => {
      if (!user) return;

      const role: 'writer' | 'producer' | undefined = user?.user_metadata?.role;

      try {
        if (role === 'producer') {
          const { count: notificationCount } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('event_type', 'application_submitted')
            .is('read_at', null);

          setNotifCount(notificationCount ?? 0);

          const { count } = await supabase
            .from('conversations')
            .select(
              `
                id,
                application_id,
                created_at,
                application:applications!inner (
                  id,
                  listing_id,
                  writer_id,
                  script_id,
                  status,
                  created_at,
                  listing:v_listings_unified!inner (
                    id,
                    owner_id,
                    title,
                    source
                  )
                )
              `,
              { count: 'exact', head: true }
            )
            .eq('application.owner_id', user.id);

          setChatCount(count ?? 0);
        } else if (role === 'writer') {
          const { count: notificationCount } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('event_type', [
              'application_decision',
              'producer_interest_registered',
              'script_purchased',
            ])
            .is('read_at', null);

          setNotifCount(notificationCount ?? 0);

          const { count } = await supabase
            .from('conversations')
            .select(
              `
                id,
                application_id,
                created_at,
                application:applications!inner (
                  id,
                  listing_id,
                  writer_id,
                  script_id,
                  status,
                  created_at
                )
              `,
              { count: 'exact', head: true }
            )
            .eq('application.writer_id', user.id);

          setChatCount(count ?? 0);
        } else {
          setNotifCount(0);
          setChatCount(0);
        }
      } catch {
        // sessiz geç
      }
    };


    loadCounts();
  }, [supabase, user]);

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  };

  // Buton boyutu: yükseklik = 40px (x), genişlik = 120px (2x)
  const fixedBtnBase =
    'h-[40px] rounded-lg text-sm font-bold flex items-center justify-center overflow-hidden';
  const loginBtnClass = `${fixedBtnBase} w-[120px] px-4 bg-[#ffaa06] text-[#0e5b4a] hover:bg-[#ffb733]`;
  const registerBtnClass = `${fixedBtnBase} w-[120px] px-4 bg-white text-[#0e5b4a] border border-[#ffaa06] hover:bg-[#fff3d6]`;
  const userBtnClass = `${fixedBtnBase} w-[120px] px-3 bg-[#ffaa06] text-[#0e5b4a] hover:bg-[#ffb733]`;

  const shortLabel = (email: string | null) => {
    if (!email) return '';
    const local = email.split('@')[0] || email;
    if (local.length <= 12) return local;
    return local.slice(0, 10) + '…';
  };

  // Oturum yoksa => Giriş / Kayıt
  if (!user) {
    return (
      <div className="flex items-center space-x-2 w-[260px] justify-end">
        <Link href="/auth/sign-in" className={loginBtnClass}>
          Giriş Yap
        </Link>

        {/* Kayıt Açılır Menüsü */}
        <div className="relative">
          <button
            onClick={() => setRegisterOpen((s) => !s)}
            className={registerBtnClass}
            aria-expanded={registerOpen}
            aria-haspopup="menu"
          >
            Kayıt Ol ⌄
          </button>

          {registerOpen && (
            <div
              className="absolute right-0 mt-2 w-[200px] bg-white shadow-lg rounded-lg border z-50"
              role="menu"
            >
              <Link
                href="/auth/sign-up-writer"
                className="block px-4 py-2 hover:bg-gray-100"
                role="menuitem"
                onClick={() => setRegisterOpen(false)}
              >
                ✍️ Senarist olarak kayıt ol
              </Link>
              <Link
                href="/auth/sign-up-producer"
                className="block px-4 py-2 hover:bg-gray-100"
                role="menuitem"
                onClick={() => setRegisterOpen(false)}
              >
                🎬 Yapımcı olarak kayıt ol
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Oturum varsa => kullanıcı açılır menüsü
  const displayLabel = shortLabel(user.email || '');
  const role = user?.user_metadata?.role as Role | undefined;
  const roleLabelMap: Record<Role, string> = {
    writer: 'Senarist',
    producer: 'Yapımcı',
  };
  const currentRoleLabel = role ? roleLabelMap[role] : undefined;

  const goDashboard = () => {
    if (role === 'writer') router.push('/dashboard/writer');
    else if (role === 'producer') router.push('/dashboard/producer');
    else router.push('/dashboard');
  };

  const goMessages = () => {
    if (role === 'writer') router.push('/dashboard/writer/messages');
    else if (role === 'producer') router.push('/dashboard/producer/messages');
    else router.push('/dashboard/messages');
  };

  const goNotifications = () => {
    if (role === 'writer') router.push('/dashboard/writer/notifications');
    else if (role === 'producer')
      router.push('/dashboard/producer/notifications');
    else router.push('/dashboard/notifications');
  };

  // küçük badge
  const Badge = ({ count }: { count: number }) =>
    count > 0 ? (
      <span className="ml-2 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full text-[11px] px-1.5 bg-[#ff3b30] text-white">
        {count > 99 ? '99+' : count}
      </span>
    ) : null;

  return (
    <div className="relative inline-block text-right w-[260px]">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className={userBtnClass}
        title={user.email}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <span className="truncate max-w-[88px] block">{displayLabel}</span>
      </button>

      {menuOpen && (
        <div
          className="absolute right-0 mt-2 w-[240px] bg-white shadow-lg rounded-lg border z-50"
          role="menu"
        >
          <div className="px-4 py-3 border-b text-sm text-gray-600">
            <div className="font-medium text-gray-900">{user.email}</div>

            {currentRoleLabel ? (
              <div className="text-xs text-gray-500">Rol: {currentRoleLabel}</div>
            ) : null}
          </div>


          <button
            className="flex w-full items-center justify-between px-4 py-2 hover:bg-gray-100 text-left"
            onClick={() => {
              goDashboard();
              setMenuOpen(false);
            }}
            role="menuitem"
          >
            <span>📂 Dashboard</span>
          </button>

          <button
            className="flex w-full items-center justify-between px-4 py-2 hover:bg-gray-100 text-left"
            onClick={() => {
              goMessages();
              setMenuOpen(false);
            }}
            role="menuitem"
          >
            <span>💬 Sohbetler</span>
            <Badge count={chatCount} />
          </button>

          <button
            className="flex w-full items-center justify-between px-4 py-2 hover:bg-gray-100 text-left"
            onClick={() => {
              goNotifications();
              setMenuOpen(false);
            }}
            role="menuitem"
          >
            <span>🔔 Bildirimler</span>
            <Badge count={notifCount} />
          </button>

          <button
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
            onClick={() => {
              setMenuOpen(false);
              handleSignOut();
            }}
            role="menuitem"
          >
            🚪 Çıkış Yap
          </button>
        </div>
      )}
    </div>
  );
}
