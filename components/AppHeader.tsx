'use client';

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
    <header className="bg-forest text-brand py-4 shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/ducktylo-logo.png"
            alt="ducktylo logo"
            width={120}
            height={32}
            className="h-8 w-auto"
            priority
          />
          <span className="sr-only">ducktylo</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          {navigation.map((link) => (
            <Link key={link.href} href={link.href} className="hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
        <UserMenu />
      </div>
    </header>
  );
}
