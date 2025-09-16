'use client';

import { Typewriter } from 'react-simple-typewriter';

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-4xl font-bold mb-4">Senaryonuz Dünyaya Ulaşsın</h1>
        <p
          className="text-lg max-w-2xl mx-auto font-sans text-[#7a5c36] overflow-hidden"
          style={{
            minHeight: '4rem', // minimum 2 satır yüksekliği
            maxHeight: '4rem', // maksimum 2 satır yüksekliği
          }}
        >
          <Typewriter
            words={[
              'ducktylo, senaristlerle yapımcıları bir araya getiren yenilikçi bir platformdur.',
              'Burada senaryonuz doğru kişilere ulaşır ve projeleriniz hayat bulur.',
              'ducktylo, senaryonuzun güvenli bir şekilde depolanmasını sağlar.',
              'senarist-ducktylo-yapımcı.',
              'burayı istediğimiz kadar uzatabiliyor muyuz acaba?',
              'bursada dehşet',
            ]}
            loop={true}
            typeSpeed={60}
            deleteSpeed={20}
            delaySpeed={600}
          />
          <span className="blinking-cursor">|</span>
        </p>

        <div className="mt-8 flex justify-center gap-4 flex-wrap">
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
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-center">
          🚀 Özellikler
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Senaryo Yükleme</h3>
            <p>
              Senaryolarınızı yükleyin, fiyatlandırın, yayınlayın. Her şey
              kontrolünüzde.
            </p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Yapımcı Filtrelemesi</h3>
            <p>Yapımcılar tür, süre ve bütçeye göre senaryolara ulaşır.</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Güvenli Ödeme</h3>
            <p>Komisyon sistemiyle korunan adil ödeme altyapısı.</p>
          </div>
        </div>
      </section>
      {/* Demo Panel Linkleri */}
      <section className="text-center space-y-4">
        <p className="text-sm text-[#7a5c36] opacity-80">
          👀 Demo amaçlı olarak aşağıdaki bağlantıları kullanabilirsiniz:
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <a href="/dashboard/writer" className="btn btn-secondary">
            Senarist Paneli
          </a>
          <a href="/dashboard/producer" className="btn btn-secondary">
            Yapımcı Paneli
          </a>
        </div>
      </section>
    </div>
  );
}
