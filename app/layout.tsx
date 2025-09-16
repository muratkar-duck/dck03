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

        <header className="bg-[#0e5b4a] text-[#ffaa06] py-4 shadow-md">
          <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
            {/* Sol üstte logo */}
            <Link href="/" className="block h-12 w-auto overflow-visible">
              <img
                src="/ducktylo-logo.png"
                alt="ducktylo logo"
                className="h-16 -mt-2 object-contain"
              />
            </Link>

            {/* Navigasyon + Sabit yerleşimli UserMenu */}
            <div className="flex items-center space-x-4">
              <nav className="flex items-center space-x-2 text-sm font-bold">
                <Link href="/" className="hover:underline">
                  Ana Sayfa
                </Link>
                <span className="text-white">|</span>
                <Link href="/about" className="hover:underline">
                  Hakkımızda
                </Link>
                <span className="text-white">|</span>
                <Link href="/how-it-works" className="hover:underline">
                  Nasıl Çalışır?
                </Link>
                <span className="text-white">|</span>
                <Link href="/plans" className="hover:underline">
                  Üyelik Planları
                </Link>
                <span className="text-white">|</span>
                <Link href="/contact" className="hover:underline">
                  İletişim
                </Link>
              </nav>

              {/* Oturum alanı (sabit genişlik) */}
              <UserMenu />
            </div>
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
