'use client';

import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { usePlanData } from '@/hooks/usePlanData';
import { getPlanById } from '@/lib/plans';

export default function WriterBillingPage() {
  return (
    <AuthGuard allowedRoles={['writer']}>
      <BillingContent />
    </AuthGuard>
  );
}

function BillingContent() {
  const { selection, loading } = usePlanData();
  const plan = selection ? getPlanById(selection.planId) : undefined;

  if (loading) {
    return <p className="text-center text-[#7a5c36]">Plan bilgilerin yükleniyor...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">💳 Üyelik ve Fatura Bilgileri</h1>
      <p className="text-[#7a5c36]">
        Aktif planını ve ödeme geçmişini buradan takip edebilirsin.
      </p>

      <div className="card space-y-2">
        <h2 className="text-lg font-semibold">
          🔐 Aktif Plan:{' '}
          <span className="text-[#ffaa06]">
            {plan ? `${plan.icon} ${plan.name}` : 'Plan seçimi bulunamadı'}
          </span>
        </h2>
        {selection?.renewsAt ? (
          <p className="text-sm text-[#7a5c36]">Yenileme Tarihi: {selection.renewsAt}</p>
        ) : (
          <p className="text-sm text-[#7a5c36]">
            Plan yenileme bilgisi bulunamadı. Planlarını{' '}
            <Link href="/plans" className="text-[#ffaa06] underline">
              Planlar sayfasından
            </Link>{' '}
            güncelleyebilirsin.
          </p>
        )}
        <div className="flex gap-3 mt-2">
          <button className="btn btn-secondary">Planı Yükselt</button>
          <button className="btn btn-danger">İptal Et</button>
        </div>
      </div>

      <div className="card space-y-2">
        <h2 className="text-lg font-semibold">📄 Fatura Geçmişi</h2>
        {selection?.history?.length ? (
          <ul className="text-sm text-[#7a5c36] list-disc list-inside space-y-1">
            {selection.history.map((entry) => {
              const historyPlan = getPlanById(entry.planId);
              return (
                <li key={entry.id}>
                  {entry.billedAt} — {entry.amount} — {historyPlan ? historyPlan.name : 'Plan'}
                  {' '}({entry.status})
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-[#7a5c36]">
            Henüz fatura geçmişin bulunmuyor. Planlarını güncellemek için{' '}
            <Link href="/plans" className="text-[#ffaa06] underline">
              Planlar sayfasını
            </Link>{' '}
            ziyaret edebilirsin.
          </p>
        )}
      </div>
    </div>
  );
}
