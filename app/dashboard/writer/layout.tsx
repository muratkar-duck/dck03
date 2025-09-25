import { DashboardShell, type DashboardNavItem } from '@/components/dashboard/dashboard-shell';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'ducktylo | Panel',
  description: 'ducktylo senarist kontrol paneli',
};

export default function WriterDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const navItems: DashboardNavItem[] = [
    { href: '/dashboard/writer', label: 'Panel', icon: '📂' },
    { href: '/dashboard/writer/scripts/new', label: 'Yeni Senaryo', icon: '➕' },
    { href: '/dashboard/writer/scripts', label: 'Senaryolarım', icon: '✍️' },
    { href: '/dashboard/writer/listings', label: 'İlanlarım', icon: '🎬' },
    { href: '/dashboard/writer/stats', label: 'İstatistikler', icon: '📊' },
    { href: '/dashboard/writer/billing', label: 'Üyelik / Fatura', icon: '💳' },
  ];

  return <DashboardShell navItems={navItems}>{children}</DashboardShell>;
}
