'use client';

import { Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import UserMenu from '@/components/UserMenu';
import { useSession } from '@/hooks/useSession';

const publicLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/plans', label: 'Plans' },
];

const appLinks = [
  { href: '/browse', label: 'Browse' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/messages', label: 'Messages' },
];

export default function AppHeader() {
  const { session } = useSession();
  const navigation = session ? appLinks : publicLinks;

  return (
    <header
      className="bg-forest text-brand py-4 shadow-md"
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
              <Link href={link.href} className="hover:underline">
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
