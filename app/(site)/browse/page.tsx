import Link from 'next/link';

import { getServerSession } from '@/lib/serverSession';

function ProducerBrowseHero() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-[#0e5b4a]">
          Yapımcılar için hızlı senaryo keşfi
        </h1>
        <p className="text-[#4a3d2f]">
          Senaristlerin vitrinini keşfetmek için yapımcı panelindeki filtreli
          arama aracını kullanın.
        </p>
      </div>
      <div className="card space-y-4 bg-white/70">
        <div>
          <h2 className="text-xl font-semibold text-[#0e5b4a]">
            Hazır olduğunuzda üretici paneline geçin
          </h2>
          <p className="text-sm text-[#7a5c36]">
            İlgi bildirimleri, detaylı filtreleme ve mesajlaşma araçları
            yapımcı panelinde sizi bekliyor.
          </p>
        </div>
        <Link href="/dashboard/producer/browse" className="btn btn-primary inline-flex">
          Yapımcı paneline git
        </Link>
      </div>
    </div>
  );
}

function WriterUpsell() {
  return (
    <div className="space-y-6 text-center">
      <h1 className="text-3xl font-bold text-[#0e5b4a]">
        Senaryolarınızı vitrine çıkarın
      </h1>
      <p className="mx-auto max-w-2xl text-[#4a3d2f]">
        Yapımcıların radarına girmek ve yeni iş fırsatları yakalamak için
        senarist paneline giderek profilinizi güçlendirin.
      </p>
      <div className="flex justify-center">
        <Link href="/dashboard/writer" className="btn btn-secondary">
          Senarist paneline geç
        </Link>
      </div>
    </div>
  );
}

function GuestTeaser() {
  return (
    <div className="space-y-10 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold text-[#0e5b4a]">
          Senaryo pazaryeri yakında yayında
        </h1>
        <p className="mx-auto max-w-3xl text-lg text-[#4a3d2f]">
          ducktylo, senaristlerle yapımcıları tek çatı altında buluşturur.
          Vitrindeki projeleri keşfetmek veya eserlerinizi öne çıkarmak için
          ücretsiz hesabınızı oluşturun.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="card space-y-2">
          <h2 className="text-lg font-semibold text-[#0e5b4a]">🎬 Yapımcılar</h2>
          <p className="text-sm text-[#7a5c36]">
            Filtrelenebilir arama, ilgi bildirimi ve senaristlerle doğrudan
            iletişim.
          </p>
        </div>
        <div className="card space-y-2">
          <h2 className="text-lg font-semibold text-[#0e5b4a]">✍️ Senaristler</h2>
          <p className="text-sm text-[#7a5c36]">
            Profil vitrinleri, plan seçenekleri ve sektörel geri bildirim.
          </p>
        </div>
        <div className="card space-y-2">
          <h2 className="text-lg font-semibold text-[#0e5b4a]">🤝 Topluluk</h2>
          <p className="text-sm text-[#7a5c36]">
            Etkinlikler, danışmanlık ve güncel ilanlarla bağlantıda kalın.
          </p>
        </div>
      </div>
      <div className="flex justify-center gap-4">
        <Link href="/auth/sign-up-producer" className="btn btn-primary">
          Yapımcı olarak katıl
        </Link>
        <Link href="/auth/sign-up-writer" className="btn btn-secondary">
          Senarist olarak katıl
        </Link>
      </div>
    </div>
  );
}

export default async function BrowsePage() {
  const session = await getServerSession();
  const role =
    (session?.user?.user_metadata?.role as 'producer' | 'writer' | undefined) ??
    undefined;

  if (role === 'producer') {
    return <ProducerBrowseHero />;
  }

  if (role === 'writer') {
    return <WriterUpsell />;
  }

  return <GuestTeaser />;
}
