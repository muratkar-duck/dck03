export default function PlansPage() {
  const writerPlans = [
    {
      name: "Ücretsiz",
      emoji: "📘",
      description: "Temel özelliklerle Ducktylo’yu deneyimleyin.",
      price: "₺0",
      period: "",
      highlight: false,
      items: [
        "Profil oluşturma ve vitrine katılma",
        "Aylık 1 senaryo yükleme",
        "Temel eşleştirme önerileri",
      ],
    },
    {
      name: "Öğrenci",
      emoji: "🎓",
      description: ".edu.tr adresine sahip öğrenciler için indirimli erişim.",
      price: "₺49",
      period: "/ ay",
      highlight: true,
      badge: "Öğrenci indirimi",
      items: [
        "Aylık 3 senaryo yükleme",
        "Öğrenci rozetli vitrin görünürlüğü",
        "Mesajlaşma ve başvuru yönetimi",
      ],
    },
    {
      name: "Pro",
      emoji: "✍️",
      description: "Düzenli senaryo üretenler için gelişmiş araçlar.",
      price: "₺299",
      period: "/ ay",
      highlight: false,
      items: [
        "Aylık 10 senaryo yükleme",
        "Vitrinde öne çıkarma ve analizler",
        "Temsilcilik & danışmanlık desteği",
      ],
    },
    {
      name: "Top",
      emoji: "🏆",
      description: "Ajanslar ve ekipler için sınırsız güç.",
      price: "₺499",
      period: "/ ay",
      highlight: false,
      items: [
        "Sınırsız senaryo yükleme",
        "Özel vitrin konumları",
        "Öncelikli destek ve danışman",
      ],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
      {/* Başlık */}
      <header className="text-center space-y-3">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#7a5c36]">
          Senaristler için planlar
        </p>
        <h1 className="text-3xl md:text-4xl font-bold">
          Üyelik Planlarımız
        </h1>
        <p className="text-[#7a5c36] max-w-2xl mx-auto text-sm md:text-base">
          Ducktylo platformunda senaryonuzu hayata geçirmenize yardımcı olacak
          farklı üyelik seviyeleri sunuyoruz. İhtiyacınıza uygun planla
          başlayın, dilediğiniz zaman yükseltin.
        </p>
      </header>

      {/* Ana düzen: sol senarist, sağ yapımcı */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
        {/* Senarist planları */}
        <section className="grid sm:grid-cols-2 gap-6">
          {writerPlans.map((plan) => (
            <div
              key={plan.name}
              className={`card flex flex-col justify-between h-full ${
                plan.highlight ? "ring-2 ring-[#ffaa06]/70" : ""
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <span aria-hidden="true">{plan.emoji}</span>
                    {plan.name}
                  </h2>
                  {plan.badge && (
                    <span className="inline-flex items-center rounded-full bg-[#0e5b4a] text-xs text-white px-3 py-1">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <p className="text-sm text-[#7a5c36]">
                  {plan.description}
                </p>

                <ul className="text-sm text-[#7a5c36] space-y-1 mt-2">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-[3px] text-[#ffaa06]">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <p className="font-bold text-lg">
                  <span className="text-[#ffaa06]">{plan.price}</span>{" "}
                  <span className="text-sm text-[#7a5c36]">
                    {plan.period}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* Yapımcı / Endüstri üyeliği */}
        <aside className="card space-y-4 bg-[#fffaf0] border border-[#0e5b4a]/10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#7a5c36]">
            Yapımcılar / Endüstri Üyeliği
          </p>
          <h2 className="text-xl font-semibold">
            Yapımcılar için özel üyelik
          </h2>
          <p className="text-sm text-[#7a5c36]">
            Yapımcılar ve yapım şirketleri için üyelikler proje
            bazlı ve özel koşullarla şekillenir. Ekibinizin ve
            projelerinizin ihtiyaçlarına göre özelleştirilmiş bir
            Ducktylo deneyimi sunuyoruz.
          </p>
          <p className="text-sm text-[#7a5c36]">
            Endüstri üyesi misiniz? İhtiyaçlarınızı konuşmak için
            bizimle iletişime geçin.
          </p>

          <div className="pt-2">
            <a
              href="/contact?type=producer"
              className="btn btn-primary w-full text-center"
            >
              Endüstri üyesi misiniz? İletişime geçin
            </a>
          </div>

          <p className="text-[11px] text-[#7a5c36]">
            Büyük ajanslar ve yapım şirketleri için toplu ekip
            kullanımı, özel vitrin alanları ve öncelikli destek gibi
            ek imkanlar sağlanır.
          </p>
        </aside>
      </div>

      {/* Alt CTA */}
      <div className="text-center space-y-2">
        <a href="/auth/sign-up-writer" className="btn btn-primary">
          Ücretsiz Başla
        </a>
        <p className="text-xs text-[#7a5c36]">
          Planınızı dilediğiniz zaman profiliniz üzerinden
          yükseltebilir veya iptal edebilirsiniz.
        </p>
      </div>
    </div>
  );
}
