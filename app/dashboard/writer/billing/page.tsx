import AuthGuard from '@/components/AuthGuard';
export default function WriterBillingPage() {
  return (
    <AuthGuard allowedRoles={['writer']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">💳 Üyelik ve Fatura Bilgileri</h1>
        <p className="text-[#7a5c36]">
          Aktif planını ve ödeme geçmişini buradan takip edebilirsin.
        </p>

        {/* Aktif Plan */}
        <div className="card space-y-2">
          <h2 className="text-lg font-semibold">
            🔐 Aktif Plan: <span className="text-[#ffaa06]">Pro</span>
          </h2>
          <p className="text-sm text-[#7a5c36]">
            Yenileme Tarihi: 31 Ağustos 2025
          </p>
          <div className="flex gap-3 mt-2">
            <button className="btn btn-secondary">Planı Yükselt</button>
            <button className="btn btn-danger">İptal Et</button>
          </div>
        </div>

        {/* Fatura Geçmişi */}
        <div className="card space-y-2">
          <h2 className="text-lg font-semibold">📄 Fatura Geçmişi</h2>
          <ul className="text-sm text-[#7a5c36] list-disc list-inside">
            <li>01 Temmuz 2025 — ₺299 — Pro Plan</li>
            <li>01 Haziran 2025 — ₺299 — Pro Plan</li>
            <li>01 Mayıs 2025 — ₺299 — Pro Plan</li>
          </ul>
        </div>
      </div>
    </AuthGuard>
  );
}
