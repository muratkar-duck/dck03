import './globals.css';
import TabTitleHandler from '../components/TabTitleHandler';
import Link from 'next/link';
import UserMenu from '@/components/UserMenu';

export const metadata = {
  title: 'ducktylo | Senaristler ve Yapımcılar için ortak nokta!',
  description: 'Senaristlerle yapımcıları buluşturan platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-[#faf3e0] text-[#7a5c36] font-sans">
        <TabTitleHandler />

        <header className="bg-forest text-brand py-4 shadow-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
            <Link href="/" className="text-2xl font-bold">
              ducktylo
            </Link>
            <nav className="flex items-center gap-4 text-sm font-semibold">
              <Link href="/browse" className="hover:underline">
                Browse
              </Link>
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <Link href="/messages" className="hover:underline">
                Messages
              </Link>
            </nav>
            <UserMenu />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-10">{children}</main>

        <footer className="text-center text-sm py-6 text-[#7a5c36] opacity-80">
          © 2025 ducktylo. Tüm hakları saklıdır.
        </footer>
      </body>
    </html>
  );
}
