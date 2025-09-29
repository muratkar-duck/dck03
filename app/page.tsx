'use client';

import { Typewriter } from 'react-simple-typewriter';

export default function HomePage() {
  const infoSections = [
    {
      id: 'about',
      eyebrow: 'Hakkımızda',
      title: 'ducktylo senaristler ile yapımcıları aynı masada buluşturur',
      description:
        'Türkiye ve bölge pazarındaki yaratıcı ekipleri tek bir üretim ağı altında topluyoruz. Projenizi sergileyin, doğru partnerleri bulun ve tüm süreci tek panelden yönetin.',
      items: [
        {
          title: 'Seçici topluluk',
          body: 'Onaylı senaristler ve projeye hazır yapımcılarla, spam içermeyen ve güvenli bir ortamda eşleşirsiniz.',
        },
        {
          title: 'Güvenli paylaşım',
          body: 'Senaryolarınız versiyon kontrollü olarak saklanır; erişim izinlerini tek tıkla yönetirsiniz.',
        },
        {
          title: 'Gerçek destek',
          body: 'Etkinlikler, mentorluk ve sektör profesyonellerinden alınan geri bildirimler tek platformda.',
        },
      ],
    },
    {
      id: 'how-it-works',
      eyebrow: 'Nasıl Çalışır',
      title: 'Üç adımda üretim partnerinizi bulun',
      description:
        'ducktylo, fikirden prodüksiyona uzanan süreci sadeleştirir. Rolünüze göre akıllı paneller, filtremeler ve bildirimlerle her adımı kontrol edersiniz.',
      items: [
        {
          title: '1. Profilini güçlendir',
          body: 'Senaristler vitrinlerini oluşturur, yapımcılar ihtiyaçlarını paylaşır. Tüm bilgiler tek panelde tutulur.',
        },
        {
          title: '2. Filtrele & keşfet',
          body: 'Tür, bütçe, uzunluk ve teslim tarihine göre eşleşen projeleri saniyeler içinde bulun.',
        },
        {
          title: '3. Bağlan & yürüt',
          body: 'İlgi bildirimi gönderin, mesajlaşın ve dosya paylaşın. Tüm süreç Supabase destekli altyapımızla güvence altında.',
        },
      ],
    },
  ] as const;

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col gap-16 overflow-hidden">
      {/* Hero */}
      <section className="relative isolate flex flex-col items-center gap-8 overflow-hidden rounded-3xl border border-[#e8dcc5] bg-white/70 px-6 py-16 text-center shadow-lg backdrop-blur-sm md:px-16">
        <div className="absolute inset-x-20 -top-24 h-48 rounded-full bg-brand/10 blur-3xl" aria-hidden />
        <h1 className="text-4xl font-bold text-[#0e5b4a] md:text-5xl">
          Senaryonuz doğru yapımcıyla dakikalar içinde buluşsun
        </h1>
        <p
          className="max-w-3xl text-lg leading-relaxed text-[#4a3d2f]"
          style={{
            minHeight: '4rem',
            maxHeight: '4rem',
          }}
        >
          <Typewriter
            words={[
              'ducktylo, senaristlerle yapımcıları aynı çalışma alanında buluşturur.',
              'Filtrelenebilir ilanlar, güvenli paylaşım ve anlık bildirimlerle süreç hızlanır.',
              'İster ilk senaryonuzu yükleyin ister yeni projeler arayan bir yapımcı olun.',
            ]}
            loop
            typeSpeed={60}
            deleteSpeed={20}
            delaySpeed={600}
          />
          <span className="blinking-cursor">|</span>
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <a href="/auth/sign-up-writer" className="btn btn-primary">
            Senarist Olarak Katıl
          </a>
          <a href="/auth/sign-up-producer" className="btn btn-secondary">
            Yapımcı Olarak Katıl
          </a>
          <a href="/auth/sign-in" className="btn btn-warning">
            Giriş Yap
          </a>
        </div>
      </section>

      {/* Özellik Kartları */}
      <section className="rounded-3xl border border-[#e8dcc5] bg-white/60 px-6 py-12 shadow-sm md:px-12">
        <h2 className="mb-8 text-center text-2xl font-semibold text-[#0e5b4a]">
          🚀 Öne Çıkan Özellikler
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="card h-full border-none bg-white/90 shadow-md">
            <h3 className="mb-3 text-lg font-semibold text-[#0e5b4a]">
              Senaryo Vitrini
            </h3>
            <p className="text-sm text-[#4a3d2f]">
              Senaryolarınızı yükleyin, fiyatlandırın ve panelinizden performansı takip edin. Tüm versiyonlar güvenle saklanır.
            </p>
          </div>
          <div className="card h-full border-none bg-white/90 shadow-md">
            <h3 className="mb-3 text-lg font-semibold text-[#0e5b4a]">
              Akıllı Filtreler
            </h3>
            <p className="text-sm text-[#4a3d2f]">
              Yapımcılar tür, süre, bütçe ve son teslim tarihine göre eşleşen senaryolara saniyeler içinde ulaşır.
            </p>
          </div>
          <div className="card h-full border-none bg-white/90 shadow-md">
            <h3 className="mb-3 text-lg font-semibold text-[#0e5b4a]">
              Güvenli İş Akışı
            </h3>
            <p className="text-sm text-[#4a3d2f]">
              İlgi bildirimi, mesajlaşma ve ödeme süreçleri tek platformda; tüm adımlar kayıt altında.
            </p>
          </div>
        </div>
      </section>

      {infoSections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="grid gap-10 rounded-3xl border border-[#e8dcc5] bg-white/70 px-6 py-12 shadow-sm md:grid-cols-2 md:px-12"
        >
          <div className="space-y-4">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a38d6d]">
              {section.eyebrow}
            </span>
            <h2 className="text-3xl font-bold text-[#0e5b4a]">
              {section.title}
            </h2>
            <p className="text-base leading-relaxed text-[#4a3d2f]">
              {section.description}
            </p>
          </div>
          <div className="space-y-5">
            {section.items.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[#f1e6d7] bg-white/90 p-5 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-[#0e5b4a]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4a3d2f]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
