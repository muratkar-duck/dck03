'use client';

import { Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import UserMenu from '@/components/UserMenu';
import { useSession } from '@/hooks/useSession';
import type { Role } from '@/types/db';

type NavLink = {
  href: string;
  label: string;
};

const publicLinks: NavLink[] = [
  { href: '/', label: 'Ana Sayfa' },
  { href: '/about', label: 'Hakkımızda' },
  { href: '/how-it-works', label: 'Nasıl Çalışır' },
  { href: '/plans', label: 'Planlar' },
];

const getDashboardPath = (role: Role | null | undefined) => {
  if (role === 'producer' || role === 'writer') {
    return `/dashboard/${role}`;
  }

  return '/dashboard';
};

const getMessagesPath = (role: Role | null | undefined) => {
  if (role === 'producer' || role === 'writer') {
    return `/dashboard/${role}/messages`;
  }

  return '/dashboard/messages';
};

const createAppLinks = (role: Role | null | undefined): NavLink[] => [
  { href: '/browse', label: 'Keşfet' },
  { href: getDashboardPath(role), label: 'Panel' },
  { href: getMessagesPath(role), label: 'Mesajlar' },
];

export default function AppHeader() {
  const { session } = useSession();
  const pathname = usePathname();
  const role =
    (session?.user?.user_metadata?.role as Role | undefined) ??
    (session?.user?.app_metadata?.role as Role | undefined) ??
    null;
  const navigation = session ? createAppLinks(role) : publicLinks;

  const isActiveLink = (href: string) => {
    if (!pathname) {
      return false;
    }

    if (href === '/') {
      return pathname === '/';
    }

    if (href === '/browse') {
      return pathname === '/browse';
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const linkClassName = (href: string) => {
    const active = isActiveLink(href);

    const baseClass = [
      'rounded-md px-3 py-1',
      'transition-colors duration-150',
      'focus-visible:outline-none',
      'focus-visible:ring-2 focus-visible:ring-brand',
      'focus-visible:ring-offset-2 focus-visible:ring-offset-forest',
    ].join(' ');

    if (active) {
      return `${baseClass} bg-brand/10 text-brand font-semibold`;
    }

    return `${baseClass} text-brand/80 hover:text-brand hover:bg-brand/5`;
  };

  return (
    <header
      className="w-full bg-forest text-brand py-4 shadow-md"
      data-test-id="HEADER_NAV_V2"
    >
      <div className="mx-auto flex max-w-7xl items-center px-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/ducktylo-logo.png"
            alt="ducktylo logo"
            width={120}
            height={32}
            className="h-10 w-auto"
            priority
          />
          <span className="text-lg font-semibold lowercase tracking-tight text-brand">
            ducktylo
          </span>
        </Link>
        <nav className="ml-auto mr-4 flex items-center text-sm font-semibold">
          {navigation.map((link, index) => (
            <Fragment key={link.href}>
              {index > 0 && <span className="mx-3 text-brand/70">|</span>}
              <Link href={link.href} className={linkClassName(link.href)}>
                {link.label}
              </Link>
            </Fragment>
          ))}
        </nav>
        <UserMenu />
      </div>
    </header>
  );
}
