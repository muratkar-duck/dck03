'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

export type DashboardNavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  external?: boolean;
};

type DashboardShellProps = {
  children: ReactNode;
  navItems: DashboardNavItem[];
};

const NAV_BG = '#0e5b4a';
const ACCENT = '#ffaa06';

export function DashboardShell({ children, navItems }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const renderNavItems = () => (
    <nav className="space-y-1 text-sm font-medium tracking-wide">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const baseClasses =
          'group flex items-center gap-3 rounded-xl px-4 py-2.5 transition-colors duration-150';
        const stateClasses = isActive
          ? 'bg-white/15 text-[var(--dashboard-accent)] shadow-sm'
          : 'text-white/90 hover:bg-white/10 hover:text-white';

        const content = (
          <>
            {item.icon ? (
              <span className="text-lg" aria-hidden>{item.icon}</span>
            ) : null}
            <span className="leading-tight">{item.label}</span>
          </>
        );

        if (item.external) {
          return (
            <a
              key={item.href}
              href={item.href}
              className={`${baseClasses} ${stateClasses}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              {content}
            </a>
          );
        }

        return (
          <Link key={item.href} href={item.href} className={`${baseClasses} ${stateClasses}`}>
            {content}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <section
      className="relative flex min-h-screen bg-[#faf3e0] text-[#0e5b4a]"
      style={{
        ['--dashboard-accent' as '--dashboard-accent']: ACCENT,
        ['--dashboard-nav-bg' as '--dashboard-nav-bg']: NAV_BG,
      }}
    >
      {/* Desktop sidebar */}
      <aside
        className="hidden w-72 shrink-0 flex-col justify-between border-r border-white/10 bg-[var(--dashboard-nav-bg)] px-6 pb-8 pt-10 text-white md:flex"
        aria-label="Panel gezinme"
      >
        <div className="space-y-10">
          <div className="flex items-center gap-2 text-2xl font-semibold lowercase tracking-[0.2em]">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-[var(--dashboard-accent)] shadow-inner">
              d
            </span>
            <span>ducktylo</span>
          </div>
          {renderNavItems()}
        </div>
        <p className="text-xs text-white/60">
          blcklst-to-dck içgörülerine göre hizalanmış modern kontrol paneli.
        </p>
      </aside>

      {/* Mobile nav trigger */}
      <div className="md:hidden">
        <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-[var(--dashboard-nav-bg)] px-4 py-3 text-white shadow-lg">
          <div className="flex items-center gap-2 text-lg font-semibold lowercase tracking-[0.2em]">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-base text-[var(--dashboard-accent)]">
              d
            </span>
            <span>ducktylo</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Menüyü aç"
          >
            <span className="sr-only">Menüyü aç</span>
            <MenuIcon open={mobileOpen} />
          </button>
        </div>
        <div
          className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity ${mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
          onClick={() => setMobileOpen(false)}
          aria-hidden={!mobileOpen}
        ></div>
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-full flex-col overflow-y-auto border-r border-white/10 bg-[var(--dashboard-nav-bg)] px-6 pb-8 pt-16 text-white transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="space-y-8 pt-2">
            {renderNavItems()}
          </div>
        </aside>
      </div>

      <main className="flex-1 px-4 pb-12 pt-24 md:px-12 md:pb-16 md:pt-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          {children}
        </div>
      </main>
    </section>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}
