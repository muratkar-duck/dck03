import AuthGuard from '@/components/AuthGuard';
export default function WriterDashboardPage() {
  return (
    <AuthGuard allowedRoles={['writer']}>
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">Merhaba, Senarist!</h1>
        <p className="text-[#7a5c36]">
          Senaryo yolculuğuna hoş geldin. Aşağıdan son durumu inceleyebilirsin
          👇
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Senaryo Sayısı */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-2">
              📄 Yüklediğin Senaryolar
            </h2>
            <p className="text-3xl font-bold text-[#0e5b4a]">3</p>
          </div>

          {/* Talepler */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-2">📩 Yapımcı Talepleri</h2>
            <p className="text-3xl font-bold text-[#ffaa06]">1</p>
          </div>

          {/* Üyelik Durumu */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-2">💳 Üyelik Planın</h2>
            <p className="text-xl font-bold text-[#7a5c36]">Pro</p>
            <p className="text-sm text-[#7a5c36]">
              Sonraki yenileme: 31 Ağustos 2025
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
