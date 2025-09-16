'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import type { Role } from '@/types/db';

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  // 🔔 Sayaçlar
  const [notifCount, setNotifCount] = useState<number>(0); // Bildirim sayacı
  const [chatCount, setChatCount] = useState<number>(0); // Sohbet (accepted başvuru) sayacı

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      setRoleMenuOpen(false);
    }
  }, [menuOpen]);

  // Sayaçları role’e göre yükle
  useEffect(() => {
    const loadCounts = async () => {
      if (!user) return;

      const role: 'writer' | 'producer' | undefined = user?.user_metadata?.role;

      try {
        if (role === 'producer') {
          // Bildirim: Bu yapımcının ilanlarına gelen PENDING başvuru sayısı
          {
            const { count } = await supabase
              .from('applications')
              .select('id, listing:producer_listings!inner(owner_id)', {
                count: 'exact',
                head: true,
              })
              .eq('listing.owner_id', user.id)
              .eq('status', 'pending');
            setNotifCount(count ?? 0);
          }

          // Sohbet: Bu yapımcının konuşmaları (conversations → applications → listings)
          {
            const { count } = await supabase
              .from('conversations')
              .select(
                `
                  id,
                  application:applications!inner(
                    listing:producer_listings!inner(owner_id)
                  )
                `,
                { count: 'exact', head: true }
              )
              .eq('application.listing.owner_id', user.id);
            setChatCount(count ?? 0);
          }
        } else if (role === 'writer') {
          // Bildirim: bu yazarın BAŞVURULARI (accepted/rejected) → eylem gerektiren
          {
            const { count } = await supabase
              .from('applications')
              .select('*', { count: 'exact', head: true })
              .eq('writer_id', user.id)
              .in('status', ['accepted', 'rejected']);
            setNotifCount(count ?? 0);
          }

          // Sohbet: Bu yazarın konuşmaları (conversations → applications)
          {
            const { count } = await supabase
              .from('conversations')
              .select(
                `
                  id,
                  application:applications!inner(writer_id)
                `,
                { count: 'exact', head: true }
              )
              .eq('application.writer_id', user.id);
            setChatCount(count ?? 0);
          }
        } else {
          setNotifCount(0);
          setChatCount(0);
        }
      } catch {
        // sessiz geç
      }
    };

    loadCounts();
  }, [user]);

  const handleSignOut = async () => {
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
  const roleOptions: { value: Role; label: string; emoji: string }[] = [
    { value: 'writer', label: 'Senarist', emoji: '✍️' },
    { value: 'producer', label: 'Yapımcı', emoji: '🎬' },
  ];
  const currentRoleLabel = role ? roleLabelMap[role] : undefined;

  const handleRoleChange = async (nextRole: Role) => {
    if (!user || role === nextRole) {
      setRoleMenuOpen(false);
      return;
    }

    setUpdatingRole(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { role: nextRole },
      });
      if (error) throw error;

      await supabase.auth.refreshSession();
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    } catch (err) {
      console.error('Rol güncelleme hatası', err);
    } finally {
      setUpdatingRole(false);
      setRoleMenuOpen(false);
    }
  };

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
          <div className="px-4 py-2 border-b text-sm text-gray-600">
            {user.email}
            {currentRoleLabel ? (
              <span className="ml-2 text-xs font-medium text-gray-500">
                ({currentRoleLabel})
              </span>
            ) : null}
          </div>

          <div className="relative border-b">
            <button
              className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-gray-100"
              onClick={() => setRoleMenuOpen((v) => !v)}
              aria-expanded={roleMenuOpen}
              aria-haspopup="menu"
              disabled={updatingRole}
            >
              <span>
                🧭 Rol Değiştir
                {currentRoleLabel ? ` · ${currentRoleLabel}` : ''}
              </span>
              <span className="text-xs text-gray-500">{roleMenuOpen ? '▲' : '▼'}</span>
            </button>

            {roleMenuOpen && (
              <div className="absolute right-3 left-3 z-50 mt-1 rounded-md border bg-white shadow">
                {roleOptions.map((option) => {
                  const isActive = option.value === role;
                  return (
                    <button
                      key={option.value}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                        isActive ? 'font-semibold text-[#0e5b4a]' : ''
                      }`}
                      onClick={() => handleRoleChange(option.value)}
                      disabled={updatingRole || isActive}
                    >
                      <span>
                        {option.emoji} {option.label}
                      </span>
                      {isActive ? <span>✓</span> : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            className="flex w-full items-center justify-between px-4 py-2 hover:bg-gray-100 text-left"
            onClick={() => {
              goDashboard();
              setRoleMenuOpen(false);
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
              setRoleMenuOpen(false);
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
              setRoleMenuOpen(false);
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
              setRoleMenuOpen(false);
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
