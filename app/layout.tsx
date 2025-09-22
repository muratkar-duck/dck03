import Link from 'next/link';

import './globals.css';
import TabTitleHandler from '../components/TabTitleHandler';

import AppHeader from '@/components/AppHeader';

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

        <AppHeader />

        <main className="max-w-7xl mx-auto px-4 py-10">{children}</main>

        <footer
          className="bg-forest text-brand py-4"
          data-test-id="app-footer"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-center text-sm opacity-80 md:flex-row md:items-center md:justify-between">
            <span>© 2025 ducktylo. Tüm hakları saklıdır.</span>
            <div className="flex justify-center gap-6">
              <Link
                className="underline decoration-dotted underline-offset-2 hover:opacity-100"
                href="/privacy"
              >
                Gizlilik Politikası
              </Link>
              <Link
                className="underline decoration-dotted underline-offset-2 hover:opacity-100"
                href="/terms"
              >
                Kullanım Şartları
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
