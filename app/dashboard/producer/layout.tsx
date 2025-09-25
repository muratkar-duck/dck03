import { DashboardShell, type DashboardNavItem } from '@/components/dashboard/dashboard-shell';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'ducktylo | Yapımcı Paneli',
  description: 'ducktylo yapımcı kontrol paneli',
};

export default function ProducerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const navItems: DashboardNavItem[] = [
    { href: '/dashboard/producer', label: 'Panel', icon: '🎛️' },
    { href: '/dashboard/producer/browse', label: 'Senaryo Ara', icon: '🔍' },
    { href: '/dashboard/producer/listings', label: 'İlanlarım', icon: '🎬' },
    { href: '/dashboard/producer/listings/new', label: 'Yeni İlan', icon: '➕' },
    { href: '/dashboard/producer/applications', label: 'Başvurularım', icon: '📩' },
    { href: '/dashboard/producer/purchases', label: 'Satın Alımlarım', icon: '🧾' },
    { href: '/dashboard/producer/billing', label: 'Fatura / Plan', icon: '💳' },
  ];

  return (
    <DashboardShell navItems={navItems}>{children}</DashboardShell>
  );
}
