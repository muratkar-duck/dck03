import Link from 'next/link';

export const metadata = {
  title: 'ducktylo | Panel',
  description: 'ducktylo senarist kontrol paneli',
};

export default function WriterDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-screen flex bg-[#faf3e0]">
      <aside className="w-64 bg-[#0e5b4a] text-white p-6 space-y-6">
        <h2 className="text-2xl font-bold lowercase tracking-wide">ducktylo</h2>
        <nav className="space-y-4 text-sm">
          <Link href="/dashboard/writer" className="block hover:underline">
            📂 Panel
          </Link>
          <Link
            href="/dashboard/writer/scripts/new"
            className="block hover:underline"
          >
            ➕ Yeni Senaryo Ekle
          </Link>
          <Link href="/dashboard/writer/scripts" className="block hover:underline">
            ✍️ Senaryolarım
          </Link>
          <Link
            href="/dashboard/writer/listings"
            className="block hover:underline"
          >
            🎬 İlanlar
          </Link>
          <Link
            href="/dashboard/writer/requests"
            className="block hover:underline"
          >
            📩 Talepler
          </Link>
          <Link href="/dashboard/writer/stats" className="block hover:underline">
            📊 İstatistikler
          </Link>
          <Link href="/dashboard/writer/billing" className="block hover:underline">
            💳 Üyelik / Fatura
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </section>
  );
}
