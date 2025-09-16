import AuthGuard from '@/components/AuthGuard';
export default function WriterStatsPage() {
  return (
    <AuthGuard allowedRoles={['writer']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">📊 İstatistikler</h1>
        <p className="text-[#7a5c36]">
          Senaryolarının performansına dair genel bir bakış:
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Görüntülenme */}
          <div className="card text-center">
            <h2 className="text-lg font-semibold mb-2">
              👁️ Toplam Görüntülenme
            </h2>
            <p className="text-4xl font-bold text-[#0e5b4a]">234</p>
          </div>

          {/* Favori */}
          <div className="card text-center">
            <h2 className="text-lg font-semibold mb-2">⭐ Favoriye Eklenme</h2>
            <p className="text-4xl font-bold text-[#ffaa06]">18</p>
          </div>

          {/* Yapımcı İlgisi */}
          <div className="card text-center">
            <h2 className="text-lg font-semibold mb-2">🎬 Yapımcı İlgisi</h2>
            <p className="text-4xl font-bold text-[#7a5c36]">5</p>
          </div>
        </div>

        <div className="text-sm text-[#a38d6d] text-center mt-4">
          Son güncelleme: 17 Temmuz 2025
        </div>
      </div>
    </AuthGuard>
  );
}
