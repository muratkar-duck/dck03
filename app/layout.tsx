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
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-[#faf3e0] text-[#7a5c36] font-sans">
        <TabTitleHandler />

        <AppHeader />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-10">{children}</main>

        <footer
          className="w-full bg-forest text-brand py-4"
          data-test-id="app-footer"
        >
          <div className="mx-auto max-w-7xl px-4 text-center text-sm opacity-80">
            © 2025 ducktylo. Tüm hakları saklıdır.
          </div>
        </footer>
      </body>
    </html>
  );
}
