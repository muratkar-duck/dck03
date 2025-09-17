import Link from 'next/link';

export const metadata = {
  title: 'ducktylo | Yapımcı Paneli',
  description: 'ducktylo yapımcı kontrol paneli',
};

export default function ProducerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-screen flex bg-[#faf3e0]">
      {/* Sol Menü */}
      <aside className="w-64 bg-[#0e5b4a] text-white p-6 space-y-6">
        <h2 className="text-2xl font-bold lowercase tracking-wide">ducktylo</h2>
        <nav className="space-y-4 text-sm">
          <Link href="/dashboard/producer" className="block hover:underline">
            🎛️ Panel
          </Link>
          <Link
            href="/dashboard/producer/browse"
            className="block hover:underline"
          >
            🔍 Senaryo Ara
          </Link>
          <Link
            href="/dashboard/producer/listings"
            className="block hover:underline"
          >
            🎬 İlanlarım (Listings)
          </Link>
          <Link
            href="/dashboard/producer/listings/new"
            className="block hover:underline"
          >
            ➕ Yeni İlan Oluştur
          </Link>
          <Link
            href="/dashboard/producer/applications"
            className="block hover:underline"
          >
            📩 Başvurularım
          </Link>
          <Link
            href="/dashboard/producer/purchases"
            className="block hover:underline"
          >
            🧾 Satın Alımlarım
          </Link>
          <Link
            href="/dashboard/producer/billing"
            className="block hover:underline"
          >
            💳 Fatura / Plan
          </Link>
        </nav>
      </aside>

      {/* İçerik */}
      <main className="flex-1 p-8">{children}</main>
    </section>
  );
}
