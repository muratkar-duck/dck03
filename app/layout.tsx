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

        <footer className="text-center text-sm py-6 text-[#7a5c36] opacity-80">
          © 2025 ducktylo. Tüm hakları saklıdır.
        </footer>
      </body>
    </html>
  );
}
