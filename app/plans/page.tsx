export default function PlansPage() {
  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-center">Üyelik Planlarımız</h1>
      <p className="text-center text-[#7a5c36]">
        Ducktylo platformunda senaryonuzu hayata geçirmenize yardımcı olacak
        farklı üyelik seviyeleri sunuyoruz.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Student Plan */}
        <div className="card space-y-2">
          <h2 className="text-xl font-semibold">🎓 Student</h2>
          <p className="text-sm">
            Sadece <strong>@edu.tr</strong> e-postaları için geçerlidir.
          </p>
          <ul className="text-sm list-disc list-inside text-[#7a5c36] space-y-1 mt-2">
            <li>Aylık 1 senaryo yükleme</li>
            <li>Temel erişim</li>
            <li>Özgeçmiş oluşturma</li>
          </ul>
          <p className="font-bold text-[#ffaa06]">₺0 / ₺49</p>
        </div>

        {/* Basic Plan */}
        <div className="card space-y-2">
          <h2 className="text-xl font-semibold">📝 Basic</h2>
          <p className="text-sm">Yeni başlayan senaristler için</p>
          <ul className="text-sm list-disc list-inside text-[#7a5c36] space-y-1 mt-2">
            <li>2 senaryo yükleme</li>
            <li>Temel filtreleme erişimi</li>
            <li>Mesajlaşma sistemi</li>
          </ul>
          <p className="font-bold text-[#ffaa06]">₺149 / ay</p>
        </div>

        {/* Pro Plan */}
        <div className="card space-y-2">
          <h2 className="text-xl font-semibold">💼 Pro</h2>
          <p className="text-sm">Düzenli senaryo üretenler için</p>
          <ul className="text-sm list-disc list-inside text-[#7a5c36] space-y-1 mt-2">
            <li>5 senaryo</li>
            <li>Vitrin görünürlüğü</li>
            <li>Temsiliyet & danışmanlık</li>
          </ul>
          <p className="font-bold text-[#ffaa06]">₺299 / ay</p>
        </div>

        {/* Top Tier Plan */}
        <div className="card space-y-2">
          <h2 className="text-xl font-semibold">🌟 Top Tier</h2>
          <p className="text-sm">Sektörün profesyonelleri için</p>
          <ul className="text-sm list-disc list-inside text-[#7a5c36] space-y-1 mt-2">
            <li>Sınırsız senaryo</li>
            <li>Öne çıkma</li>
            <li>Öncelikli destek</li>
          </ul>
          <p className="font-bold text-[#ffaa06]">₺499 / ay</p>
        </div>
      </div>

      <div className="text-center mt-6">
        <a href="/auth/sign-up-writer" className="btn btn-primary">
          Ücretsiz Başla
        </a>
      </div>
    </div>
  );
}
